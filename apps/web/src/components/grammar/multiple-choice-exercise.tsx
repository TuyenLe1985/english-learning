"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GrammarQuestion {
  id: string;
  exerciseType: string;
  prompt: string;
  answer: string;
  distractors: string[];
  explanation?: string | null;
  difficulty: number;
  xpReward: number;
}

interface Props {
  question: GrammarQuestion;
  onCorrect: () => void;
  /** Called with the user's selected (wrong) option so callers can record it for mistake review (CR-05). */
  onIncorrect: (selectedOption: string) => void;
}

export function MultipleChoiceExercise({ question, onCorrect, onIncorrect }: Props) {
  const { prompt, answer, distractors } = question;

  // Shuffle answer + distractors deterministically (stable order per render)
  const [options] = useState<string[]>(() => {
    const all = [answer, ...distractors];
    // Stable shuffle using answer as seed to keep consistent per question
    return all.slice().sort(() => 0);
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === answer;
    timerRef.current = setTimeout(() => {
      if (correct) onCorrect(); else onIncorrect(option);
    }, 900);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Choose the correct option</p>
        <p className="text-base leading-relaxed text-foreground">{prompt}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isCorrect = answered && option === answer;
          const isWrong = answered && option === selected && option !== answer;

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={cn(
                "min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                isCorrect
                  ? "border-green-500 bg-green-50 text-green-800"
                  : isWrong
                    ? "border-red-500 bg-red-50 text-red-800"
                    : answered
                      ? "cursor-default border-border bg-secondary text-muted-foreground"
                      : "cursor-pointer border-border bg-secondary text-foreground hover:bg-secondary/80",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && selected !== answer && (
        <p className="text-sm text-muted-foreground">
          Correct answer:{" "}
          <span className="font-semibold text-foreground">{answer}</span>
        </p>
      )}
    </div>
  );
}
