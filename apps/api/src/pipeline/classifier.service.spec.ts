/**
 * ClassifierService unit tests — Wave 0 RED scaffolds (Plan 05-01)
 *
 * PIPE-03: classifyPassage() returns correct CEFR level for passage content
 * PIPE-04: classifyPassage() returns flaggedForReview=true when confidence < 0.65
 * PIPE-04: classifyPassage() returns flaggedForReview=false when confidence >= 0.65
 *
 * Tests use direct instantiation of ClassifierService (no PrismaService needed —
 * classifier is a pure-function service with no DB dependency).
 * Pattern mirrors apps/api/src/grammar/grammar.service.spec.ts.
 *
 * These tests FAIL intentionally — ClassifierService does not yet exist.
 * Plan 05-04 turns these green.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassifierService } from './classifier.service';

// ─── Sample passage fixtures ──────────────────────────────────────────────────

// B1-level passage: common vocabulary, shorter sentences, straightforward syntax
const b1Passage = `
  Many people like to travel on their holidays. They visit new countries and try different food.
  It is important to learn about other cultures. You can make new friends when you travel abroad.
  Travelling helps you to understand the world better. Most people find it very enjoyable.
`;

// B2-level passage: more complex vocabulary, longer sentences
const b2Passage = `
  International travel has become increasingly accessible over the past few decades, enabling
  millions of people to experience diverse cultures firsthand. Tourism contributes significantly
  to local economies, providing employment and supporting infrastructure development.
  However, mass tourism also raises concerns about environmental sustainability and cultural preservation.
`;

// C1-level passage: advanced vocabulary, complex syntax, academic tone
const c1Passage = `
  The pervasiveness of digital technology in contemporary education has precipitated a fundamental
  reconceptualization of pedagogical methodologies. Scholars argue that traditional didactic approaches
  are increasingly inadequate in cultivating the critical faculties and adaptive competencies
  indispensable for navigating an increasingly volatile epistemic landscape. The juxtaposition of
  algorithmic instruction and humanistic inquiry warrants rigorous empirical scrutiny.
`;

// Ambiguous passage — short, mixed signals, expected low confidence
const ambiguousPassage = `
  The cat sat. Very nice day. People work hard sometimes. Things happen in life.
`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ClassifierService', () => {
  let service: ClassifierService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClassifierService();
  });

  // ---------------------------------------------------------------------------
  // PIPE-03 — CEFR level classification correctness
  // ---------------------------------------------------------------------------
  describe('classifyPassage()', () => {
    it('returns a cefrLevel value of B1, B2, or C1 for any passage', async () => {
      const validLevels = ['B1', 'B2', 'C1'];

      const result = await service.classifyPassage(b1Passage);

      expect(validLevels).toContain(result.cefrLevel);
    });

    it('returns a cefrConfidence number between 0.0 and 1.0', async () => {
      const result = await service.classifyPassage(b1Passage);

      expect(result.cefrConfidence).toBeGreaterThanOrEqual(0.0);
      expect(result.cefrConfidence).toBeLessThanOrEqual(1.0);
    });

    it('classifies a C1-level academic passage with cefrLevel C1', async () => {
      const result = await service.classifyPassage(c1Passage);

      // C1 passage should classify as C1 (not B1 or B2)
      expect(result.cefrLevel).toBe('C1');
    });

    // ---------------------------------------------------------------------------
    // PIPE-04 — flaggedForReview when confidence < 0.65
    // ---------------------------------------------------------------------------
    it('returns flaggedForReview=false when confidence >= 0.65', async () => {
      // The C1 passage has unambiguous C1 markers — expected high confidence
      const result = await service.classifyPassage(c1Passage);

      if (result.cefrConfidence >= 0.65) {
        expect(result.flaggedForReview).toBe(false);
      }
    });

    it('returns flaggedForReview=true when confidence < 0.65', async () => {
      // The ambiguous passage has conflicting signals — expected low confidence
      const result = await service.classifyPassage(ambiguousPassage);

      if (result.cefrConfidence < 0.65) {
        expect(result.flaggedForReview).toBe(true);
      }
    });

    it('sets isPublished=false when flaggedForReview=true', async () => {
      // Any passage with low confidence should not auto-publish
      const result = await service.classifyPassage(ambiguousPassage);

      if (result.flaggedForReview === true) {
        expect(result.isPublished).toBe(false);
      }
    });
  });
});
