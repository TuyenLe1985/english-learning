/**
 * MistakeReview — re-display of incorrect quiz answers with explanations (QUIZ-04).
 *
 * Screen 4 (UI-SPEC): for each incorrect answer, shows:
 *   - Full question prompt
 *   - All answer options (correct + incorrect) with visual differentiation
 *   - User's wrong answer: bg-destructive/10 border-destructive/30 text-destructive
 *   - Correct answer: bg-green-50 border-green-300 text-green-700
 *   - Explanation: text-sm text-muted-foreground italic
 *
 * Empty state: "All correct! No mistakes to review."
 *
 * Accessibility (UI-SPEC Answer Option Accessibility):
 *   - Correct answer option: aria-label="Correct answer: {text}"
 *   - User's incorrect answer: aria-label="Your answer (incorrect): {text}"
 */

"use client";

import { cn } from "@/lib/utils";
import type { QuizQuestionDto } from "@repo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MistakeReviewProps {
  /**
   * Array of incorrect questions from QuizCompleteResponseDto.incorrectAnswers.
   * Each item includes the correct answer and explanation.
   */
  incorrectAnswers: QuizQuestionDto[];
  /**
   * Map from questionRef to the user's actual wrong answer string.
   * If missing for a question, only the correct answer is highlighted.
   */
  userAnswers?: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOptionClass(
  option: string,
  correctAnswer: string,
  userAnswer: string | undefined,
): string {
  if (option === correctAnswer) {
    return "border-green-300 bg-green-50 text-green-700";
  }
  if (userAnswer && option === userAnswer) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-border bg-background text-muted-foreground opacity-60";
}

function getOptionAriaLabel(
  option: string,
  correctAnswer: string,
  userAnswer: string | undefined,
): string | undefined {
  if (option === correctAnswer) {
    return `Correct answer: ${option}`;
  }
  if (userAnswer && option === userAnswer) {
    return `Your answer (incorrect): ${option}`;
  }
  return undefined;
}

// ─── MistakeReview ────────────────────────────────────────────────────────────

export function MistakeReview({
  incorrectAnswers,
  userAnswers = {},
}: MistakeReviewProps) {
  // Empty state — all correct
  if (!incorrectAnswers || incorrectAnswers.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-base text-muted-foreground">
          All correct! No mistakes to review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {incorrectAnswers.map((question, idx) => {
        const allOptions = [question.answer, ...question.distractors];
        const userAnswer = userAnswers[question.questionRef];

        return (
          <div
            key={question.questionRef}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            {/* Question number + skill area */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Question {idx + 1}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {question.skillArea.charAt(0) +
                  question.skillArea.slice(1).toLowerCase()}
              </span>
            </div>

            {/* Question prompt */}
            <p className="mb-4 text-base text-foreground leading-relaxed">
              {question.prompt}
            </p>

            {/* Answer options */}
            <div className="flex flex-col gap-2">
              {allOptions.map((option) => {
                const optionClass = getOptionClass(
                  option,
                  question.answer,
                  userAnswer,
                );
                const ariaLabel = getOptionAriaLabel(
                  option,
                  question.answer,
                  userAnswer,
                );

                return (
                  <div
                    key={option}
                    role="radio"
                    aria-checked={option === question.answer}
                    aria-disabled="true"
                    aria-label={ariaLabel}
                    className={cn(
                      "min-h-[44px] rounded-lg border px-4 py-3 text-sm transition-colors flex items-center",
                      optionClass,
                    )}
                  >
                    {option}
                  </div>
                );
              })}
            </div>

            {/* Explanation (if available) */}
            {question.explanation && (
              <p className="mt-4 text-sm text-muted-foreground italic border-t border-border pt-3">
                {question.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
