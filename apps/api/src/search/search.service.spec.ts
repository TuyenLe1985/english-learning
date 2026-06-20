/**
 * SearchService unit tests — Wave 0 RED scaffolds (Plan 08-01c)
 *
 * SRCH-02: SearchService returns results matching query using GIN FTS (mock $queryRaw)
 * SRCH-03: SearchService applies CEFR level / skill filters to query
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/gamification/gamification.service.spec.ts.
 *
 * These tests FAIL intentionally — SearchService does not exist yet.
 * Plan 08-03 turns these green.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchService } from "./search.service";
import type { PrismaService } from "../prisma/prisma.service";

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockQueryRaw = vi.fn();

const mockPrisma = {
  $queryRaw: mockQueryRaw,
} as unknown as PrismaService;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SearchService", () => {
  let service: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService(mockPrisma);
  });

  // ---------------------------------------------------------------------------
  // SRCH-02 — FTS returns query matches
  // ---------------------------------------------------------------------------
  describe("search()", () => {
    it("SRCH-02: returns results matching query from GIN FTS (mock $queryRaw returns rows)", async () => {
      // Arrange: mock $queryRaw returns vocabulary and reading rows
      const mockRows = [
        {
          id: "vocab-001",
          type: "vocabulary",
          title: "ephemeral",
          snippet: "having an <mark>ephemeral</mark> quality",
          cefrLevel: "B2",
          topic: "daily life",
        },
        {
          id: "read-001",
          type: "reading",
          title: "The Art of Ephemeral Things",
          snippet: "about <mark>ephemeral</mark> experiences",
          cefrLevel: "C1",
          topic: null,
        },
      ];
      mockQueryRaw.mockResolvedValue(mockRows);

      // Act
      const results = await service.search("ephemeral", {});

      // Assert: $queryRaw called once; results returned
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ id: "vocab-001", type: "vocabulary" });
      expect(results[1]).toMatchObject({ id: "read-001", type: "reading" });
    });

    it("SRCH-02: returns empty array when $queryRaw returns no matches", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const results = await service.search("xyznonexistent", {});

      expect(results).toHaveLength(0);
    });

    // -------------------------------------------------------------------------
    // SRCH-03 — Filters (CEFR level, skill type)
    // -------------------------------------------------------------------------
    it("SRCH-03: passes level filter to $queryRaw query (calling search with level=B2)", async () => {
      mockQueryRaw.mockResolvedValue([]);

      await service.search("technology", { level: "B2" });

      // Assert: $queryRaw was called (filter passed through)
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it("SRCH-03: passes skill filter to $queryRaw query (calling search with skill=reading)", async () => {
      mockQueryRaw.mockResolvedValue([]);

      await service.search("business", { skill: "reading" });

      // Assert: $queryRaw was called with skill filter
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it("SRCH-03: passes combined filters (level + topic) to $queryRaw", async () => {
      const mockRows = [
        {
          id: "gram-001",
          type: "grammar",
          title: "Past Perfect Tense",
          snippet: "Used for actions completed before another past event",
          cefrLevel: "B2",
          topic: "verb tenses",
        },
      ];
      mockQueryRaw.mockResolvedValue(mockRows);

      const results = await service.search("past perfect", {
        level: "B2",
        topic: "verb tenses",
      });

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
      expect(results[0].cefrLevel).toBe("B2");
    });
  });
});
