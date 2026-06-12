"use client";

/**
 * SynonymExercise — identify the correct synonym
 *
 * Shows the target word + 4 options. User picks the correct synonym.
 * Feedback with bg-green-50/bg-red-50.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  word: string;
  /** 4 options; exactly one is the correct synonym */
  options: string[];
  /** The correct synonym (must be in options array) */
  correctSynonym: string;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function SynonymExercise({ word, options, correctSynonym, onCorrect, onIncorrect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
  };

  const handleNext = () => {
    if (selected === correctSynonym) {
      onCorrect();
    } else {
      onIncorrect();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 text-sm text-muted-foreground">Choose the correct synonym</p>
        <p className="text-[28px] font-semibold text-foreground">{word}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isCorrect = answered && option === correctSynonym;
          const isWrong = answered && option === selected && option !== correctSynonym;

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={[
                "min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium text-center transition-colors",
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
          {selected !== correctSynonym && (
            <p className="text-sm text-muted-foreground">
              Correct answer:{" "}
              <span className="font-semibold text-foreground">{correctSynonym}</span>
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
