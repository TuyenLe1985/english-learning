"use client";

/**
 * QuestionsSection — inline comprehension questions with per-question feedback.
 *
 * Plan 05-07, READ-02, READ-03, READ-07:
 * - All questions visible inline below the passage (D-01)
 * - Immediate per-question feedback after answering (D-02): emerald/red colors
 * - Reading timer stops when last question is answered (D-03)
 * - POST /api/reading/sessions/complete on last answer (READ-07)
 * - PassageScoreCard appears inline below last question (D-04)
 *
 * UI-SPEC §2c: question card anatomy, answer option states.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

interface Props {
  questions: ReadingQuestionDto[];
  passageId: string;
  /** Called when last question answered. Returns readingTimeSec from timer. */
  onTimerStop: () => number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOptionClass(
  option: string,
  state: QuestionState | undefined,
  correctAnswer: string,
): string {
  if (!state?.answered) {
    return "border-border bg-background text-foreground";
  }
  if (option === correctAnswer) {
    // Correct option — always show emerald
    return "border-emerald-400 bg-emerald-50 text-emerald-800";
  }
  if (option === state.selectedAnswer && option !== correctAnswer) {
    // User's wrong selection — red
    return "border-red-400 bg-red-50 text-red-700";
  }
  // Other options after answering — neutral
  return "border-border bg-background text-muted-foreground opacity-60";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuestionsSection({ questions, passageId, onTimerStop }: Props) {
  const [questionStates, setQuestionStates] = useState<
    Record<string, QuestionState>
  >({});
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [scoreData, setScoreData] = useState<{
    score: number;
    total: number;
    readingTimeSec: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalQuestions = questions.length;
  const answeredCount = Object.values(questionStates).filter(
    (s) => s.answered,
  ).length;
  const correctCount = Object.values(questionStates).filter(
    (s) => s.answered && s.isCorrect,
  ).length;

  // ─── Session submit ───────────────────────────────────────────────────────

  const submitSession = useCallback(
    async (
      finalAttempts: Attempt[],
      finalScore: number,
      readingTimeSec: number,
    ) => {
      setSubmitting(true);
      const accuracy =
        totalQuestions > 0
          ? Math.round((finalScore / totalQuestions) * 100)
          : 0;

      // Show score card regardless of submit success (D-04, non-blocking)
      setScoreData({ score: finalScore, total: totalQuestions, readingTimeSec });

      try {
        await fetch("/api/reading/sessions/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passageId,
            score: finalScore,
            accuracy,
            readingTimeSec,
            attempts: finalAttempts,
          }),
        });
        // Non-blocking — score card already shown; progress saved in background
      } catch {
        // Silently swallow — user already sees the score card
      } finally {
        setSubmitting(false);
      }
    },
    [passageId, totalQuestions],
  );

  // ─── Answer handler ───────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    (question: ReadingQuestionDto, selectedOption: string) => {
      const isCorrect = selectedOption === question.answer;

      const newState: QuestionState = {
        answered: true,
        selectedAnswer: selectedOption,
        isCorrect,
      };

      setQuestionStates((prev) => ({
        ...prev,
        [question.id]: newState,
      }));

      const newAttempt: Attempt = {
        questionId: question.id,
        isCorrect,
        userAnswer: selectedOption,
      };

      const newAttempts = [...attempts, newAttempt];
      setAttempts(newAttempts);

      // Derive counts from newAttempts — avoids stale closure values
      const newAnsweredCount = newAttempts.length;
      if (newAnsweredCount >= totalQuestions) {
        const newCorrectCount = newAttempts.filter((a) => a.isCorrect).length;
        const readingTimeSec = onTimerStop();
        void submitSession(newAttempts, newCorrectCount, readingTimeSec);
      }
    },
    [attempts, totalQuestions, onTimerStop, submitSession],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!questions.length) return null;

  return (
    <section aria-label="Comprehension questions" className="mt-8">
      <Separator className="mb-8" />

      {/* Section header with live score counter */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Comprehension Questions
        </h2>
        <span
          className="text-sm font-semibold text-muted-foreground"
          aria-live="polite"
          aria-label={`${correctCount} of ${totalQuestions} correct`}
        >
          {correctCount} / {totalQuestions} correct
        </span>
      </div>

      {/* Question cards */}
      <div className="flex flex-col gap-6">
        {questions
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((question, index) => {
            const state = questionStates[question.id];
            // Unlock this question if it's the first OR the previous question is answered
            const isUnlocked =
              index === 0 ||
              questionStates[questions[index - 1]!.id]?.answered === true;

            // Build options list (answer + distractors shuffled deterministically by sort)
            const options = [...question.distractors, question.answer].sort();

            return (
              <Card
                key={question.id}
                className={`transition-opacity ${!isUnlocked ? "opacity-50" : ""}`}
              >
                <CardContent className="pt-6">
                  {/* Question number */}
                  <p className="mb-1 text-xs text-muted-foreground">
                    Question {index + 1} of {totalQuestions}
                  </p>

                  {/* Prompt */}
                  <p className="mb-4 text-sm font-semibold text-foreground">
                    {question.prompt}
                  </p>

                  {/* Answer options */}
                  <div className="flex flex-col gap-2">
                    {options.map((option) => {
                      const optionClass = getOptionClass(
                        option,
                        state,
                        question.answer,
                      );
                      const isDisabled = !isUnlocked || !!state?.answered;
                      const isSelected = state?.selectedAnswer === option;

                      return (
                        <Button
                          key={option}
                          variant="outline"
                          disabled={isDisabled}
                          aria-pressed={isSelected}
                          aria-disabled={isDisabled}
                          onClick={() => handleAnswer(question, option)}
                          className={`min-h-[44px] justify-start text-left text-sm ${optionClass} ${!isUnlocked ? "cursor-not-allowed opacity-50" : ""}`}
                        >
                          {option}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Feedback expansion (framer-motion height 0→auto) */}
                  <AnimatePresence>
                    {state?.answered && question.explanation && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 flex items-start gap-2 rounded-md bg-muted/50 p-3">
                          {state.isCorrect ? (
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          )}
                          <p className="text-sm text-muted-foreground">
                            {question.explanation}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Inline score card — appears after all questions answered (D-04) */}
      <AnimatePresence>
        {scoreData && (
          <PassageScoreCard
            score={scoreData.score}
            total={scoreData.total}
            readingTimeSec={scoreData.readingTimeSec}
            passageId={passageId}
          />
        )}
      </AnimatePresence>

      {/* Non-blocking submit indicator */}
      {submitting && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Saving your progress...
        </p>
      )}
    </section>
  );
}
