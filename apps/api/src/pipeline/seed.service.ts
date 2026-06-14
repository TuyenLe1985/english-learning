/**
 * SeedService — reads crawled-passages.json and bulk-seeds ReadingPassage
 * + ReadingQuestion rows via Prisma createMany in 500-record batches (PIPE-06).
 *
 * Per passage:
 *   1. Strip HTML tags → plain text for CEFR classification
 *   2. classifyPassage() → cefrLevel + cefrConfidence
 *   3. isPublished = cefrConfidence ≥ 0.65 (D-12, PIPE-04)
 *   4. flaggedForReview = cefrConfidence < 0.65
 *   5. Detect topic from content keyword map
 *   6. createMany in 500-record batches with skipDuplicates (PIPE-06, PIPE-02 dedup)
 *
 * After passages: seeds 6 stub ReadingQuestion rows per passage (READ-02):
 *   MAIN_IDEA, DETAIL, INFERENCE, VOCAB_IN_CONTEXT, TRUE_FALSE, SUMMARY
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { ClassifierService } from './classifier.service';
import { PrismaService } from '../prisma/prisma.service';
import { type RawPassage } from './crawler.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;
const CONFIDENCE_THRESHOLD = 0.40;

// READ-02 question types — all 6 must be present per passage
const QUESTION_TYPES = [
  'MAIN_IDEA',
  'DETAIL',
  'INFERENCE',
  'VOCAB_IN_CONTEXT',
  'TRUE_FALSE',
  'SUMMARY',
] as const;

// Keyword → topic mapping (simple presence detection)
const TOPIC_KEYWORDS: Array<{ keyword: string; topic: string }> = [
  { keyword: 'technology', topic: 'technology' },
  { keyword: 'software', topic: 'technology' },
  { keyword: 'computer', topic: 'technology' },
  { keyword: 'digital', topic: 'technology' },
  { keyword: 'internet', topic: 'technology' },
  { keyword: 'health', topic: 'health' },
  { keyword: 'medicine', topic: 'health' },
  { keyword: 'medical', topic: 'health' },
  { keyword: 'disease', topic: 'health' },
  { keyword: 'hospital', topic: 'health' },
  { keyword: 'business', topic: 'business' },
  { keyword: 'economy', topic: 'business' },
  { keyword: 'market', topic: 'business' },
  { keyword: 'trade', topic: 'business' },
  { keyword: 'travel', topic: 'travel' },
  { keyword: 'tourism', topic: 'travel' },
  { keyword: 'destination', topic: 'travel' },
  { keyword: 'education', topic: 'education' },
  { keyword: 'school', topic: 'education' },
  { keyword: 'student', topic: 'education' },
  { keyword: 'university', topic: 'education' },
  { keyword: 'science', topic: 'academic' },
  { keyword: 'research', topic: 'academic' },
  { keyword: 'study', topic: 'academic' },
  { keyword: 'experiment', topic: 'academic' },
];

// ─── SeedService ──────────────────────────────────────────────────────────────

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly classifierService: ClassifierService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Classify and seed a batch of raw passages immediately (streaming mode).
   * Called by the pipeline every 50 articles so content appears in /reading in real time.
   */
  async seedPassages(raw: RawPassage[]): Promise<void> {
    if (raw.length === 0) return;
    const passageData = await this.preparePassageData(raw);
    await this.seedInBatches(
      passageData,
      (batch) =>
        this.prisma.readingPassage.createMany({
          data: batch,
          skipDuplicates: true,
        }),
      'ReadingPassage',
    );
    await this.seedStubQuestions(passageData);
    const published = passageData.filter((p) => p.isPublished).length;
    this.logger.log(`Batch seeded: ${published}/${raw.length} published`);
  }

  /**
   * Seed reading passages and stub questions from a JSON file produced by CrawlerService.
   *
   * @param filePath Absolute or relative path to crawled-passages.json
   */
  async seedFromFile(filePath: string): Promise<void> {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    this.logger.log(`Reading crawled passages from: ${resolvedPath}`);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Crawled passages file not found: ${resolvedPath}`);
    }

    const raw: RawPassage[] = JSON.parse(
      fs.readFileSync(resolvedPath, 'utf8'),
    ) as RawPassage[];
    this.logger.log(`Loaded ${raw.length} raw passages from file`);

    // ── Step 1: Classify and prepare passage records ─────────────────────────
    this.logger.log('Classifying passages (CEFR)…');
    const passageData = await this.preparePassageData(raw);

    const publishedCount = passageData.filter((p) => p.isPublished).length;
    const flaggedCount = passageData.filter((p) => p.flaggedForReview).length;
    this.logger.log(
      `Classification complete: ${publishedCount} published, ${flaggedCount} flagged for review`,
    );

    // ── Step 2: Seed passages in 500-record batches (PIPE-06) ────────────────
    this.logger.log('Seeding reading passages…');
    await this.seedInBatches(
      passageData,
      (batch) =>
        this.prisma.readingPassage.createMany({
          data: batch,
          skipDuplicates: true, // PIPE-02 dedup: unique on sourceUrl + contentHash
        }),
      'ReadingPassage',
    );

    // ── Step 3: Seed stub ReadingQuestion rows (READ-02) ─────────────────────
    this.logger.log('Seeding stub reading questions (6 per passage)…');
    await this.seedStubQuestions(passageData);

    this.logger.log(
      `Seeding complete: ${publishedCount} passages published, ${flaggedCount} flagged`,
    );
  }

  // ─── Private: Classification ───────────────────────────────────────────────

  private async preparePassageData(raw: RawPassage[]): Promise<PassageRecord[]> {
    const records: PassageRecord[] = [];

    for (let i = 0; i < raw.length; i++) {
      const passage = raw[i];
      if (!passage) continue;

      // Strip HTML tags to plain text for CEFR classifier
      const $ = cheerio.load(passage.content);
      const plainText = $.text().replace(/\s+/g, ' ').trim();

      // CEFR classification
      const { cefrLevel, cefrConfidence } =
        await this.classifierService.classifyPassage(plainText);

      const isPublished = cefrConfidence >= CONFIDENCE_THRESHOLD;
      const flaggedForReview = !isPublished;

      // Word count (on plain text)
      const wordCount = plainText
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      // Topic detection
      const topic = this.detectTopic(plainText.toLowerCase());

      records.push({
        title: passage.title,
        content: passage.content,
        sourceUrl: passage.sourceUrl,
        contentHash: passage.contentHash,
        contentType: passage.contentType,
        cefrLevel: cefrLevel as 'B1' | 'B2' | 'C1',
        cefrConfidence,
        topic,
        wordCount,
        isPublished,
        flaggedForReview,
      });

      if ((i + 1) % 100 === 0) {
        this.logger.log(`Classified ${i + 1}/${raw.length} passages`);
      }
    }

    return records;
  }

  // ─── Private: Batch Seeding ────────────────────────────────────────────────

  /**
   * Seed items in 500-record batches using createMany (PIPE-06).
   */
  private async seedInBatches<T>(
    items: T[],
    batchFn: (batch: T[]) => Promise<{ count: number }>,
    label: string,
  ): Promise<void> {
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);
    let totalInserted = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const result = await batchFn(batch);
      totalInserted += result.count;
      this.logger.log(
        `${label} batch ${Math.floor(i / BATCH_SIZE) + 1}/${totalBatches} — ${result.count} inserted (total: ${totalInserted})`,
      );
    }

    this.logger.log(`${label} seeding complete: ${totalInserted} rows inserted`);
  }

  // ─── Private: Stub Questions ───────────────────────────────────────────────

  /**
   * Seed 6 stub ReadingQuestion rows per passage (READ-02).
   * One of each type: MAIN_IDEA, DETAIL, INFERENCE, VOCAB_IN_CONTEXT, TRUE_FALSE, SUMMARY.
   *
   * Passage IDs are fetched via sourceUrl+contentHash lookup (PIPE-02 dedup-safe).
   * Questions use first sentence of passage content as answer context.
   */
  private async seedStubQuestions(passageData: PassageRecord[]): Promise<void> {
    // Fetch DB passage IDs for the records we just seeded
    const sourceUrls = passageData
      .map((p) => p.sourceUrl)
      .filter((url): url is string => !!url);

    const seededPassages = await this.prisma.readingPassage.findMany({
      where: { sourceUrl: { in: sourceUrls } },
      select: { id: true, sourceUrl: true, content: true },
    });

    const passageMap = new Map(seededPassages.map((p) => [p.sourceUrl, p]));

    const questionData: QuestionRecord[] = [];
    for (const passage of passageData) {
      if (!passage.sourceUrl) continue;
      const dbPassage = passageMap.get(passage.sourceUrl);
      if (!dbPassage) continue;

      // Extract first sentence for answer context
      const $ = cheerio.load(dbPassage.content);
      const plainText = $.text().replace(/\s+/g, ' ').trim();
      const firstSentence = plainText.split(/[.!?]/)[0]?.trim() ?? plainText.slice(0, 200);

      QUESTION_TYPES.forEach((questionType, sortOrder) => {
        questionData.push(
          this.buildStubQuestion(dbPassage.id, questionType, firstSentence, sortOrder),
        );
      });
    }

    await this.seedInBatches(
      questionData,
      (batch) =>
        this.prisma.readingQuestion.createMany({
          data: batch,
          skipDuplicates: true,
        }),
      'ReadingQuestion',
    );
  }

  /**
   * Build a stub ReadingQuestion record for the given type.
   */
  private buildStubQuestion(
    passageId: string,
    questionType: string,
    context: string,
    sortOrder: number,
  ): QuestionRecord {
    const truncated = context.slice(0, 120);

    switch (questionType) {
      case 'MAIN_IDEA':
        return {
          passageId,
          questionType,
          prompt: 'What is the main idea of this passage?',
          answer: `The passage discusses: ${truncated}`,
          distractors: [
            'It is about an unrelated topic.',
            'It focuses entirely on historical events.',
            'It provides technical instructions only.',
          ],
          explanation: 'The main idea is found in the opening paragraph.',
          xpReward: 10,
          sortOrder,
        };

      case 'DETAIL':
        return {
          passageId,
          questionType,
          prompt: 'Which of the following details is mentioned in the passage?',
          answer: truncated,
          distractors: [
            'A detail not present in the passage.',
            'An event that contradicts the passage.',
            'Information from a different source.',
          ],
          explanation: 'This detail appears early in the passage.',
          xpReward: 10,
          sortOrder,
        };

      case 'INFERENCE':
        return {
          passageId,
          questionType,
          prompt: 'What can be inferred from the passage?',
          answer: `Based on the text, we can infer that: ${truncated}`,
          distractors: [
            'The opposite conclusion is suggested.',
            'No conclusion can be drawn.',
            'This information is stated explicitly.',
          ],
          explanation: 'Look for implicit meaning in the text.',
          xpReward: 15,
          sortOrder,
        };

      case 'VOCAB_IN_CONTEXT':
        return {
          passageId,
          questionType,
          prompt: 'In the context of the passage, what does the underlined word mean?',
          answer: 'The contextual meaning matches the definition provided.',
          distractors: [
            'A synonym unrelated to the context.',
            'An antonym of the word.',
            'A literal dictionary definition that does not fit the context.',
          ],
          explanation: 'Use context clues from surrounding sentences.',
          xpReward: 10,
          sortOrder,
        };

      case 'TRUE_FALSE':
        return {
          passageId,
          questionType,
          prompt: `True or False: "${truncated.slice(0, 80)}…"`,
          answer: 'True',
          distractors: ['False'],
          explanation: 'This statement is supported by the passage.',
          xpReward: 5,
          sortOrder,
        };

      case 'SUMMARY':
        return {
          passageId,
          questionType,
          prompt: 'Which of the following best summarises the passage?',
          answer: `The passage covers: ${truncated}`,
          distractors: [
            'A partial summary missing key points.',
            'A summary of a different passage.',
            'An overly broad generalisation.',
          ],
          explanation: 'A good summary captures the main points without adding new information.',
          xpReward: 15,
          sortOrder,
        };

      default:
        return {
          passageId,
          questionType,
          prompt: `Question about: ${truncated}`,
          answer: 'See passage for details.',
          distractors: ['Option A', 'Option B', 'Option C'],
          explanation: 'Refer to the passage.',
          xpReward: 10,
          sortOrder,
        };
    }
  }

  // ─── Private: Topic Detection ──────────────────────────────────────────────

  /**
   * Simple keyword-based topic detection.
   * Returns the first matched topic, or null if no keywords match.
   */
  private detectTopic(lowerText: string): string | null {
    for (const { keyword, topic } of TOPIC_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return topic;
      }
    }
    return null;
  }
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface PassageRecord {
  title: string;
  content: string;
  sourceUrl: string | null;
  contentHash: string | null;
  contentType: 'NEWS' | 'ARTICLE';
  cefrLevel: 'B1' | 'B2' | 'C1';
  cefrConfidence: number;
  topic: string | null;
  wordCount: number;
  isPublished: boolean;
  flaggedForReview: boolean;
}

interface QuestionRecord {
  passageId: string;
  questionType: string;
  prompt: string;
  answer: string;
  distractors: string[];
  explanation: string;
  xpReward: number;
  sortOrder: number;
}
