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

export function ErrorCorrectionExercise({ question, onCorrect, onIncorrect }: Props) {
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
        <p className="mb-2 text-sm text-muted-foreground">Find and correct the error</p>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-base text-foreground">
          {prompt}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={checked}
          placeholder="Write the corrected sentence..."
          rows={2}
          className={cn(
            "w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
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
        <div className="flex flex-col gap-1">
          {isCorrect ? (
            <p className="text-sm font-medium text-green-700">Correct!</p>
          ) : (
            <>
              <p className="text-sm text-red-700">Incorrect.</p>
              <p className="text-sm text-muted-foreground">Corrected: {answer}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
