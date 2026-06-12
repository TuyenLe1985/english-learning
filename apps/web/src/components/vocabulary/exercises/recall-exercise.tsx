"use client";

/**
 * RecallExercise — self-rated recall
 *
 * Shows the definition. User self-rates whether they knew the word.
 * No automated correct/incorrect checking — user judges themselves.
 * "I knew it" → onCorrect(); "I didn't know it" → onIncorrect().
 */

import { Button } from "@/components/ui/button";

interface Props {
  /** The definition to display */
  definition: string;
  /** Optional: the word to reveal after user decides to "show answer" */
  word?: string;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function RecallExercise({ definition, word, onCorrect, onIncorrect }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          What word matches this definition?
        </p>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-base leading-relaxed text-foreground">{definition}</p>
        </div>
        {word && (
          <p className="mt-3 text-center text-[28px] font-semibold text-foreground">
            {word}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-muted-foreground">Did you know this word?</p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onIncorrect}
            className="min-h-[44px] flex-1"
          >
            <span className="text-red-600">Didn&apos;t know it</span>
          </Button>
          <Button
            onClick={onCorrect}
            className="min-h-[44px] flex-1"
          >
            I knew it!
          </Button>
        </div>
      </div>
    </div>
  );
}
