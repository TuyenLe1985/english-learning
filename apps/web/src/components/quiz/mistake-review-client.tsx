"use client";

/**
 * MistakeReviewClient — client orchestrator for the mistake review page (QUIZ-04).
 *
 * Reads stored quiz results from sessionStorage[quiz-result-{sessionId}].
 * If sessionStorage is empty (page refresh / direct navigation), falls back to
 * fetching incorrect answers from GET /api/quiz/sessions/[sessionId]/mistakes.
 *
 * Renders MistakeReview with incorrectAnswers from QuizCompleteResponseDto.
 * Passes userAnswers map (from stored SessionAnswer[]) so wrong answers are highlighted.
 */

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { MistakeReview } from "@/components/quiz/mistake-review";
import type { SessionAnswer } from "@/components/quiz/quiz-question";
import type { QuizCompleteResponseDto, QuizMistakesDto, QuizQuestionDto } from "@repo/shared";

// ─── Stored result shape ──────────────────────────────────────────────────────

interface StoredQuizResult {
  result: QuizCompleteResponseDto;
  answers: SessionAnswer[];
  timeTakenSec: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MistakeReviewClientProps {
  sessionId: string;
}

// ─── MistakeReviewClient ──────────────────────────────────────────────────────

export function MistakeReviewClient({ sessionId }: MistakeReviewClientProps) {
  const [incorrectAnswers, setIncorrectAnswers] = useState<QuizQuestionDto[] | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try sessionStorage first (avoids re-fetch)
    const raw = sessionStorage.getItem(`quiz-result-${sessionId}`);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredQuizResult;
        setIncorrectAnswers(stored.result.incorrectAnswers ?? []);

        // Build userAnswers map from SessionAnswer[] — keyed by questionRef
        // Note: SessionAnswer uses 'questionRef' field
        const map: Record<string, string> = {};
        for (const a of stored.answers) {
          if (!a.isCorrect) {
            map[a.questionRef] = a.userAnswer;
          }
        }
        setUserAnswers(map);
        setLoading(false);
        return;
      } catch {
        // Fall through to API fetch
      }
    }

    // Fallback: fetch from API
    void fetch(`/api/quiz/sessions/${sessionId}/mistakes`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch mistakes");
        const data = (await res.json()) as QuizMistakesDto;
        setIncorrectAnswers(data.incorrectAnswers ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load quiz questions. Check your connection and try again.");
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-base text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <MistakeReview
      incorrectAnswers={incorrectAnswers ?? []}
      userAnswers={userAnswers}
    />
  );
}
