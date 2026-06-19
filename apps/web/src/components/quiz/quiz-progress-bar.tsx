"use client";

/**
 * QuizProgressBar — question progress indicator for the quiz session (Screen 2, UI-SPEC).
 *
 * Shows shadcn Progress component with value=(currentIndex/10)*100 and
 * a "Question N of 10" label below per the Copywriting Contract.
 */

import { Progress } from "@/components/ui/progress";

interface QuizProgressBarProps {
  /** 0-based index of the current question (0 = question 1) */
  currentIndex: number;
  /** Total number of questions (always 10 in v1) */
  total?: number;
}

export function QuizProgressBar({
  currentIndex,
  total = 10,
}: QuizProgressBarProps) {
  // Show progress for the question being answered (1-indexed)
  const questionNumber = currentIndex + 1;
  const progressValue = (questionNumber / total) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={progressValue} className="h-2" />
      <p className="text-sm text-muted-foreground">
        Question {questionNumber} of {total}
      </p>
    </div>
  );
}
