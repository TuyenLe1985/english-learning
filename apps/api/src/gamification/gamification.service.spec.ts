/**
 * GamificationService unit tests — Wave 1 RED scaffolds (Plan 07-01)
 *
 * GAME-01: awardXp() applies correct CEFR multiplier (B1=5, B2=8, C1=10 for quiz correct)
 * GAME-02: awardXp() increments User.xpTotal and updates User.level atomically ($transaction)
 * GAME-03: checkAchievements() awards first-lesson badge exactly once (idempotent)
 * GAME-05: awardXp() creates exactly one XpEvent per call
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/listening/listening.service.spec.ts.
 *
 * These tests FAIL intentionally — GamificationService methods throw 'not implemented'.
 * Plan 07-02 turns these green.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GamificationService } from "./gamification.service";
import {
  XP_RATES,
  CEFR_MULTIPLIERS,
  calculateXp,
  levelForXp,
} from "./gamification.constants";
import type { PrismaService } from "../prisma/prisma.service";

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockUserFindUniqueOrThrow = vi.fn();
const mockUserUpdate = vi.fn();
const mockXpEventCreate = vi.fn();
const mockActivityLogCreate = vi.fn();
const mockActivityLogFindMany = vi.fn();
const mockAchievementFindUnique = vi.fn();
const mockUserAchievementUpsert = vi.fn();
const mockUserAchievementCount = vi.fn();
const mockTransaction = vi.fn();

const mockPrisma = {
  user: {
    findUniqueOrThrow: mockUserFindUniqueOrThrow,
    update: mockUserUpdate,
  },
  xpEvent: {
    create: mockXpEventCreate,
  },
  activityLog: {
    create: mockActivityLogCreate,
    findMany: mockActivityLogFindMany,
  },
  achievement: {
    findUnique: mockAchievementFindUnique,
  },
  userAchievement: {
    upsert: mockUserAchievementUpsert,
    count: mockUserAchievementCount,
  },
  $transaction: mockTransaction,
} as unknown as PrismaService;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GamificationService", () => {
  let service: GamificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GamificationService(mockPrisma);
  });

  // ---------------------------------------------------------------------------
  // Constant verification — not testing service, but ensuring constants match decisions
  // ---------------------------------------------------------------------------
  describe("constants", () => {
    it("XP_RATES.QUIZ_CORRECT equals 5", () => {
      expect(XP_RATES.QUIZ_CORRECT).toBe(5);
    });

    it("XP_RATES.QUIZ_SESSION_BONUS equals 10", () => {
      expect(XP_RATES.QUIZ_SESSION_BONUS).toBe(10);
    });

    it("XP_RATES.LESSON_COMPLETE equals 20", () => {
      expect(XP_RATES.LESSON_COMPLETE).toBe(20);
    });

    it("XP_RATES.SRS_REVIEW equals 3", () => {
      expect(XP_RATES.SRS_REVIEW).toBe(3);
    });

    it("CEFR_MULTIPLIERS: B1=1.0, B2=1.5, C1=2.0", () => {
      expect(CEFR_MULTIPLIERS.B1).toBe(1.0);
      expect(CEFR_MULTIPLIERS.B2).toBe(1.5);
      expect(CEFR_MULTIPLIERS.C1).toBe(2.0);
    });
  });

  // ---------------------------------------------------------------------------
  // GAME-01 — calculateXp applies CEFR multipliers
  // ---------------------------------------------------------------------------
  describe("calculateXp()", () => {
    it("calculateXp(5, 'B1') returns 5 (1.0 multiplier)", () => {
      expect(calculateXp(XP_RATES.QUIZ_CORRECT, "B1")).toBe(5);
    });

    it("calculateXp(5, 'B2') returns 8 (round(7.5) = 8, 1.5 multiplier)", () => {
      // Math.round(5 * 1.5) = Math.round(7.5) = 8
      expect(calculateXp(XP_RATES.QUIZ_CORRECT, "B2")).toBe(8);
    });

    it("calculateXp(5, 'C1') returns 10 (2.0 multiplier)", () => {
      expect(calculateXp(XP_RATES.QUIZ_CORRECT, "C1")).toBe(10);
    });

    it("calculateXp with unknown CEFR level defaults to 1.0 multiplier", () => {
      expect(calculateXp(XP_RATES.QUIZ_CORRECT, "A2")).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // levelForXp — D-09 formula verification
  // ---------------------------------------------------------------------------
  describe("levelForXp()", () => {
    it("levelForXp(0) returns 1", () => {
      expect(levelForXp(0)).toBe(1);
    });

    it("levelForXp(100) returns 2", () => {
      expect(levelForXp(100)).toBe(2);
    });

    it("levelForXp(9900) returns 100 (max level cap)", () => {
      expect(levelForXp(9900)).toBe(100);
    });

    it("levelForXp(99999) returns 100 (cap at 100)", () => {
      expect(levelForXp(99999)).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // GAME-02 + GAME-05 — awardXp() single event, atomic transaction
  // ---------------------------------------------------------------------------
  describe("awardXp()", () => {
    it("creates exactly one XpEvent, updates user xpTotal, writes one activityLog via $transaction — returns { xpEarned, oldLevel, newLevel, levelUp }", async () => {
      // Arrange: user with xpTotal=0, level=1
      mockUserFindUniqueOrThrow.mockResolvedValue({ xpTotal: 0, level: 1 });
      mockTransaction.mockResolvedValue([]);

      // Act
      const result = await service.awardXp(
        "user-001",
        XP_RATES.QUIZ_CORRECT, // 5
        "quiz",
        "GRAMMAR",
      );

      // Assert: transaction called once (atomic)
      expect(mockTransaction).toHaveBeenCalledTimes(1);

      // Assert: transaction called with exactly 3 operations (XpEvent, User update, ActivityLog)
      const transactionArgs = mockTransaction.mock.calls[0]![0] as unknown[];
      expect(transactionArgs).toHaveLength(3);

      // Assert: return shape
      expect(result).toEqual({
        xpEarned: XP_RATES.QUIZ_CORRECT,
        oldLevel: 1,
        newLevel: 1, // xpTotal=5, still level 1 (need 100 for level 2)
        levelUp: false,
      });
    });

    it("returns levelUp: true when xpTotal crosses 100-boundary (old=98, amount=5 → newXpTotal=103)", async () => {
      // Arrange: user just below level boundary
      mockUserFindUniqueOrThrow.mockResolvedValue({ xpTotal: 98, level: 1 });
      mockTransaction.mockResolvedValue([]);

      const result = await service.awardXp("user-001", 5, "quiz", "GRAMMAR");

      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(2); // floor(103/100) + 1 = 2
      expect(result.levelUp).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GAME-03 — checkAchievements() awards first-lesson idempotently
  // ---------------------------------------------------------------------------
  describe("checkAchievements()", () => {
    it("awards 'first-lesson' achievement on first LESSON_COMPLETE event", async () => {
      const mockAchievement = {
        id: "ach-001",
        slug: "first-lesson",
        name: "First Step",
        description: "Complete your first lesson",
        iconUrl: null,
        xpReward: 10,
      };

      mockAchievementFindUnique.mockResolvedValue(mockAchievement);
      // First call: count before=0, after=1 → newly awarded
      mockUserAchievementCount
        .mockResolvedValueOnce(0) // before
        .mockResolvedValueOnce(1); // after
      mockUserAchievementUpsert.mockResolvedValue({});

      const result = await service.checkAchievements("user-001", {
        type: "LESSON_COMPLETE",
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ slug: "first-lesson" });
    });

    it("returns empty array on second call (idempotent via upsert no-op)", async () => {
      const mockAchievement = {
        id: "ach-001",
        slug: "first-lesson",
        name: "First Step",
        description: "Complete your first lesson",
        iconUrl: null,
        xpReward: 10,
      };

      mockAchievementFindUnique.mockResolvedValue(mockAchievement);
      // Second call: count before=1, after=1 → no new award
      mockUserAchievementCount
        .mockResolvedValueOnce(1) // before
        .mockResolvedValueOnce(1); // after (upsert no-op)
      mockUserAchievementUpsert.mockResolvedValue({});

      const result = await service.checkAchievements("user-001", {
        type: "LESSON_COMPLETE",
      });

      expect(result).toHaveLength(0);
    });
  });
});
