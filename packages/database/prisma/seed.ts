/**
 * Database seed script — Phase 3: Vocabulary + SRS Core
 *
 * Seeds 200 vocabulary words (25 per category × 8 categories) and creates a
 * demo user with 5 past-due SRS cards for development and testing.
 *
 * Usage: pnpm --filter @repo/database db:seed
 *
 * Source: .planning/phases/03-vocabulary-module-srs-core/03-PATTERNS.md — seed.ts section
 * D-13: 200 vocabulary words (25 per category × 8 categories)
 * D-15: Demo user guarded by NODE_ENV !== 'production'
 */

import { PrismaClient } from "../generated/client";
import * as bcrypt from "bcryptjs";
import vocabularyData from "./seed-data/vocabulary.json";
import grammarData from "./seed-data/grammar.json";

const prisma = new PrismaClient();

// ─── seedGrammar ─────────────────────────────────────────────────────────────
// Strict FK-ordered upsert: Area → Topic → Lesson → Questions
// Source: .planning/phases/04-grammar-module/04-PATTERNS.md (seed.ts section)
async function seedGrammar() {
  let totalQuestions = 0;

  for (const area of grammarData.areas) {
    // 1. Create GrammarArea first
    const createdArea = await prisma.grammarArea.upsert({
      where: { slug: area.slug },
      create: {
        slug: area.slug,
        name: area.name,
        description: area.description ?? null,
        sortOrder: area.sortOrder,
      },
      update: {},
    });

    for (const topic of area.topics) {
      // 2. Create GrammarTopic (depends on GrammarArea.id)
      const createdTopic = await prisma.grammarTopic.upsert({
        where: { slug: topic.slug },
        create: {
          areaId: createdArea.id,
          slug: topic.slug,
          title: topic.title,
          cefrLevel: topic.cefrLevel as "B1" | "B2" | "C1",
          sortOrder: topic.sortOrder,
        },
        update: {},
      });

      for (const lesson of topic.lessons) {
        // 3. Create GrammarLesson (depends on GrammarTopic.id)
        const createdLesson = await prisma.grammarLesson.upsert({
          where: { slug: lesson.slug },
          create: {
            topicId: createdTopic.id,
            slug: lesson.slug,
            title: lesson.title,
            explanation: lesson.explanation,
            examples: lesson.examples,
            sortOrder: lesson.sortOrder,
          },
          update: {},
        });

        // 4. createMany GrammarQuestions (depends on GrammarLesson.id)
        // skipDuplicates: true guards re-runs (same pattern as vocabularyWord seed)
        const result = await prisma.grammarQuestion.createMany({
          data: lesson.questions.map((q) => ({
            lessonId: createdLesson.id,
            exerciseType: q.exerciseType as
              | "MULTIPLE_CHOICE"
              | "FILL_IN_THE_BLANK"
              | "SENTENCE_TRANSFORMATION"
              | "ERROR_CORRECTION"
              | "DRAG_AND_DROP",
            prompt: q.prompt,
            answer: q.answer,
            distractors: q.distractors,
            explanation: q.explanation ?? null,
            difficulty: q.difficulty ?? 1,
            xpReward: q.xpReward ?? 10,
          })),
          skipDuplicates: true,
        });

        totalQuestions += result.count;
      }
    }
  }

  console.log(`Seeded grammar: ${grammarData.areas.length} areas, ${totalQuestions} questions`);
}

async function main() {
  console.log("Seeding grammar content...");
  await seedGrammar();

  console.log("Seeding vocabulary words...");

  // Seed all 200 vocabulary words in a single createMany call (skipDuplicates handles re-runs)
  await prisma.vocabularyWord.createMany({
    data: vocabularyData.map((word) => ({
      word: word.word,
      definition: word.definition,
      partOfSpeech: word.partOfSpeech ?? null,
      examples: word.examples,
      synonyms: word.synonyms,
      pronunciationKey: word.pronunciationKey ?? null,
      audioStorageKey: null, // populated by Phase 5 TTS pipeline
      cefrLevel: word.cefrLevel as "B1" | "B2" | "C1",
      cefrConfidence: 0.75,
      category: word.category ?? null,
      frequency: 0,
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${vocabularyData.length} vocabulary words`);

  // Demo user — development only (D-15)
  if (process.env["NODE_ENV"] !== "production") {
    const hash = await bcrypt.hash("demo1234", 12);

    const demo = await prisma.user.upsert({
      where: { email: "demo@example.com" },
      create: {
        email: "demo@example.com",
        passwordHash: hash,
        emailVerified: new Date(),
        name: "Demo User",
        cefrLevel: "B1",
      },
      update: { emailVerified: new Date(), passwordHash: hash },
    });

    console.log(`Demo user upserted: ${demo.email}`);

    // 5 SrsCards due 1 hour ago so they appear in the review queue
    const dueDate = new Date(Date.now() - 3600000);
    const words = await prisma.vocabularyWord.findMany({ take: 5 });

    for (const word of words) {
      const item = await prisma.userVocabularyItem.upsert({
        where: { userId_wordId: { userId: demo.id, wordId: word.id } },
        create: { userId: demo.id, wordId: word.id },
        update: {},
      });

      await prisma.srsCard.upsert({
        where: { userVocabItemId: item.id },
        create: {
          userId: demo.id,
          wordId: word.id,
          userVocabItemId: item.id,
          due: dueDate,
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
          state: "New",
        },
        update: {},
      });
    }

    console.log("Demo user + 5 past-due SRS cards created");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
