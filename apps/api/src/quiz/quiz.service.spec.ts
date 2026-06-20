/**
 * QuizService unit tests — Wave 1 RED scaffolds (Plan 07-01)
 *
 * QUIZ-01: startSession('MIXED') returns 10 questions split 3+3+2+2 by skill area
 * QUIZ-02: startSession('technology') filters all module queries by topic
 * QUIZ-03: completeSession recomputes accuracy server-side from answers[].isCorrect
 * QUIZ-04: completeSession on already-completed session throws BadRequestException
 * QUIZ-05: completeSession on session belonging to another user throws NotFoundException
 * QUIZ-04 (getMistakes): getMistakes returns only incorrect answers with prompt + explanation
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/listening/listening.service.spec.ts.
 *
 * These tests FAIL intentionally — QuizService methods throw 'not implemented'.
 * Plan 07-03 turns these green.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { QuizService } from "./quiz.service";
import { XP_RATES } from "../gamification/gamification.constants";
import type { PrismaService } from "../prisma/prisma.service";
import type { AdaptiveService } from "../adaptive/adaptive.service";

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockQuizSessionCreate = vi.fn();
const mockQuizSessionFindFirst = vi.fn();
const mockQuizSessionUpdate = vi.fn();
const mockQuizAnswerCreateMany = vi.fn();
const mockQuizAnswerFindMany = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();
const mockQueryRaw = vi.fn();
const mockTransaction = vi.fn();

// Mock GamificationService — returns XP award shape from PATTERNS.md lines 216-219
const mockGamificationService = {
  awardXp: vi
    .fn()
    .mockResolvedValue({
      xpEarned: XP_RATES.QUIZ_SESSION_BONUS,
      oldLevel: 1,
      newLevel: 1,
      levelUp: false,
    }),
  checkAchievements: vi.fn().mockResolvedValue([]),
};

// Mock AdaptiveService
const mockAdaptiveService = {
  updateSkillScore: vi.fn().mockResolvedValue(undefined),
} as unknown as AdaptiveService;

const mockPrisma = {
  quizSession: {
    create: mockQuizSessionCreate,
    findFirst: mockQuizSessionFindFirst,
    update: mockQuizSessionUpdate,
  },
  quizAnswer: {
    createMany: mockQuizAnswerCreateMany,
    findMany: mockQuizAnswerFindMany,
  },
  user: {
    findUniqueOrThrow: mockUserFindUniqueOrThrow,
  },
  $queryRaw: mockQueryRaw,
  $transaction: mockTransaction,
} as unknown as PrismaService;

// ─── Sample fixtures ──────────────────────────────────────────────────────────

// 3 grammar + 3 vocabulary + 2 reading + 2 listening = 10 questions (QUIZ-01)
const grammarQuestions = [
  { id: "g-001", prompt: "Choose the correct tense:", answer: "has been", distractors: ["is", "was", "will be"], explanation: null },
  { id: "g-002", prompt: "Fill in the blank:", answer: "who", distractors: ["which", "that", "whom"], explanation: null },
  { id: "g-003", prompt: "Correct the error:", answer: "were", distractors: ["was", "are", "is"], explanation: null },
];

const vocabQuestions = [
  { id: "v-001", word: "elaborate", definition: "detailed and complex", distractors: ["simple", "brief", "vague"] },
  { id: "v-002", word: "constitute", definition: "to make up or form", distractors: ["destroy", "describe", "assess"] },
  { id: "v-003", word: "inevitable", definition: "certain to happen", distractors: ["avoidable", "unlikely", "optional"] },
];

const readingQuestions = [
  { id: "r-001", prompt: "What is the main idea?", answer: "Climate change impacts", distractors: ["Weather patterns", "Ocean levels", "Forest fires"], explanation: "The passage discusses climate change." },
  { id: "r-002", prompt: "What does the author imply?", answer: "Action is needed now", distractors: ["It is too late", "The problem is solved", "Experts disagree"], explanation: null },
];

const listeningQuestions = [
  { id: "l-001", prompt: "What is the speaker's main point?", answer: "Remote work is effective", distractors: ["Offices are necessary", "Technology fails", "Teams struggle"], explanation: null },
  { id: "l-002", prompt: "What does the speaker suggest?", answer: "More flexibility helps", distractors: ["Rigid schedules", "Office only", "No meetings"], explanation: null },
];

const sampleSession = {
  id: "session-001",
  userId: "user-001",
  skillArea: "MIXED",
  completedAt: null,
  startedAt: new Date(),
};

const sampleCompletedSession = {
  ...sampleSession,
  completedAt: new Date(), // already completed
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("QuizService", () => {
  let service: QuizService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QuizService(mockPrisma, mockGamificationService as any, mockAdaptiveService);
  });

  // ---------------------------------------------------------------------------
  // QUIZ-01 — startSession returns 10 questions with correct 3+3+2+2 split
  // ---------------------------------------------------------------------------
  describe("startSession()", () => {
    it("returns 10 questions split 3 grammar + 3 vocabulary + 2 reading + 2 listening for MIXED type", async () => {
      mockQuizSessionCreate.mockResolvedValue(sampleSession);
      // $queryRaw returns different questions per skill area
      mockQueryRaw
        .mockResolvedValueOnce(grammarQuestions)   // grammar: 3
        .mockResolvedValueOnce(vocabQuestions)      // vocabulary: 3
        .mockResolvedValueOnce(readingQuestions)    // reading: 2
        .mockResolvedValueOnce(listeningQuestions); // listening: 2

      const result = await service.startSession("user-001", { type: "MIXED" });

      expect(result.sessionId).toBe("session-001");
      expect(result.questions).toHaveLength(10);

      const grammarCount = result.questions.filter(q => q.skillArea === "GRAMMAR").length;
      const vocabCount = result.questions.filter(q => q.skillArea === "VOCABULARY").length;
      const readingCount = result.questions.filter(q => q.skillArea === "READING").length;
      const listeningCount = result.questions.filter(q => q.skillArea === "LISTENING").length;

      expect(grammarCount).toBe(3);
      expect(vocabCount).toBe(3);
      expect(readingCount).toBe(2);
      expect(listeningCount).toBe(2);
    });

    it("each question has questionRef in '{type}:{id}' format", async () => {
      mockQuizSessionCreate.mockResolvedValue(sampleSession);
      mockQueryRaw
        .mockResolvedValueOnce(grammarQuestions)
        .mockResolvedValueOnce(vocabQuestions)
        .mockResolvedValueOnce(readingQuestions)
        .mockResolvedValueOnce(listeningQuestions);

      const result = await service.startSession("user-001", { type: "MIXED" });

      for (const question of result.questions) {
        expect(question.questionRef).toMatch(/^(grammar|vocabulary|reading|listening):[a-zA-Z0-9_-]+$/);
      }
    });

    // QUIZ-02 — topic filter
    it("filters all module queries by topic when type is 'technology'", async () => {
      mockQuizSessionCreate.mockResolvedValue({ ...sampleSession, topic: "technology" });
      mockQueryRaw
        .mockResolvedValueOnce(grammarQuestions)
        .mockResolvedValueOnce(vocabQuestions)
        .mockResolvedValueOnce(readingQuestions)
        .mockResolvedValueOnce(listeningQuestions);

      await service.startSession("user-001", { type: "technology" });

      // All $queryRaw calls should include topic='technology' in the SQL
      const rawCalls = mockQueryRaw.mock.calls;
      expect(rawCalls.length).toBeGreaterThanOrEqual(4);

      // Verify topic is included in at least one call (topic filter applied)
      const hasTopicFilter = rawCalls.some(call =>
        JSON.stringify(call).includes("technology"),
      );
      expect(hasTopicFilter).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // QUIZ-03 — completeSession: server-recomputed accuracy, gamification calls
  // ---------------------------------------------------------------------------
  describe("completeSession()", () => {
    const answers = [
      { questionRef: "grammar:g-001", skillArea: "GRAMMAR" as const, isCorrect: true, userAnswer: "has been", correctAnswer: "has been" },
      { questionRef: "grammar:g-002", skillArea: "GRAMMAR" as const, isCorrect: false, userAnswer: "which", correctAnswer: "who" },
      { questionRef: "vocabulary:v-001", skillArea: "VOCABULARY" as const, isCorrect: true, userAnswer: "detailed and complex", correctAnswer: "detailed and complex" },
    ];

    it("recomputes accuracy server-side from answers[].isCorrect (ignores any client accuracy)", async () => {
      mockQuizSessionFindFirst.mockResolvedValue(sampleSession);
      mockQuizAnswerCreateMany.mockResolvedValue({ count: 3 });
      mockQuizSessionUpdate.mockResolvedValue({ ...sampleSession, score: 2, accuracy: 66.67 });
      mockUserFindUniqueOrThrow.mockResolvedValue({ cefrLevel: "B2" });
      mockGamificationService.awardXp.mockResolvedValue({ xpEarned: 10, oldLevel: 1, newLevel: 1, levelUp: false });

      const result = await service.completeSession("user-001", "session-001", {
        timeTakenSec: 120,
        answers,
      });

      // Server-recomputed: 2/3 correct = 66.67%
      const expectedAccuracy = (2 / 3) * 100;
      expect(result.accuracy).toBeCloseTo(expectedAccuracy, 0);
    });

    it("calls gamification.awardXp and gamification.checkAchievements on completion", async () => {
      mockQuizSessionFindFirst.mockResolvedValue(sampleSession);
      mockQuizAnswerCreateMany.mockResolvedValue({ count: 3 });
      mockQuizSessionUpdate.mockResolvedValue({ ...sampleSession, score: 2, accuracy: 66.67 });
      mockUserFindUniqueOrThrow.mockResolvedValue({ cefrLevel: "B1" });
      mockGamificationService.awardXp.mockResolvedValue({ xpEarned: 10, oldLevel: 1, newLevel: 1, levelUp: false });

      await service.completeSession("user-001", "session-001", {
        timeTakenSec: 120,
        answers,
      });

      expect(mockGamificationService.awardXp).toHaveBeenCalledTimes(1);
      expect(mockGamificationService.checkAchievements).toHaveBeenCalledTimes(1);
    });

    it("throws BadRequestException when session is already completed (completedAt != null)", async () => {
      mockQuizSessionFindFirst.mockResolvedValue(sampleCompletedSession);

      await expect(
        service.completeSession("user-001", "session-001", {
          timeTakenSec: 120,
          answers,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when session belongs to another user (IDOR — findFirst returns null)", async () => {
      // scoped by userId — returns null when session doesn't belong to user
      mockQuizSessionFindFirst.mockResolvedValue(null);

      await expect(
        service.completeSession("user-999", "session-001", {
          timeTakenSec: 120,
          answers,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // QUIZ-04 — getMistakes returns only incorrect answers with prompt + explanation
  // ---------------------------------------------------------------------------
  describe("getMistakes()", () => {
    it("returns only incorrect answers re-hydrated with prompt and explanation", async () => {
      mockQuizSessionFindFirst.mockResolvedValue(sampleSession);
      // Simulate QuizAnswer rows with incorrect answers
      mockQuizAnswerFindMany.mockResolvedValue([
        {
          id: "qa-001",
          questionRef: "grammar:g-002",
          skillArea: "GRAMMAR",
          isCorrect: false,
          userAnswer: "which",
          correctAnswer: "who",
        },
      ]);
      // Simulate $queryRaw re-hydration for grammar question details
      mockQueryRaw.mockResolvedValue([
        {
          id: "g-002",
          prompt: "Fill in the blank with the correct relative pronoun:",
          answer: "who",
          distractors: ["which", "that", "whom"],
          explanation: "Use 'who' for people, 'which' for things.",
        },
      ]);

      const result = await service.getMistakes("user-001", "session-001");

      expect(result.incorrectAnswers).toHaveLength(1);
      expect(result.incorrectAnswers[0]).toMatchObject({
        questionRef: "grammar:g-002",
        skillArea: "GRAMMAR",
      });
      // Must have prompt and explanation (re-hydrated from source table)
      expect(result.incorrectAnswers[0]?.prompt).toBeDefined();
    });
  });
});
