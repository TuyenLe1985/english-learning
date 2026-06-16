'use client';

/**
 * DictationExercise — mini clip player + Textarea + Check Answer with native edit distance.
 *
 * UI-SPEC: Mini player with Play/Pause, "Audio clip · {n}s" label, Textarea,
 * Check Answer button, correct/incorrect feedback.
 *
 * Implements editDistance natively (Wagner-Fischer DP) — avoids client-side
 * dependency on fastest-levenshtein (lives in apps/api server-side only).
 *
 * Threat T-06-15: question.answer rendered as {question.answer} text node — not
 * dangerouslySetInnerHTML.
 */

import { useState } from 'react';
import { Play, Pause, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ListeningQuestionDto } from '@repo/shared';

// ─── Native edit distance (Wagner-Fischer DP) ─────────────────────────────────
// Avoids importing fastest-levenshtein (server-side package in apps/api).

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Create (m+1) x (n+1) DP matrix
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(
          dp[i - 1]![j]!,     // deletion
          dp[i]![j - 1]!,     // insertion
          dp[i - 1]![j - 1]!, // substitution
        );
      }
    }
  }

  return dp[m]![n]!;
}

// ─── Normalize dictation input ────────────────────────────────────────────────

export function normalizeDictation(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Estimate a clip duration in seconds — returns 10 as default.
 * Future: could be computed from transcript timestamps.
 */
function estimateDuration(_timestampSec: number | null): number {
  return 10;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DictationExerciseProps {
  question: ListeningQuestionDto;
  questionNumber: number;
  total: number;
  onAnswer: (isCorrect: boolean) => void;
  /** Seeks the main audio player to startSec and plays the clip */
  onPlayClip: (startSec: number) => void;
}

// ─── DictationExercise ────────────────────────────────────────────────────────

export function DictationExercise({
  question,
  questionNumber,
  total,
  onAnswer,
  onPlayClip,
}: DictationExerciseProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isClipPlaying, setIsClipPlaying] = useState(false);

  const clipDuration = estimateDuration(question.timestampSec);

  const handlePlayClip = () => {
    setIsClipPlaying((prev) => !prev);
    onPlayClip(question.timestampSec ?? 0);
  };

  const handleCheckAnswer = () => {
    if (!userAnswer.trim() || isChecked) return;

    const distance = editDistance(
      normalizeDictation(userAnswer),
      normalizeDictation(question.answer),
    );
    const correct = distance <= 2;

    setIsCorrect(correct);
    setIsChecked(true);
    onAnswer(correct);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Question {questionNumber} of {total}
        </p>
      </div>

      {/* Prompt label */}
      <p className="text-sm text-muted-foreground">Listen and type what you hear</p>

      {/* Prompt text */}
      {question.prompt && (
        <p className="text-base leading-relaxed text-foreground">{question.prompt}</p>
      )}

      {/* Mini clip player */}
      <div className="flex items-center gap-3 rounded-lg bg-muted p-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={isClipPlaying ? 'Pause clip' : 'Play audio clip'}
          onClick={handlePlayClip}
        >
          {isClipPlaying ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          Audio clip · {clipDuration}s
        </span>
      </div>

      {/* Textarea */}
      <Textarea
        rows={2}
        className={cn(
          'resize-none text-sm',
          isChecked && isCorrect
            ? 'border-emerald-400 bg-emerald-50'
            : isChecked
              ? 'border-red-400 bg-red-50'
              : '',
        )}
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        disabled={isChecked}
        placeholder="Type what you hear..."
        aria-label="Type what you hear"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCheckAnswer();
          }
        }}
      />

      {/* Check Answer button */}
      <Button
        variant="default"
        size="sm"
        className="min-h-[36px] self-start"
        disabled={!userAnswer.trim() || isChecked}
        onClick={handleCheckAnswer}
      >
        Check Answer
      </Button>

      {/* Feedback — T-06-15: answer rendered as text node, not HTML */}
      {isChecked && isCorrect === true && (
        <div className="flex items-center gap-1 mt-2">
          <CheckCircle className="size-4 text-emerald-500" aria-hidden="true" />
          <span className="text-sm text-emerald-700">Correct!</span>
        </div>
      )}
      {isChecked && isCorrect === false && (
        <div className="flex items-center gap-1 mt-2">
          <XCircle className="size-4 text-red-500" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">
            Correct: &ldquo;{question.answer}&rdquo;
          </span>
        </div>
      )}
    </div>
  );
}
