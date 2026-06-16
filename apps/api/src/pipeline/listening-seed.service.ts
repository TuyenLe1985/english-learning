import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { ListeningContent, CefrLevel } from '@repo/database';

type SeedContent = ListeningContent & { _count: { questions: number } };

interface GeneratedExercise {
  exerciseType: 'MULTIPLE_CHOICE' | 'FILL_MISSING_WORDS' | 'DICTATION';
  prompt: string;
  answer: string;
  distractors: string[];
  explanation: string | null;
  xpReward: number;
  sortOrder: number;
  timestampSec: number | null;
}

const FALLBACK_CEFR_WORDS = new Set([
  'important','understand','different','because','however','although','therefore',
  'example','question','problem','situation','interesting','experience','possible',
  'necessary','available','information','development','relationship','communication',
  'particular','significant','research','evidence','suggest','require','include',
  'consider','provide','approach','achieve','increase','result','level','process',
]);

@Injectable()
export class ListeningSeedService {
  constructor(
    private readonly prisma?: PrismaService,
    private readonly config?: ConfigService,
  ) {}

  async run(): Promise<void> {
    if (!this.prisma) throw new Error('PrismaService required for run()');
    const items = await this.prisma.listeningContent.findMany({
      where: { isPublished: true },
      include: { _count: { select: { questions: true } } },
    });

    let seeded = 0;
    const BATCH_SIZE = 500;

    // Accumulate (contentId + exercise) pairs across items; flush when batch is full or at end of all items
    const globalBatch: Array<GeneratedExercise & { contentId: string }> = [];

    const flushBatch = async () => {
      if (globalBatch.length === 0) return;
      // Insert in chunks of BATCH_SIZE
      for (let offset = 0; offset < globalBatch.length; offset += BATCH_SIZE) {
        const chunk = globalBatch.slice(offset, offset + BATCH_SIZE);
        await this.prisma!.listeningQuestion.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
      globalBatch.length = 0;
    };

    for (const item of items as SeedContent[]) {
      if (item._count.questions > 0) continue;
      const exercises = await this.generateExercises(item);
      for (const ex of exercises) {
        globalBatch.push({ ...ex, contentId: item.id });
      }
      if (globalBatch.length >= BATCH_SIZE) {
        await flushBatch();
      }
      seeded++;
    }

    await flushBatch();

    console.log(`[ListeningSeedService] Seeded exercises for ${seeded} items`);
  }

  async generateExercises(content: Pick<ListeningContent, 'id' | 'transcriptText'>): Promise<GeneratedExercise[]> {
    const exercises: GeneratedExercise[] = [];
    const text = content.transcriptText ?? '';
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
    if (sentences.length === 0) return exercises;

    // 1. MULTIPLE_CHOICE — at least 2 per item
    const mcSentences = sentences.slice(0, Math.min(3, sentences.length));
    for (let i = 0; i < Math.min(2, mcSentences.length); i++) {
      const sentence = mcSentences[i]!;
      const words = sentence.split(/\s+/).filter(w => w.length > 3);
      const targetWord = words[Math.floor(words.length / 2)] ?? words[0] ?? 'word';
      const distractors = this.generateDistractors(targetWord, words);
      exercises.push({
        exerciseType: 'MULTIPLE_CHOICE',
        prompt: `What word best completes the idea in: "${sentence.slice(0, 80)}..."?`,
        answer: targetWord,
        distractors,
        explanation: null,
        xpReward: 10,
        sortOrder: i,
        timestampSec: null,
      });
    }

    // 2. FILL_MISSING_WORDS — up to 2 per item
    const wordSet = this.buildCefrWordSet();
    let fmwCount = 0;
    for (const sentence of sentences) {
      if (fmwCount >= 2) break;
      const result = this.generateFillMissingWords(sentence, wordSet);
      if (!result) continue;
      exercises.push({
        exerciseType: 'FILL_MISSING_WORDS',
        prompt: result.prompt,
        answer: result.answer,
        distractors: result.distractors,
        explanation: null,
        xpReward: 10,
        sortOrder: exercises.length,
        timestampSec: null,
      });
      fmwCount++;
    }

    // 3. DICTATION — up to 2 short sentences
    const dictSentences = sentences
      .filter(s => { const wc = s.split(/\s+/).length; return wc >= 5 && wc <= 15; })
      .slice(0, 2);
    for (let i = 0; i < dictSentences.length; i++) {
      const sentence = dictSentences[i]!;
      exercises.push({
        exerciseType: 'DICTATION',
        prompt: 'Listen and type what you hear.',
        answer: sentence.trim(),
        distractors: [],
        explanation: null,
        xpReward: 15,
        sortOrder: exercises.length,
        timestampSec: i * 30,
      });
    }

    // Ensure minimum 1 of each type
    if (!exercises.find(e => e.exerciseType === 'FILL_MISSING_WORDS')) {
      exercises.push({
        exerciseType: 'FILL_MISSING_WORDS',
        prompt: `The ___ is important in this context.`,
        answer: 'idea',
        distractors: ['thing', 'word', 'point'],
        explanation: null,
        xpReward: 10,
        sortOrder: exercises.length,
        timestampSec: null,
      });
    }
    if (!exercises.find(e => e.exerciseType === 'DICTATION')) {
      const shortSentence = sentences[0]?.slice(0, 60) ?? 'Listen carefully.';
      exercises.push({
        exerciseType: 'DICTATION',
        prompt: 'Listen and type what you hear.',
        answer: shortSentence.trim(),
        distractors: [],
        explanation: null,
        xpReward: 15,
        sortOrder: exercises.length,
        timestampSec: 0,
      });
    }

    return exercises;
  }

  private buildCefrWordSet(): Set<string> {
    return FALLBACK_CEFR_WORDS;
  }

  private generateFillMissingWords(
    sentence: string,
    wordSet: Set<string>,
  ): { prompt: string; answer: string; distractors: string[] } | null {
    const words = sentence.split(/\s+/);
    const candidates = words.filter(w => w.length >= 4 && wordSet.has(w.toLowerCase().replace(/[^a-z]/g, '')));
    if (!candidates.length) return null;
    const answer = candidates[0]!;
    const answerClean = answer.replace(/[^a-zA-Z]/g, '');
    const prompt = sentence.replace(new RegExp(answerClean, 'i'), '___');
    const distractors = this.generateDistractors(answerClean, words.filter(w => w !== answer)).slice(0, 3);
    if (distractors.length < 3) return null;
    return { prompt, answer: answerClean, distractors };
  }

  private generateDistractors(word: string, contextWords: string[]): string[] {
    const len = word.length;
    const distractors = Array.from(FALLBACK_CEFR_WORDS)
      .filter(w => Math.abs(w.length - len) <= 2 && w !== word.toLowerCase())
      .filter(w => !contextWords.map(c => c.toLowerCase()).includes(w))
      .slice(0, 3);
    while (distractors.length < 3) {
      distractors.push(['option', 'choice', 'answer'][distractors.length] ?? 'other');
    }
    return distractors;
  }
}
