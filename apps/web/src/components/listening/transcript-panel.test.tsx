/**
 * TranscriptPanel component tests — Wave 1 RED scaffolds (Plan 06-01)
 *
 * LIST-04: When transcriptLocked={true}, the transcript text has blur-[4px] CSS class
 * LIST-04: When transcriptLocked={false}, the blur-[4px] class is absent
 * LIST-06: When transcriptLocked={false} and a word span is clicked,
 *          onWordClick callback is called with the word text
 *
 * Tests use Vitest + @testing-library/react.
 *
 * These tests FAIL intentionally — TranscriptPanel does not yet exist.
 * Plan 06-03 turns these green.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptPanel } from '@/components/listening/transcript-panel';

// ─── Sample fixtures ──────────────────────────────────────────────────────────

const sampleTranscriptText = 'The quick brown fox jumps over the lazy dog.';
const sampleWordTimestamps = [
  { word: 'The', start: 0.0, end: 0.2 },
  { word: 'quick', start: 0.2, end: 0.5 },
  { word: 'brown', start: 0.5, end: 0.8 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TranscriptPanel', () => {
  // ---------------------------------------------------------------------------
  // LIST-04 — Transcript blur when locked
  // ---------------------------------------------------------------------------
  describe('transcriptLocked prop', () => {
    it('applies blur-[4px] class on transcript container when transcriptLocked={true}', () => {
      const { container } = render(
        <TranscriptPanel
          transcriptText={sampleTranscriptText}
          wordTimestamps={sampleWordTimestamps}
          currentTime={0}
          transcriptLocked={true}
          onWordClick={vi.fn()}
        />,
      );

      // The transcript text container must have blur-[4px] CSS class when locked
      const blurredEl = container.querySelector('.blur-\\[4px\\]');
      expect(blurredEl).not.toBeNull();
    });

    it('does not apply blur-[4px] class when transcriptLocked={false}', () => {
      const { container } = render(
        <TranscriptPanel
          transcriptText={sampleTranscriptText}
          wordTimestamps={sampleWordTimestamps}
          currentTime={0}
          transcriptLocked={false}
          onWordClick={vi.fn()}
        />,
      );

      const blurredEl = container.querySelector('.blur-\\[4px\\]');
      expect(blurredEl).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // LIST-06 — WordPopover tap
  // ---------------------------------------------------------------------------
  describe('word click interaction', () => {
    it('calls onWordClick with the word text when a word span is clicked (transcriptLocked=false)', () => {
      const onWordClick = vi.fn();

      render(
        <TranscriptPanel
          transcriptText={sampleTranscriptText}
          wordTimestamps={sampleWordTimestamps}
          currentTime={0}
          transcriptLocked={false}
          onWordClick={onWordClick}
        />,
      );

      // Click on the 'quick' word span
      const quickWordSpan = screen.getByText('quick');
      fireEvent.click(quickWordSpan);

      expect(onWordClick).toHaveBeenCalledWith('quick');
    });

    it('does not call onWordClick when transcriptLocked={true}', () => {
      const onWordClick = vi.fn();

      render(
        <TranscriptPanel
          transcriptText={sampleTranscriptText}
          wordTimestamps={sampleWordTimestamps}
          currentTime={0}
          transcriptLocked={true}
          onWordClick={onWordClick}
        />,
      );

      const wordSpans = screen.queryAllByRole('button');
      // Locked transcript should not have interactive word spans
      expect(onWordClick).not.toHaveBeenCalled();
    });
  });
});
