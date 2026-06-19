"use client";

/**
 * QuizResultsClient — results page client orchestrator.
 *
 * Reads the stored QuizCompleteResponseDto + answers from sessionStorage
 * (keyed `quiz-result-{sessionId}`, stored by QuizSession on submit).
 * Renders QuizScoreCard with the result data.
 *
 * Error state: if sessionStorage entry is missing (e.g., direct URL navigation),
 * shows a recovery message with a link back to /quiz.
 *
 * NOTE(07-06): XP toast and level-up modal will be added here, consuming
 * result.levelUp and result.xpEarned from QuizCompleteResponseDto.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizScoreCard } from "@/components/quiz/quiz-score-card";
import type { SessionAnswer } from "@/components/quiz/quiz-question";
import type { QuizCompleteResponseDto } from "@repo/shared";

// ─── Stored result shape ──────────────────────────────────────────────────────

interface StoredQuizResult {
  result: QuizCompleteResponseDto;
  answers: SessionAnswer[];
  timeTakenSec: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuizResultsClientProps {
  sessionId: string;
}

// ─── QuizResultsClient ────────────────────────────────────────────────────────

export function QuizResultsClient({ sessionId }: QuizResultsClientProps) {
  const router = useRouter();
  const [stored, setStored] = useState<StoredQuizResult | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`quiz-result-${sessionId}`);
    if (!raw) {
      setLoadError(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as StoredQuizResult;
      setStored(parsed);
    } catch {
      setLoadError(true);
    }
  }, [sessionId]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-base text-muted-foreground">
          Results not found. The session may have expired.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/quiz")}
        >
          Back to Quiz Center
        </Button>
      </div>
    );
  }

  if (!stored) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { result, answers, timeTakenSec } = stored;
  const incorrectCount = result.incorrectAnswers?.length ?? 0;

  return (
    <QuizScoreCard
      sessionId={sessionId}
      score={result.score}
      total={10}
      accuracy={result.accuracy}
      xpEarned={result.xpEarned}
      timeTakenSec={timeTakenSec}
      answers={answers}
      incorrectCount={incorrectCount}
    />
  );
}
