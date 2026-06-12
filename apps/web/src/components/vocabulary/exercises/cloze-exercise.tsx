"use client";

/**
 * ClozeExercise — fill in the blank
 *
 * Shows a sentence with a blanked word + 4 option buttons.
 * Correct: bg-green-50 / border-green-500 feedback.
 * Incorrect: bg-red-50 / border-red-500 feedback.
 * After answering, calls onCorrect/onIncorrect and shows "Next" button.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Sentence with the target word replaced by "___" */
  sentence: string;
  /** The correct word that fills the blank */
  blankedWord: string;
  /** 4 options including the correct answer */
  options: string[];
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function ClozeExercise({ sentence, blankedWord, options, onCorrect, onIncorrect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
  };

  const handleNext = () => {
    if (selected === blankedWord) {
      onCorrect();
    } else {
      onIncorrect();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Fill in the blank</p>
        <p className="text-base leading-relaxed text-foreground">{sentence}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isCorrect = answered && option === blankedWord;
          const isWrong = answered && option === selected && option !== blankedWord;

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={[
                "min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium text-left transition-colors",
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
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="flex flex-col gap-2">
          {selected !== blankedWord && (
            <p className="text-sm text-muted-foreground">
              Correct answer: <span className="font-semibold text-foreground">{blankedWord}</span>
            </p>
          )}
          <Button onClick={handleNext} className="min-h-[44px]">
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
