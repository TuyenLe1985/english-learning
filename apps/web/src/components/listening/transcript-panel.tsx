'use client';

import { useEffect, useRef } from 'react';
import { LockKeyhole } from 'lucide-react';
import type { WordTimestamp } from '@repo/shared';
import { findActiveWordIndex } from '@/hooks/use-audio-player';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TranscriptPanelProps {
  transcriptText: string;
  wordTimestamps: WordTimestamp[] | null;
  transcriptLocked: boolean;
  currentTime: number;
  onWordClick?: (word: string) => void;
  onCueSeek?: (time: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Split transcript into sentences and find the sentence containing the word at
 * the given index. Returns the sentence string for context.
 */
function getSentenceContext(
  wordIndex: number,
  words: WordTimestamp[],
  transcriptText: string,
): string {
  if (words.length === 0) return transcriptText;

  // Split transcript text into sentences on ". " boundaries
  const sentences = transcriptText.split(/(?<=\.)\s+/);

  // Find which sentence contains this word by accumulating word counts
  let wordCount = 0;
  for (const sentence of sentences) {
    const sentenceWordCount = sentence
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    if (wordIndex < wordCount + sentenceWordCount) {
      return sentence.trim();
    }
    wordCount += sentenceWordCount;
  }

  return transcriptText;
}

// ─── TranscriptPanel ─────────────────────────────────────────────────────────

export function TranscriptPanel({
  transcriptText,
  wordTimestamps,
  transcriptLocked,
  currentTime,
  onWordClick,
  onCueSeek: _onCueSeek,
}: TranscriptPanelProps) {
  // Refs for direct DOM manipulation (karaoke — no setState in rAF)
  const wordRefsContainer = useRef<Array<React.RefObject<HTMLSpanElement>>>([]);
  const prevActiveIndexRef = useRef<number>(-1);

  // Initialize word refs array when wordTimestamps changes
  if (
    wordTimestamps &&
    wordRefsContainer.current.length !== wordTimestamps.length
  ) {
    wordRefsContainer.current = wordTimestamps.map(() => ({
      current: null,
    })) as Array<React.RefObject<HTMLSpanElement>>;
  }

  // ─── Karaoke effect ─────────────────────────────────────────────────────────
  // Watches currentTime and drives word highlighting via direct DOM mutation.
  // Does NOT call setState (avoids re-renders per rAF tick per plan spec).

  useEffect(() => {
    if (transcriptLocked || !wordTimestamps || wordTimestamps.length === 0)
      return;

    const newIdx = findActiveWordIndex(wordTimestamps, currentTime);
    const prevIdx = prevActiveIndexRef.current;

    if (newIdx === prevIdx) return;

    // Remove active from previous word
    if (prevIdx >= 0 && wordRefsContainer.current[prevIdx]?.current) {
      wordRefsContainer.current[prevIdx].current!.removeAttribute('data-active');
      wordRefsContainer.current[prevIdx].current!.setAttribute(
        'data-active',
        'false',
      );
    }

    // Set active on new word
    if (newIdx >= 0 && wordRefsContainer.current[newIdx]?.current) {
      wordRefsContainer.current[newIdx].current!.setAttribute(
        'data-active',
        'true',
      );
      // scrollIntoView may not be available in test environments (jsdom)
      if (
        typeof wordRefsContainer.current[newIdx].current!.scrollIntoView ===
        'function'
      ) {
        wordRefsContainer.current[newIdx].current!.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }

    prevActiveIndexRef.current = newIdx;
  }, [currentTime, transcriptLocked, wordTimestamps]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-3">
        Transcript
      </h2>

      <div className="relative mt-4 rounded-xl border border-border bg-card p-6">
        {/* Transcript content — blurred when locked */}
        <div
          aria-hidden={transcriptLocked ? 'true' : undefined}
          className={cn(
            'transition-[filter] duration-300 ease-in-out',
            transcriptLocked &&
              'blur-[4px] select-none pointer-events-none',
          )}
        >
          {!wordTimestamps ? (
            // No word timestamps — render plain text
            <>
              <p className="text-base leading-[1.75] text-foreground">
                {transcriptText}
              </p>
              <p className="text-sm text-muted-foreground italic mt-2">
                Word-level sync is unavailable for this item.
              </p>
            </>
          ) : (
            // Word timestamps available — render karaoke word spans
            <p className="text-base leading-[1.75] text-foreground">
              {wordTimestamps.map((word, i) => (
                <span key={i}>
                  <span
                    ref={wordRefsContainer.current[i] as React.RefObject<HTMLSpanElement>}
                    data-word-index={i}
                    data-active="false"
                    role={!transcriptLocked ? 'button' : undefined}
                    tabIndex={!transcriptLocked ? 0 : undefined}
                    aria-label={!transcriptLocked ? `Word: ${word.word}` : undefined}
                    className={cn(
                      'rounded-sm px-0.5 transition-colors duration-75',
                      !transcriptLocked &&
                        'cursor-pointer hover:bg-muted/70 data-[active=true]:bg-amber-200 data-[active=true]:text-amber-900',
                    )}
                    onClick={
                      !transcriptLocked
                        ? () => {
                            onWordClick?.(word.word);
                          }
                        : undefined
                    }
                    onKeyDown={
                      !transcriptLocked
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onWordClick?.(word.word);
                            }
                          }
                        : undefined
                    }
                  >
                    {word.word}
                  </span>
                  {' '}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Lock overlay — shown on top when locked */}
        {transcriptLocked && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 rounded-xl"
          >
            <LockKeyhole size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center max-w-[240px]">
              Transcript is locked until you complete the exercises.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
