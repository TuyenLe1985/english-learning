"use client";

/**
 * QuestionsSection — inline comprehension questions with per-question feedback.
 *
 * Implements D-01 (inline below passage), D-02 (immediate per-question feedback),
 * D-03 (timer coordination via onTimerStop), D-04 (inline score card after completion).
 *
 * Per-question state: { answered, selectedAnswer, isCorrect }
 * Sequential unlock: all questions visible; options on future questions disabled
 * until the question above is answered.
 *
 * On last question answered: calls onTimerStop() to capture readingTimeSec,
 * posts session to /api/reading/sessions/complete (non-blocking), then shows
 * PassageScoreCard inline (D-04 — no redirect).
 *
 * UI-SPEC §2c: question card anatomy, answer option states, feedback expansion.
 * UI-SPEC Question Answer States: emerald/red/neutral Tailwind classes.
 * UI-SPEC Animation Contract: framer-motion height 0→auto for feedback.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PassageScoreCard } from "./passage-score-card";
import type { ReadingQuestionDto } from "@repo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionState {
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

interface Attempt {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuestionsSectionProps {
  questions: ReadingQuestionDto[];
  passageId: string;
  onTimerStop: () => number;
}

// ─── Helper: build shuffled options array (correct answer + distractors) ──────

function buildOptions(q: ReadingQuestionDto): string[] {
  const opts = [q.answer, ...q.distractors];
  // Stable shuffle based on question id to avoid re-shuffling on re-render
  return opts.sort((a, b) => {
    const hashA = hashStr(q.id + a);
    const hashB = hashStr(q.id + b);
    return hashA - hashB;
  });
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ─── Option button classes per state ─────────────────────────────────────────

function optionClass(
  opt: string,
  qState: QuestionState | undefined,
  correctAnswer: string,
): string {
  const base = "w-full justify-start text-left text-sm min-h-[44px] h-auto py-2 px-3";

  if (!qState?.answered) {
    return `${base} variant-outline`;
  }

  if (opt === correctAnswer) {
    if (opt === qState.selectedAnswer) {
      // Correct and selected
      return `${base} bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-50`;
    }
    // Correct but not selected (revealed when user picked wrong)
    return `${base} bg-emerald-50/50 border-emerald-300 text-emerald-700 hover:bg-emerald-50/50`;
  }

  if (opt === qState.selectedAnswer && opt !== correctAnswer) {
    // Incorrect selected
    return `${base} bg-red-50 border-red-400 text-red-700 hover:bg-red-50`;
  }

  return `${base} opacity-50`;
}

// ─── Single question card ─────────────────────────────────────────────────────

interface QuestionCardProps {
  question: ReadingQuestionDto;
  index: number;
  total: number;
  qState: QuestionState | undefined;
  unlocked: boolean;
  onAnswer: (questionId: string, selectedAnswer: string) => void;
}

function QuestionCard({
  question,
  index,
  total,
  qState,
  unlocked,
  onAnswer,
}: QuestionCardProps) {
  const options = buildOptions(question);
  const answered = qState?.answered ?? false;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {/* Question number */}
        <p className="mb-1 text-xs text-muted-foreground">
          Question {index + 1} of {total}
        </p>

        {/* Question prompt */}
        <p className="mb-3 text-sm font-semibold text-foreground">
          {question.prompt}
        </p>

        {/* Answer options */}
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <Button
              key={opt}
              variant="outline"
              disabled={answered || !unlocked}
              aria-pressed={qState?.selectedAnswer === opt}
              aria-disabled={answered || !unlocked}
              className={
                answered
                  ? optionClass(opt, qState, question.answer)
                  : "w-full justify-start text-left text-sm min-h-[44px] h-auto py-2 px-3" +
                    (!unlocked ? " opacity-50 cursor-not-allowed" : "")
              }
              onClick={() => {
                if (!answered && unlocked) {
                  onAnswer(question.id, opt);
                }
              }}
            >
              {opt}
            </Button>
          ))}
        </div>

        {/* Feedback expansion (framer-motion height 0→auto) */}
        <AnimatePresence>
          {answered && (
            <motion.div
              key="feedback"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 p-3">
                {qState?.isCorrect ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {qState?.isCorrect ? "Correct!" : `Correct answer: ${question.answer}`}
                  </p>
                  {question.explanation && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {question.explanation}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QuestionsSection({
  questions,
  passageId,
  onTimerStop,
}: QuestionsSectionProps) {
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [scoreData, setScoreData] = useState<{
    score: number;
    total: number;
    readingTimeSec: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Compute live score for the section header counter
  const answeredCount = Object.values(questionStates).filter((s) => s.answered).length;
  const correctCount = Object.values(questionStates).filter((s) => s.answered && s.isCorrect).length;

  // Determine which question index is "last answered" for sequential unlock
  const lastAnsweredIndex = questions.reduce((max, q, i) => {
    return questionStates[q.id]?.answered ? i : max;
  }, -1);

  const submitSession = useCallback(
    async (finalStates: Record<string, QuestionState>, readingTimeSec: number) => {
      const attempts: Attempt[] = questions.map((q) => ({
        questionId: q.id,
        isCorrect: finalStates[q.id]?.isCorrect ?? false,
        userAnswer: finalStates[q.id]?.selectedAnswer ?? "",
      }));

      const totalCorrect = attempts.filter((a) => a.isCorrect).length;
      const accuracy = questions.length > 0 ? (totalCorrect / questions.length) * 100 : 0;

      setScoreData({
        score: totalCorrect,
        total: questions.length,
        readingTimeSec,
      });
      setSessionComplete(true);

      setSubmitting(true);
      try {
        await fetch("/api/reading/sessions/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passageId,
            score: totalCorrect,
            accuracy,
            readingTimeSec,
            attempts,
          }),
        });
      } catch {
        // Non-blocking — score card shown regardless of submit success
      } finally {
        setSubmitting(false);
      }
    },
    [questions, passageId],
  );

  const handleAnswer = useCallback(
    (questionId: string, selectedAnswer: string) => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;

      const isCorrect = selectedAnswer === question.answer;
      const newState: QuestionState = {
        answered: true,
        selectedAnswer,
        isCorrect,
      };

      const newStates = { ...questionStates, [questionId]: newState };
      setQuestionStates(newStates);

      // Check if all questions answered
      const allAnswered = questions.every((q) => newStates[q.id]?.answered);
      if (allAnswered) {
        const readingTimeSec = onTimerStop();
        void submitSession(newStates, readingTimeSec);
      }
    },
    [questions, questionStates, onTimerStop, submitSession],
  );

  if (questions.length === 0) {
    return (
      <section aria-label="Comprehension Questions">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Comprehension Questions
        </h2>
        <p className="text-sm text-muted-foreground">
          No questions available for this passage.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Comprehension Questions">
      {/* Section header with live score counter */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Comprehension Questions
        </h2>
        {answeredCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {correctCount} / {questions.length} correct
          </span>
        )}
      </div>

      {/* Question cards */}
      {questions.map((question, index) => {
        const unlocked = index <= lastAnsweredIndex + 1;
        return (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            total={questions.length}
            qState={questionStates[question.id]}
            unlocked={unlocked}
            onAnswer={handleAnswer}
          />
        );
      })}

      {/* Inline score card (D-04) — appears after all questions answered */}
      {sessionComplete && scoreData && (
        <PassageScoreCard
          score={scoreData.score}
          total={scoreData.total}
          readingTimeSec={scoreData.readingTimeSec}
          passageId={passageId}
        />
      )}

      {/* Submitting indicator (non-blocking) */}
      {submitting && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Saving progress...
        </p>
      )}
    </section>
  );
}
