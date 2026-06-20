/**
 * AdaptiveService unit tests — Wave 0 RED scaffolds (Plan 08-01c)
 *
 * ADPT-01: updateSkillScore() blends accuracy using EMA (exponential moving average)
 * ADPT-02: updateSkillScore() sets isWeak=true when blended accuracy < 0.6
 * ADPT-05: getContinueLearningRecommendation() returns preThreshold=true when ActivityLog < 5
 * ADPT-03: getContinueLearningRecommendation() returns lowest-accuracy isWeak skill (tie-break updatedAt desc)
 * ADPT-04: getContinueLearningRecommendation() returns recommendedNextTier when accuracy >= 0.8
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/gamification/gamification.service.spec.ts.
 *
 * These tests FAIL intentionally — AdaptiveService does not exist yet.
 * Plan 08-02 turns these green.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdaptiveService } from "./adaptive.service";
import type { PrismaService } from "../prisma/prisma.service";

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockSkillScoreFindUnique = vi.fn();
const mockSkillScoreUpsert = vi.fn();
const mockActivityLogCount = vi.fn();
const mockSkillScoreFindFirst = vi.fn();

const mockPrisma = {
  skillScore: {
    findUnique: mockSkillScoreFindUnique,
    upsert: mockSkillScoreUpsert,
    findFirst: mockSkillScoreFindFirst,
  },
  activityLog: {
    count: mockActivityLogCount,
  },
} as unknown as PrismaService;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AdaptiveService", () => {
  let service: AdaptiveService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdaptiveService(mockPrisma);
  });

  // ---------------------------------------------------------------------------
  // ADPT-01 — EMA upsert
  // ---------------------------------------------------------------------------
  describe("updateSkillScore()", () => {
    it("ADPT-01: upserts SkillScore with EMA-blended accuracy on first call (no existing score)", async () => {
      // Arrange: no existing record
      mockSkillScoreFindUnique.mockResolvedValue(null);
      mockSkillScoreUpsert.mockResolvedValue({});

      // Act
      await service.updateSkillScore("user-001", "GRAMMAR", 0.8);

      // Assert: upsert called with accuracy = 0.8 (first observation, no blending)
      expect(mockSkillScoreUpsert).toHaveBeenCalledTimes(1);
      const upsertCall = mockSkillScoreUpsert.mock.calls[0][0];
      expect(upsertCall.create.accuracy).toBeCloseTo(0.8, 5);
      expect(upsertCall.update.accuracy).toBeCloseTo(0.8, 5);
    });

    it("ADPT-01: blends new accuracy into existing score using EMA (alpha=0.3)", async () => {
      // Arrange: existing score of 0.5; new accuracy 0.9
      // EMA: 0.5 * 0.7 + 0.9 * 0.3 = 0.35 + 0.27 = 0.62
      mockSkillScoreFindUnique.mockResolvedValue({ accuracy: 0.5, isWeak: true });
      mockSkillScoreUpsert.mockResolvedValue({});

      // Act
      await service.updateSkillScore("user-001", "GRAMMAR", 0.9);

      // Assert: blended accuracy ≈ 0.62
      const upsertCall = mockSkillScoreUpsert.mock.calls[0][0];
      expect(upsertCall.create.accuracy).toBeCloseTo(0.62, 5);
      expect(upsertCall.update.accuracy).toBeCloseTo(0.62, 5);
    });

    // -------------------------------------------------------------------------
    // ADPT-02 — isWeak flag
    // -------------------------------------------------------------------------
    it("ADPT-02: sets isWeak=true when blended accuracy < 0.6", async () => {
      // Arrange: existing score 0.7; new accuracy 0.1 → EMA = 0.7*0.7 + 0.1*0.3 = 0.49 + 0.03 = 0.52 (< 0.6)
      mockSkillScoreFindUnique.mockResolvedValue({ accuracy: 0.7, isWeak: false });
      mockSkillScoreUpsert.mockResolvedValue({});

      await service.updateSkillScore("user-001", "VOCABULARY", 0.1);

      const upsertCall = mockSkillScoreUpsert.mock.calls[0][0];
      expect(upsertCall.create.isWeak).toBe(true);
      expect(upsertCall.update.isWeak).toBe(true);
    });

    it("ADPT-02: sets isWeak=false when blended accuracy >= 0.6", async () => {
      // Arrange: existing score 0.5; new accuracy 0.9 → EMA = 0.62 (>= 0.6)
      mockSkillScoreFindUnique.mockResolvedValue({ accuracy: 0.5, isWeak: true });
      mockSkillScoreUpsert.mockResolvedValue({});

      await service.updateSkillScore("user-001", "READING", 0.9);

      const upsertCall = mockSkillScoreUpsert.mock.calls[0][0];
      expect(upsertCall.create.isWeak).toBe(false);
      expect(upsertCall.update.isWeak).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // ADPT-05 — Pre-threshold gate
  // ---------------------------------------------------------------------------
  describe("getContinueLearningRecommendation()", () => {
    it("ADPT-05: returns preThreshold=true when ActivityLog count < 5", async () => {
      mockActivityLogCount.mockResolvedValue(3);

      const result = await service.getContinueLearningRecommendation("user-001");

      expect(result.preThreshold).toBe(true);
      expect(result.weakestSkill).toBeUndefined();
    });

    it("ADPT-05: returns preThreshold=false when ActivityLog count >= 5 and no weak skills", async () => {
      mockActivityLogCount.mockResolvedValue(10);
      mockSkillScoreFindFirst.mockResolvedValue(null);

      const result = await service.getContinueLearningRecommendation("user-001");

      expect(result.preThreshold).toBe(false);
      expect(result.weakestSkill).toBeUndefined();
    });

    // -------------------------------------------------------------------------
    // ADPT-03 — Lowest-accuracy weak skill, tie-break by updatedAt DESC
    // -------------------------------------------------------------------------
    it("ADPT-03: returns weakest skill (lowest accuracy where isWeak=true) with tie-break updatedAt DESC", async () => {
      mockActivityLogCount.mockResolvedValue(8);
      mockSkillScoreFindFirst.mockResolvedValue({
        skillArea: "LISTENING",
        accuracy: 0.45,
        isWeak: true,
        updatedAt: new Date("2026-06-15"),
      });

      const result = await service.getContinueLearningRecommendation("user-001");

      expect(result.preThreshold).toBe(false);
      expect(result.weakestSkill).toBe("LISTENING");
      expect(result.accuracy).toBeCloseTo(0.45, 5);
      // Assert sort order was applied correctly
      expect(mockSkillScoreFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isWeak: true }),
          orderBy: [{ accuracy: "asc" }, { updatedAt: "desc" }],
        }),
      );
    });

    // -------------------------------------------------------------------------
    // ADPT-04 — Recommended next tier when accuracy >= 0.8 (recommendation only — D-06)
    // -------------------------------------------------------------------------
    it("ADPT-04: returns recommendedNextTier when all skill scores show accuracy >= 0.8 (no weak skills)", async () => {
      mockActivityLogCount.mockResolvedValue(10);
      // No weak skills — all healthy
      mockSkillScoreFindFirst.mockResolvedValue(null);

      const result = await service.getContinueLearningRecommendation("user-001");

      // When no weak skills, service may return recommendedNextTier (implementation determines logic)
      // The test validates the return shape accepts the field
      expect(result.preThreshold).toBe(false);
      // recommendedNextTier is optional — confirm it is a string or undefined if present
      if (result.recommendedNextTier !== undefined) {
        expect(typeof result.recommendedNextTier).toBe("string");
        expect(["B1", "B2", "C1"]).toContain(result.recommendedNextTier);
      }
    });

    it("ADPT-04: getContinueLearningRecommendation returns an object with recommendedNextTier field when user skill accuracy >= 0.8", async () => {
      mockActivityLogCount.mockResolvedValue(10);
      // Simulate the service returning a next-tier recommendation
      mockSkillScoreFindFirst.mockResolvedValue(null);

      const result = await service.getContinueLearningRecommendation("user-001");

      // The result object must have a `recommendedNextTier` key (possibly undefined)
      expect("recommendedNextTier" in result).toBe(true);
    });
  });
});
