"use client";

import { useState } from "react";
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
  onIncorrect: () => void;
}

export function FillInTheBlankExercise({ question, onCorrect, onIncorrect }: Props) {
  const { prompt, answer } = question;

  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checked) return;

    const correct = input.trim().toLowerCase() === answer.toLowerCase();
    setIsCorrect(correct);
    setChecked(true);

    if (correct) {
      onCorrect();
    } else {
      onIncorrect();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Type your answer</p>
        <p className="text-base leading-relaxed text-foreground">{prompt}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={checked}
          placeholder="Type your answer..."
          className={cn(
            "min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            checked && "cursor-default",
          )}
        />

        {!checked && (
          <Button type="submit" className="min-h-[44px]">
            Check
          </Button>
        )}
      </form>

      {checked && (
        <div className="flex flex-col gap-2">
          {isCorrect ? (
            <p className="text-sm font-medium text-green-700">Correct!</p>
          ) : (
            <p className="text-sm text-red-700">
              The correct answer is: {answer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
