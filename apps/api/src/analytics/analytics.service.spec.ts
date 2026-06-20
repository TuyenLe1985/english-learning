/**
 * AnalyticsService unit tests — Wave 0 RED scaffolds (Plan 08-01c)
 *
 * ANLT-02: getAdminAnalytics() returns cached value on 2nd call (mock RedisCacheService)
 * ANLT-02: getAdminAnalytics() result includes completionRateByModule
 * ANLT-01: getStudentAnalytics() result includes skillBreakdown
 *
 * Tests use direct instantiation with mocked PrismaService + RedisCacheService (no NestJS DI).
 * Pattern mirrors apps/api/src/gamification/gamification.service.spec.ts.
 *
 * These tests FAIL intentionally — AnalyticsService does not exist yet.
 * Plan 08-04 turns these green.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsService } from "./analytics.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { RedisCacheService } from "./redis-cache.service";

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockUserCount = vi.fn();
const mockActivityLogGroupBy = vi.fn();
const mockActivityLogFindMany = vi.fn();
const mockSkillScoreFindMany = vi.fn();
const mockCefrHistoryFindMany = vi.fn();
const mockSrsCardFindMany = vi.fn();
const mockXpEventFindMany = vi.fn();
const mockReadingProgressFindMany = vi.fn();

const mockPrisma = {
  user: {
    count: mockUserCount,
  },
  activityLog: {
    groupBy: mockActivityLogGroupBy,
    findMany: mockActivityLogFindMany,
  },
  skillScore: {
    findMany: mockSkillScoreFindMany,
  },
  cefrHistory: {
    findMany: mockCefrHistoryFindMany,
  },
  srsCard: {
    findMany: mockSrsCardFindMany,
  },
  xpEvent: {
    findMany: mockXpEventFindMany,
  },
  readingProgress: {
    findMany: mockReadingProgressFindMany,
  },
} as unknown as PrismaService;

// ─── Mock RedisCacheService ───────────────────────────────────────────────────

const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();

const mockRedis = {
  get: mockCacheGet,
  set: mockCacheSet,
} as unknown as RedisCacheService;

// ─── Shared mock admin analytics payload ──────────────────────────────────────

const mockAdminPayload = {
  dau: 120,
  wau: 540,
  mau: 2100,
  retentionRate: 0.42,
  topContent: [
    { title: "Present Perfect", module: "grammar", completions: 890 },
  ],
  completionRateByModule: [
    { module: "grammar", rate: 0.78 },
    { module: "vocabulary", rate: 0.65 },
  ],
  userGrowth: [{ date: "2026-06-01", total: 2000 }],
  lastUpdated: "2026-06-20T08:00:00Z",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AnalyticsService", () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService(mockPrisma, mockRedis);
  });

  // ---------------------------------------------------------------------------
  // ANLT-02 — Redis caching for admin analytics
  // ---------------------------------------------------------------------------
  describe("getAdminAnalytics()", () => {
    it("ANLT-02: returns cached value on 2nd call (cache hit, skips DB queries)", async () => {
      // 1st call: cache miss → compute from DB
      mockCacheGet.mockResolvedValueOnce(null);
      mockUserCount.mockResolvedValue(2100);
      mockActivityLogGroupBy.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      // 2nd call: cache hit → return cached value
      mockCacheGet.mockResolvedValueOnce(mockAdminPayload);

      const first = await service.getAdminAnalytics();
      const second = await service.getAdminAnalytics();

      // On second call, mockUserCount should still be called only once (from first call)
      expect(mockCacheGet).toHaveBeenCalledTimes(2);
      // Cache set was called once (on first call)
      expect(mockCacheSet).toHaveBeenCalledTimes(1);
      // Second result should match cached payload
      expect(second).toMatchObject({ dau: 120, retentionRate: 0.42 });
    });

    it("ANLT-02: result includes completionRateByModule array", async () => {
      // Cache hit directly
      mockCacheGet.mockResolvedValue(mockAdminPayload);

      const result = await service.getAdminAnalytics();

      expect(result).toHaveProperty("completionRateByModule");
      expect(Array.isArray(result.completionRateByModule)).toBe(true);
      expect(result.completionRateByModule.length).toBeGreaterThan(0);
      // Validate shape of first element
      const firstModule = result.completionRateByModule[0];
      expect(firstModule).toHaveProperty("module");
      expect(firstModule).toHaveProperty("rate");
      expect(typeof firstModule.rate).toBe("number");
    });
  });

  // ---------------------------------------------------------------------------
  // ANLT-01 — Student analytics with skillBreakdown
  // ---------------------------------------------------------------------------
  describe("getStudentAnalytics()", () => {
    it("ANLT-01: result includes skillBreakdown array with per-skill accuracy and isWeak", async () => {
      // Arrange: mock skill scores returned from DB
      mockSkillScoreFindMany.mockResolvedValue([
        { skillArea: "GRAMMAR", accuracy: 0.72, isWeak: false },
        { skillArea: "VOCABULARY", accuracy: 0.85, isWeak: false },
        { skillArea: "READING", accuracy: 0.55, isWeak: true },
        { skillArea: "LISTENING", accuracy: 0.45, isWeak: true },
      ]);
      mockCefrHistoryFindMany.mockResolvedValue([]);
      mockActivityLogFindMany.mockResolvedValue([]);
      mockSrsCardFindMany.mockResolvedValue([]);
      mockXpEventFindMany.mockResolvedValue([]);

      const result = await service.getStudentAnalytics("user-001");

      // Assert: skillBreakdown present and contains skill data
      expect(result).toHaveProperty("skillBreakdown");
      expect(Array.isArray(result.skillBreakdown)).toBe(true);
      expect(result.skillBreakdown.length).toBe(4);

      const grammarScore = result.skillBreakdown.find(
        (s: { skillArea: string }) => s.skillArea === "GRAMMAR",
      );
      expect(grammarScore).toMatchObject({
        skillArea: "GRAMMAR",
        accuracy: 0.72,
        isWeak: false,
      });

      const listeningScore = result.skillBreakdown.find(
        (s: { skillArea: string }) => s.skillArea === "LISTENING",
      );
      expect(listeningScore).toMatchObject({
        skillArea: "LISTENING",
        accuracy: 0.45,
        isWeak: true,
      });
    });

    it("ANLT-01: result includes activityHeatmap, cefrProgression, vocabRetention, learningTime fields", async () => {
      mockSkillScoreFindMany.mockResolvedValue([]);
      mockCefrHistoryFindMany.mockResolvedValue([]);
      mockActivityLogFindMany.mockResolvedValue([]);
      mockSrsCardFindMany.mockResolvedValue([]);
      mockXpEventFindMany.mockResolvedValue([]);

      const result = await service.getStudentAnalytics("user-001");

      expect(result).toHaveProperty("activityHeatmap");
      expect(result).toHaveProperty("cefrProgression");
      expect(result).toHaveProperty("vocabRetention");
      expect(result).toHaveProperty("learningTime");
      expect(result).toHaveProperty("skillBreakdown");
    });
  });
});
