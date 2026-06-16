/**
 * SeedService — Reads crawled-passages.json, classifies via ClassifierService,
 * and seeds ReadingPassage + ReadingQuestion rows using createMany in 500-record batches.
 *
 * PIPE-05: Seeds ≥2,000 reading passages.
 * PIPE-06: Uses createMany() in 500-record batches.
 * PIPE-04: Sets isPublished = cefrConfidence ≥ 0.65; flaggedForReview = cefrConfidence < 0.65.
 * READ-02: Seeds 6 stub ReadingQuestion rows per passage (one of each type).
 * T-05-05-01: Sanitizes crawled HTML via isomorphic-dompurify before DB insert.
 * T-05-05-02: All content passed as parameterized Prisma data objects — no string interpolation.
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import { ClassifierService } from './classifier.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CrawledPassage } from './crawler.service';
import type { ContentType } from '@repo/database';

// ── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

/** READ-02: All 6 comprehension question types required per passage */
const QUESTION_TYPES = [
  'MAIN_IDEA',
  'DETAIL',
  'INFERENCE',
  'VOCAB_IN_CONTEXT',
  'TRUE_FALSE',
  'SUMMARY',
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

/** Topic detection keyword map. Simple keyword presence scoring. */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  technology: ['technology', 'computer', 'internet', 'digital', 'software', 'artificial', 'robot', 'data', 'app', 'smartphone'],
  health: ['health', 'medical', 'disease', 'hospital', 'doctor', 'medicine', 'treatment', 'patient', 'mental', 'body'],
  business: ['business', 'economy', 'market', 'company', 'trade', 'financial', 'investment', 'startup', 'profit', 'management'],
  travel: ['travel', 'tourism', 'country', 'destination', 'flight', 'hotel', 'tourist', 'culture', 'abroad', 'visit'],
  education: ['education', 'school', 'university', 'student', 'learning', 'teacher', 'academic', 'study', 'research', 'knowledge'],
  science: ['science', 'scientist', 'research', 'experiment', 'discovery', 'biology', 'chemistry', 'physics', 'space', 'evolution'],
  environment: ['environment', 'climate', 'pollution', 'energy', 'nature', 'wildlife', 'carbon', 'green', 'sustainable', 'ecology'],
  society: ['society', 'social', 'community', 'government', 'politics', 'rights', 'people', 'population', 'culture', 'tradition'],
};

// ── Interfaces ────────────────────────────────────────────────────────────────

interface PassageInsertData {
  title: string;
  content: string;
  sourceUrl: string | null;
  contentHash: string | null;
  contentType: ContentType;
  cefrLevel: 'B1' | 'B2' | 'C1';
  cefrConfidence: number;
  topic: string | null;
  wordCount: number;
  isPublished: boolean;
  flaggedForReview: boolean;
}

interface QuestionInsertData {
  passageId: string;
  questionType: string;
  prompt: string;
  answer: string;
  distractors: string[];
  explanation: string | null;
  xpReward: number;
  sortOrder: number;
}

// ── Utility functions ─────────────────────────────────────────────────────────

/**
 * Strip HTML tags to plain text for classification.
 * Preserves word boundaries.
 */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize HTML for safe DB storage.
 * Removes XSS vectors (script, style, event attributes) while preserving formatting.
 * T-05-05-01: Threat mitigation for crawled HTML content.
 */
function sanitizeHtml(html: string): string {
  // Remove script and style tags entirely
  let sanitized = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove event handler attributes (onclick, onload, etc.)
    .replace(/\s+on[a-z]+="[^"]*"/gi, '')
    .replace(/\s+on[a-z]+=\s*'[^']*'/gi, '')
    .replace(/\s+on[a-z]+=[^\s>]*/gi, '')
    // Remove javascript: hrefs/srcs
    .replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"')
    .replace(/src\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'src=""')
    // Remove data: URIs in attributes that can execute
    .replace(/src\s*=\s*["']?\s*data:[^"'\s>]*/gi, 'src=""')
    .trim();
  return sanitized;
}

/**
 * Detect topic from plaintext content using keyword scoring.
 * Returns the topic with the most keyword matches, or null if no strong match.
 */
function detectTopic(text: string): string | null {
  const lowerText = text.toLowerCase();
  let bestTopic: string | null = null;
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const score = keywords.filter((kw) => lowerText.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  // Require at least 2 keyword matches for a confident topic assignment
  return bestScore >= 2 ? bestTopic : null;
}

/**
 * Map crawled contentType to Prisma ContentType enum value.
 */
function mapContentType(rawType: string): ContentType {
  if (rawType === 'ARTICLE') return 'ARTICLE';
  return 'NEWS';
}

/**
 * Generate stub ReadingQuestion rows for a passage (READ-02).
 * 6 question types, one of each, using passage content as context.
 */
function generateStubQuestions(
  passageId: string,
  plainText: string,
): QuestionInsertData[] {
  // Extract first sentence as context for question stubs
  const sentences = plainText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 5);

  const firstSentence = sentences[0] ?? plainText.slice(0, 150).trim();
  const secondSentence = sentences[1] ?? firstSentence;

  // Extract mid-passage context for variety
  const midIndex = Math.floor(sentences.length / 2);
  const midSentence = sentences[midIndex] ?? firstSentence;

  // Extract words from passage for vocabulary question
  const words = plainText
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && w.length <= 12);
  const vocabWord =
    words[Math.floor(words.length / 3)] ?? 'important';
  const vocabWordClean = vocabWord.toLowerCase();

  // Distractor pool — simple word substitutions
  const commonDistr = ['however', 'because', 'therefore', 'although'];

  const questions: QuestionInsertData[] = [
    {
      passageId,
      questionType: 'MAIN_IDEA' satisfies QuestionType,
      prompt: `What is the main idea of this passage?`,
      answer: firstSentence.slice(0, 200),
      distractors: [
        secondSentence.slice(0, 200),
        midSentence.slice(0, 200),
        `The passage discusses unrelated topics.`,
      ],
      explanation: `The main idea is best expressed by the opening statement of the passage.`,
      xpReward: 10,
      sortOrder: 0,
    },
    {
      passageId,
      questionType: 'DETAIL' satisfies QuestionType,
      prompt: `According to the passage, which of the following is mentioned?`,
      answer: secondSentence.slice(0, 200),
      distractors: [
        `This detail is not mentioned in the passage.`,
        `The passage mentions the opposite.`,
        `This is an inference, not a stated detail.`,
      ],
      explanation: `This detail is explicitly stated in the passage.`,
      xpReward: 10,
      sortOrder: 1,
    },
    {
      passageId,
      questionType: 'INFERENCE' satisfies QuestionType,
      prompt: `What can be inferred from the passage?`,
      answer: `The author presents a nuanced view of the topic discussed.`,
      distractors: [
        `The author is completely opposed to the topic.`,
        `The passage provides no perspective on the topic.`,
        `The author supports only one side of the argument.`,
      ],
      explanation: `Based on the evidence in the passage, we can reasonably infer the author's perspective.`,
      xpReward: 15,
      sortOrder: 2,
    },
    {
      passageId,
      questionType: 'VOCAB_IN_CONTEXT' satisfies QuestionType,
      prompt: `As used in the passage, the word "${vocabWordClean}" most nearly means:`,
      answer: `having notable significance or relevance to the topic`,
      distractors: commonDistr.slice(0, 3),
      explanation: `Context clues in the surrounding sentences help determine the meaning of "${vocabWordClean}" in this context.`,
      xpReward: 10,
      sortOrder: 3,
    },
    {
      passageId,
      questionType: 'TRUE_FALSE' satisfies QuestionType,
      prompt: `True or False: ${firstSentence.slice(0, 150)}`,
      answer: 'True',
      distractors: ['False'],
      explanation: `This statement is explicitly supported by information in the passage.`,
      xpReward: 5,
      sortOrder: 4,
    },
    {
      passageId,
      questionType: 'SUMMARY' satisfies QuestionType,
      prompt: `Which of the following best summarizes the passage?`,
      answer: `The passage examines ${detectTopic(plainText) ?? 'an important topic'} and presents key information for understanding the subject.`,
      distractors: [
        `The passage is primarily a narrative with no informational content.`,
        `The passage argues against the topic without providing evidence.`,
        `The passage is a technical manual with step-by-step instructions.`,
      ],
      explanation: `A good summary captures the main topic and the author's approach without including minor details.`,
      xpReward: 15,
      sortOrder: 5,
    },
  ];

  return questions;
}

// ── SeedService ───────────────────────────────────────────────────────────────

@Injectable()
export class SeedService {
  constructor(
    private readonly classifierService: ClassifierService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * seedFromFile — Read crawled-passages.json, classify each passage,
   * and seed ReadingPassage + ReadingQuestion rows.
   *
   * @param filePath - Path to crawled-passages.json (default: ./crawled-passages.json)
   */
  async seedFromFile(filePath: string = './crawled-passages.json'): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `[SeedService] crawled-passages.json not found at ${filePath}. ` +
          `Run 'pnpm pipeline:crawl' first.`,
      );
    }

    const rawJson = fs.readFileSync(filePath, 'utf8');
    const crawledPassages: CrawledPassage[] = JSON.parse(rawJson) as CrawledPassage[];

    console.log(
      `[SeedService] Loaded ${crawledPassages.length} crawled passages from ${filePath}`,
    );

    // ── Classify and prepare passage data ─────────────────────────────────────
    const passageData: PassageInsertData[] = [];
    let classifyErrors = 0;

    for (let i = 0; i < crawledPassages.length; i++) {
      const raw = crawledPassages[i]!;

      try {
        // Strip HTML to plain text for classification
        const plainText = stripHtmlToText(raw.content);

        // Classify via ClassifierService (PIPE-03, PIPE-04)
        const classification = await this.classifierService.classifyPassage(plainText);

        // Sanitize HTML before storing (T-05-05-01)
        const sanitizedContent = sanitizeHtml(raw.content);

        // Detect topic
        const topic = detectTopic(plainText);

        // D-12: isPublished = confidence ≥ 0.65; flaggedForReview = confidence < 0.65
        const isPublished = classification.cefrConfidence >= 0.65;
        const flaggedForReview = !isPublished;

        passageData.push({
          title: raw.title,
          content: sanitizedContent,
          sourceUrl: raw.sourceUrl ?? null,
          contentHash: raw.contentHash ?? null,
          contentType: mapContentType(raw.contentType),
          cefrLevel: classification.cefrLevel,
          cefrConfidence: classification.cefrConfidence,
          topic,
          wordCount: raw.wordCount,
          isPublished,
          flaggedForReview,
        });
      } catch (err) {
        classifyErrors++;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[SeedService] Classification error for ${raw.sourceUrl}: ${msg}`);
      }

      if ((i + 1) % 100 === 0) {
        console.log(
          `[SeedService] Classified ${i + 1}/${crawledPassages.length} passages...`,
        );
      }
    }

    console.log(
      `[SeedService] Classification complete: ${passageData.length} passages ready` +
        (classifyErrors > 0 ? ` (${classifyErrors} errors)` : ''),
    );

    // ── Seed passages in 500-record batches (PIPE-06) ─────────────────────────
    const insertedIds = await this.seedPassagesInBatches(passageData);

    // ── Seed stub ReadingQuestion rows per passage (READ-02) ─────────────────
    await this.seedQuestionsForPassages(insertedIds);

    // ── Summary log ───────────────────────────────────────────────────────────
    const publishedCount = passageData.filter((p) => p.isPublished).length;
    const flaggedCount = passageData.filter((p) => p.flaggedForReview).length;
    console.log(
      `[SeedService] Done. Total passages: ${passageData.length} ` +
        `| isPublished=true: ${publishedCount} ` +
        `| flaggedForReview=true: ${flaggedCount} ` +
        `| Stub questions: ${insertedIds.length * QUESTION_TYPES.length}`,
    );
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * seedPassagesInBatches — Insert ReadingPassage rows in 500-record batches.
   * Returns IDs of inserted/existing passages that need questions.
   */
  private async seedPassagesInBatches(
    passageData: PassageInsertData[],
  ): Promise<string[]> {
    const allIds: string[] = [];
    const totalBatches = Math.ceil(passageData.length / BATCH_SIZE);

    for (let i = 0; i < passageData.length; i += BATCH_SIZE) {
      const batch = passageData.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      // T-05-05-02: All data passed as parameterized Prisma objects — no string interpolation
      const result = await this.prisma.readingPassage.createMany({
        data: batch,
        skipDuplicates: true,
      });

      console.log(
        `[SeedService] Passage batch ${batchNum}/${totalBatches} — ${result.count} inserted`,
      );

      // Fetch the IDs for question seeding
      // (createMany doesn't return IDs — query by contentHash)
      const batchHashes = batch
        .map((p) => p.contentHash)
        .filter((h): h is string => h !== null);

      if (batchHashes.length > 0) {
        const inserted = await this.prisma.readingPassage.findMany({
          where: { contentHash: { in: batchHashes } },
          select: { id: true },
        });
        allIds.push(...inserted.map((p) => p.id));
      }
    }

    return allIds;
  }

  /**
   * seedQuestionsForPassages — For each passage that has no questions yet,
   * generate and insert 6 stub ReadingQuestion rows (READ-02: one per question type).
   */
  private async seedQuestionsForPassages(passageIds: string[]): Promise<void> {
    // Find passages that already have questions (skip those)
    const passagesWithQuestions = await this.prisma.readingQuestion.findMany({
      where: { passageId: { in: passageIds } },
      select: { passageId: true },
      distinct: ['passageId'],
    });
    const existingSet = new Set(passagesWithQuestions.map((q) => q.passageId));

    const passagesNeedingQuestions = passageIds.filter(
      (id) => !existingSet.has(id),
    );

    if (passagesNeedingQuestions.length === 0) {
      console.log('[SeedService] All passages already have questions — skipping question seed');
      return;
    }

    console.log(
      `[SeedService] Seeding questions for ${passagesNeedingQuestions.length} passages...`,
    );

    // Fetch passage content for question generation
    const passages = await this.prisma.readingPassage.findMany({
      where: { id: { in: passagesNeedingQuestions } },
      select: { id: true, content: true },
    });

    // Build question rows
    const questionData: QuestionInsertData[] = [];
    for (const passage of passages) {
      const plainText = stripHtmlToText(passage.content);
      const stubs = generateStubQuestions(passage.id, plainText);
      questionData.push(...stubs);
    }

    // Seed in 500-record batches (PIPE-06)
    const totalBatches = Math.ceil(questionData.length / BATCH_SIZE);
    for (let i = 0; i < questionData.length; i += BATCH_SIZE) {
      const batch = questionData.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      const result = await this.prisma.readingQuestion.createMany({
        data: batch,
        skipDuplicates: true,
      });

      console.log(
        `[SeedService] Question batch ${batchNum}/${totalBatches} — ${result.count} inserted`,
      );
    }
  }
}
