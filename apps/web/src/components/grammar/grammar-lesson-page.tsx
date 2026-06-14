"use client";

/**
 * GrammarLessonPage — session orchestrator (D-04, D-06, D-09)
 *
 * Three sequential phases: explanation → exercises → results.
 * - Explanation phase: renders ExplanationView + "Start Practice" CTA.
 * - Exercises phase: one-at-a-time carousel; no mid-session API calls.
 * - Results phase: batch POST to /api/grammar/sessions/complete on completion.
 *
 * Weak-review mode (D-09): when `weakQuestions` prop is provided and non-empty,
 * the explanation phase is skipped; only the weak questions are run.
 *
 * Patterns: mirrors PracticeSession (vocabulary) + PATTERNS.md grammar-lesson-page section.
 */

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ExplanationView } from "./explanation-view";
import { MultipleChoiceExercise } from "./multiple-choice-exercise";
import { FillInTheBlankExercise } from "./fill-in-the-blank-exercise";
import { DragAndDropExercise } from "./drag-and-drop-exercise";
import { SentenceTransformationExercise } from "./exercises/sentence-transformation-exercise";
import { ErrorCorrectionExercise } from "./exercises/error-correction-exercise";
import { GrammarSessionResults } from "./grammar-session-results";
import type { GrammarLessonDetailDto, GrammarQuestionDto } from "@repo/shared";

// ─── State shapes ─────────────────────────────────────────────────────────────

type Phase = "explanation" | "exercises" | "results";

interface Attempt {
  questionId: string;
  isCorrect: boolean;
  userAnswer?: string;
}

interface SessionResult {
  score: number;
  total: number;
  masteryPct: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  lesson: GrammarLessonDetailDto;
  areaSlug: string;
  topicSlug: string;
  /** When provided and non-empty: skip explanation, run only these questions (D-09). */
  weakQuestions?: GrammarQuestionDto[];
}

// ─── renderExercise ───────────────────────────────────────────────────────────

/**
 * Render the correct exercise component based on the question's exerciseType.
 * The question object is passed directly — each component uses its own internal
 * GrammarQuestion interface that matches GrammarQuestionDto structurally.
 */
function renderExercise(
  question: GrammarQuestionDto,
  onCorrect: () => void,
  onIncorrect: () => void,
): React.ReactNode {
  switch (question.exerciseType) {
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoiceExercise
          question={question}
          onCorrect={onCorrect}
          onIncorrect={onIncorrect}
        />
      );
    case "FILL_IN_THE_BLANK":
      return (
        <FillInTheBlankExercise
          question={question}
          onCorrect={onCorrect}
          onIncorrect={onIncorrect}
        />
      );
    case "SENTENCE_TRANSFORMATION":
      return (
        <SentenceTransformationExercise
          question={question}
          onCorrect={onCorrect}
          onIncorrect={onIncorrect}
        />
      );
    case "ERROR_CORRECTION":
      return (
        <ErrorCorrectionExercise
          question={question}
          onCorrect={onCorrect}
          onIncorrect={onIncorrect}
        />
      );
    case "DRAG_AND_DROP":
      return (
        <DragAndDropExercise
          question={question}
          onCorrect={onCorrect}
          onIncorrect={onIncorrect}
        />
      );
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Unknown exercise type: {question.exerciseType}
        </p>
      );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GrammarLessonPage({
  lesson,
  areaSlug,
  topicSlug,
  weakQuestions,
}: Props) {
  const router = useRouter();

  // Determine which question set to run (D-09: weak-review mode)
  const isWeakReview = weakQuestions != null && weakQuestions.length > 0;
  const activeQuestions = isWeakReview ? weakQuestions : lesson.questions;

  // Three phases: explanation → exercises → results (D-04)
  // Skip explanation in weak-review mode (D-09)
  const [phase, setPhase] = useState<Phase>(
    isWeakReview ? "exercises" : "explanation",
  );

  // Session state — no API calls mid-session (D-06)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const startTime = useRef<number>(Date.now());

  const totalQuestions = activeQuestions.length;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCorrect = () => {
    const question = activeQuestions[currentIndex]!;
    const newAttempts: Attempt[] = [
      ...attempts,
      { questionId: question.id, isCorrect: true },
    ];
    setAttempts(newAttempts);
    advanceOrSubmit(newAttempts);
  };

  const handleIncorrect = () => {
    const question = activeQuestions[currentIndex]!;
    const newAttempts: Attempt[] = [
      ...attempts,
      { questionId: question.id, isCorrect: false },
    ];
    setAttempts(newAttempts);
    advanceOrSubmit(newAttempts);
  };

  const advanceOrSubmit = (currentAttempts: Attempt[]) => {
    if (currentIndex + 1 >= totalQuestions) {
      void submitSession(currentAttempts);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const submitSession = async (finalAttempts: Attempt[]) => {
    setSubmitting(true);
    const timeTakenMs = Date.now() - startTime.current;
    try {
      const res = await fetch("/api/grammar/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          attempts: finalAttempts,
          timeTakenMs,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as SessionResult;
        setSessionResult(data);
      }
    } catch {
      // Non-blocking — still show results even if submission fails
    } finally {
      setSubmitting(false);
      setPhase("results");
    }
  };

  const handleRestart = () => {
    // Reset to exercises phase (skip explanation for restart too — more natural)
    setCurrentIndex(0);
    setAttempts([]);
    setSessionResult(null);
    setSubmitting(false);
    startTime.current = Date.now();
    setPhase("exercises");
  };

  const handleBackToTopic = () => {
    router.push(`/grammar/${areaSlug}/${topicSlug}`);
  };

  const timeTakenMs = Date.now() - startTime.current;

  // ─── Phase: Explanation ─────────────────────────────────────────────────────

  if (phase === "explanation") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {/* Lesson title */}
        <div>
          <h1 className="text-[28px] font-semibold leading-tight text-foreground">
            {lesson.title}
          </h1>
        </div>

        {/* Grammar Rule section */}
        <div>
          <p className="mb-3 text-base font-semibold text-foreground">
            Grammar Rule
          </p>
          <ExplanationView
            explanation={lesson.explanation}
            examples={lesson.examples}
          />
        </div>

        {/* Start Practice CTA */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              startTime.current = Date.now();
              setPhase("exercises");
            }}
            className="w-full min-h-[44px]"
          >
            Start Practice
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {totalQuestions} questions
          </p>
        </div>
      </div>
    );
  }

  // ─── Phase: Results ─────────────────────────────────────────────────────────

  if (phase === "results") {
    const score = attempts.filter((a) => a.isCorrect).length;
    const masteryPct = sessionResult?.masteryPct ?? 0;

    return (
      <div className="mx-auto max-w-2xl">
        {sessionResult == null && !submitting && (
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Could not save your progress. Your answers were recorded locally.
          </p>
        )}
        <GrammarSessionResults
          score={score}
          total={attempts.length}
          masteryPct={masteryPct}
          timeTakenMs={timeTakenMs}
          onRestart={handleRestart}
          onBackToTopic={handleBackToTopic}
        />
      </div>
    );
  }

  // ─── Phase: Exercises ───────────────────────────────────────────────────────

  const currentQuestion = activeQuestions[currentIndex];
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">No questions available.</p>
      </div>
    );
  }

  const answeredCount = attempts.length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Progress section */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground" aria-label="Exercise progress">
            {currentIndex + 1} of {totalQuestions}
          </p>
          {submitting && (
            <p className="text-xs text-muted-foreground">Saving...</p>
          )}
        </div>
        <Progress
          value={(answeredCount / totalQuestions) * 100}
          className="h-2"
          aria-label="Exercise progress"
        />
      </div>

      {/* Exercise card — key forces fresh mount per question; no overflow:hidden (DnD Pitfall 3) */}
      <div key={currentQuestion.id} className="rounded-xl border border-border bg-card p-6 shadow-sm min-h-[280px]">
        {renderExercise(currentQuestion, handleCorrect, handleIncorrect)}
      </div>
    </div>
  );
}
