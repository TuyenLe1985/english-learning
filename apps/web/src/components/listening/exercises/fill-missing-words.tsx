'use client';

/**
 * FillMissingWordsExercise — fill in the missing word from 3 option pills.
 *
 * UI-SPEC: Prompt with inline blank pill replaced by answer pill on selection.
 * Option pills are shuffled once on mount. Correct/incorrect state applied
 * via Tailwind class variants. No dangerouslySetInnerHTML.
 *
 * Threat T-06-14: question.prompt split on literal "___" string — not parsed
 * as HTML. Each part rendered as a {text} React text node.
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ListeningQuestionDto } from '@repo/shared';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FillMissingWordsExerciseProps {
  question: ListeningQuestionDto;
  questionNumber: number;
  total: number;
  onAnswer: (isCorrect: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Shuffle an array once using Fisher-Yates. Returns a new array.
 * Uses a seeded index approach based on array content for stable testing.
 */
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // biome-ignore lint/style/noNonNullAssertion: bounds guaranteed by loop
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

// ─── FillMissingWordsExercise ─────────────────────────────────────────────────

export function FillMissingWordsExercise({
  question,
  questionNumber,
  total,
  onAnswer,
}: FillMissingWordsExerciseProps) {
  const { prompt, answer, distractors, explanation } = question;

  // Shuffle answer + distractors once on mount (empty dep array)
  const options = useMemo(
    () => shuffleArray([answer, ...distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    onAnswer(option === answer);
  };

  // Split prompt on literal "___" to render blank inline
  // T-06-14: plain text nodes only — no dangerouslySetInnerHTML
  const parts = prompt.split('___');
  const before = parts[0] ?? '';
  const after = parts.slice(1).join('___'); // handles edge case where "___" appears >1 time

  return (
    <div className="flex flex-col gap-4">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Question {questionNumber} of {total}
        </p>
      </div>

      {/* Prompt label */}
      <p className="text-sm text-muted-foreground mb-2">Fill in the missing word</p>

      {/* Prompt with inline blank pill */}
      <p className="text-base leading-relaxed text-foreground">
        {before}
        {!answered ? (
          <span
            className="inline-block min-w-[80px] text-center rounded-md border-2 border-primary bg-primary/5 px-2 py-0.5 font-semibold"
            aria-label="blank"
          >
            ___
          </span>
        ) : (
          <span
            className={cn(
              'inline-block min-w-[80px] text-center rounded-md border-2 px-2 py-0.5 font-semibold',
              selected === answer
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-red-400 bg-red-50 text-red-700',
            )}
          >
            {answer}
          </span>
        )}
        {after}
      </p>

      {/* Option pills */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Answer options">
        {options.map((option) => {
          const isCorrectOption = answered && option === answer;
          const isSelectedWrong = answered && option === selected && option !== answer;
          const isRevealedCorrect = answered && option === answer && selected !== answer;

          return (
            <Button
              key={option}
              variant="outline"
              size="sm"
              onClick={() => handleSelect(option)}
              disabled={answered}
              aria-pressed={option === selected}
              className={cn(
                'rounded-full px-4 min-h-[36px] text-sm',
                isCorrectOption
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : isSelectedWrong
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : isRevealedCorrect
                      ? 'bg-emerald-50/50 border-emerald-300 text-emerald-700'
                      : '',
              )}
            >
              {option}
            </Button>
          );
        })}
      </div>

      {/* Explanation (if available and answered) */}
      {answered && explanation && (
        <p className="text-sm text-muted-foreground mt-3">{explanation}</p>
      )}
    </div>
  );
}
