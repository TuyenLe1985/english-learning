"use client";

/**
 * ContextSelectionExercise — pick the sentence using the word correctly
 *
 * Shows the target word + 4 sentences. User taps the sentence that uses
 * the word in its correct context. Feedback with bg-green-50/bg-red-50.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  word: string;
  /** 4 sentences; exactly one uses the word correctly */
  sentences: string[];
  /** Index of the correct sentence in the sentences array */
  correctIndex: number;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function ContextSelectionExercise({
  word,
  sentences,
  correctIndex,
  onCorrect,
  onIncorrect,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
  };

  const handleNext = () => {
    if (selected === correctIndex) {
      onCorrect();
    } else {
      onIncorrect();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 text-sm text-muted-foreground">Choose the sentence that uses the word correctly</p>
        <p className="text-[28px] font-semibold text-foreground">{word}</p>
      </div>

      <div className="flex flex-col gap-3">
        {sentences.map((sentence, index) => {
          const isCorrect = answered && index === correctIndex;
          const isWrong = answered && index === selected && index !== correctIndex;

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={answered}
              className={[
                "min-h-[44px] rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                isCorrect
                  ? "border-green-500 bg-green-50 text-green-800"
                  : isWrong
                    ? "border-red-500 bg-red-50 text-red-800"
                    : answered
                      ? "border-border bg-secondary text-muted-foreground"
                      : "border-border bg-secondary text-foreground hover:bg-secondary/80",
                answered ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              {sentence}
            </button>
          );
        })}
      </div>

      {answered && (
        <Button onClick={handleNext} className="min-h-[44px]">
          Next
        </Button>
      )}
    </div>
  );
}
