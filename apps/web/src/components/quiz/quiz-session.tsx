"use client";

/**
 * QuizSession — quiz session orchestrator (Screen 2, UI-SPEC).
 *
 * State machine: IDLE → ACTIVE → SUBMITTING → RESULTS
 *
 * Reads session data (QuizStartResponseDto) from sessionStorage keyed by sessionId
 * (stored by QuizTypeSelector at start time). If missing, shows error state.
 *
 * Accumulates answers client-side. On question 10 answered, batch POSTs to
 * /api/quiz/sessions/[sessionId]/complete with { timeTakenSec, answers }.
 * Then navigates to /quiz/[sessionId]/results after storing the result.
 *
 * D-06: No back-navigation once an answer is locked. currentIndex only increments.
 * D-05: Elapsed timer shown passively in header (no countdown, no urgency).
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuizProgressBar } from "@/components/quiz/quiz-progress-bar";
import { QuizQuestion } from "@/components/quiz/quiz-question";
import type { SessionAnswer } from "@/components/quiz/quiz-question";
import type { CefrLevel } from "@/components/cefr-badge";
import type { QuizStartResponseDto, QuizCompleteResponseDto } from "@repo/shared";

// ─── Session state type ───────────────────────────────────────────────────────

type SessionState = "IDLE" | "ACTIVE" | "ANSWER_LOCKED" | "SUBMITTING" | "RESULTS";

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuizSessionProps {
  sessionId: string;
  cefrLevel?: CefrLevel;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── QuizSession ─────────────────────────────────────────────────────────────

export function QuizSession({ sessionId, cefrLevel = "B2" }: QuizSessionProps) {
  const router = useRouter();

  // Session data loaded from sessionStorage
  const [sessionData, setSessionData] = useState<QuizStartResponseDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Quiz state machine
  const [state, setState] = useState<SessionState>("IDLE");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Elapsed timer
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // WR-06: ref-based guard for double-answer prevention.
  // A React state check (answers.some(...)) is subject to stale closures —
  // if handleAnswer is called synchronously twice before React commits the first
  // state update, both calls see the pre-update answers array and both pass the
  // guard. The ref is mutated synchronously and is always current.
  const answeredRefsRef = useRef<Set<string>>(new Set());

  // Load session data from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz-session-${sessionId}`);
    if (!stored) {
      setLoadError(
        "Couldn’t load quiz questions. Check your connection and try again.",
      );
      return;
    }
    try {
      const data = JSON.parse(stored) as QuizStartResponseDto;
      setSessionData(data);
      setState("ACTIVE");
      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch {
      setLoadError(
        "Couldn’t load quiz questions. Check your connection and try again.",
      );
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  // ─── Error state ─────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-base text-muted-foreground">{loadError}</p>
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

  if (!sessionData || state === "IDLE") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 flex justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { questions } = sessionData;
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // ─── Answer handler ───────────────────────────────────────────────────────

  const handleAnswer = (answer: SessionAnswer) => {
    // WR-06: check the ref first (synchronous, always current) to prevent stale-closure
    // double-answers. A state-based check (answers.some(...)) can miss concurrent calls
    // that arrive before React commits the first state update.
    if (answeredRefsRef.current.has(answer.questionRef)) return;
    answeredRefsRef.current.add(answer.questionRef);

    setAnswers((prev) => [...prev, answer]);
    setWaitingForNext(true);
    setState("ANSWER_LOCKED");
  };

  // ─── Next / Submit handler ────────────────────────────────────────────────

  const handleNext = async () => {
    if (isLastQuestion) {
      // Submit quiz
      await handleSubmit();
    } else {
      // Advance to next question
      setCurrentIndex((i) => i + 1);
      setWaitingForNext(false);
      setState("ACTIVE");
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setState("SUBMITTING");

    if (timerRef.current) clearInterval(timerRef.current);
    const timeTakenSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

    const payload = {
      timeTakenSec,
      answers: answers.map((a) => ({
        questionRef: a.questionRef,
        skillArea: a.skillArea,
        isCorrect: a.isCorrect,
        userAnswer: a.userAnswer,
        correctAnswer: a.correctAnswer,
      })),
    };

    try {
      const res = await fetch(`/api/quiz/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Quiz submission failed. Your answers are saved — tap Submit again to retry.");
      }

      const result = (await res.json()) as QuizCompleteResponseDto;

      // Store the complete response and answers for the results page
      sessionStorage.setItem(
        `quiz-result-${sessionId}`,
        JSON.stringify({ result, answers, timeTakenSec }),
      );

      setState("RESULTS");
      router.push(`/quiz/${sessionId}/results`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Quiz submission failed. Your answers are saved — tap Submit again to retry.";
      // Show error and allow retry
      alert(message);
      setSubmitting(false);
      setState("ANSWER_LOCKED");
    }
  };

  // ─── Submitting state ─────────────────────────────────────────────────────

  if (state === "SUBMITTING") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 flex flex-col items-center gap-4">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Submitting your quiz...</p>
      </div>
    );
  }

  // ─── Active session ───────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
      {/* Header: progress bar + elapsed timer */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <QuizProgressBar currentIndex={currentIndex} total={totalQuestions} />
        </div>
        <span className="text-xs text-muted-foreground pt-1 tabular-nums min-w-[3.5rem] text-right">
          {formatElapsed(elapsedSec)}
        </span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Card>
            <CardContent className="p-6">
              {currentQuestion && (
                <QuizQuestion
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  total={totalQuestions}
                  cefrLevel={cefrLevel}
                  onAnswer={handleAnswer}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Next / Submit button — appears after answering */}
      {waitingForNext && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="default"
            size="lg"
            className="w-full min-h-[44px]"
            disabled={submitting}
            onClick={() => void handleNext()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : isLastQuestion ? (
              "Submit Quiz"
            ) : (
              "Next →"
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
