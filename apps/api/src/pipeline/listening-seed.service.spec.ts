/**
 * ListeningSeedService unit tests — Wave 1 RED scaffold (Plan 06-01)
 *
 * LIST-02: generateExercises() returns at least one exercise of each required type
 * for a content item: MULTIPLE_CHOICE, FILL_MISSING_WORDS, DICTATION
 *
 * Tests use direct instantiation of ListeningSeedService.
 * Pattern mirrors apps/api/src/pipeline/classifier.service.spec.ts.
 *
 * These tests FAIL intentionally — ListeningSeedService does not yet exist.
 * Plan 06-05 turns these green.
 */

import { describe, it, expect } from 'vitest';
import { ListeningSeedService } from './listening-seed.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ListeningSeedService', () => {
  describe('generateExercises', () => {
    it('returns at least one exercise of each required type for a content item', async () => {
      // RED: ListeningSeedService does not exist yet — this test fails at import
      const service = new ListeningSeedService();
      const mockContent = {
        id: 'test-id',
        transcriptText: 'The quick brown fox jumps over the lazy dog. It was a bright sunny day.',
      };
      const exercises = await service.generateExercises(mockContent as any);
      const types = exercises.map((e: any) => e.exerciseType);
      expect(types).toContain('MULTIPLE_CHOICE');
      expect(types).toContain('FILL_MISSING_WORDS');
      expect(types).toContain('DICTATION');
    });
  });
});
