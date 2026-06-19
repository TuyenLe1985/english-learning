"use client";

/**
 * QuizQuestion — polymorphic renderer for quiz questions (Screen 2, UI-SPEC).
 *
 * Delegates ALL question types to MultipleChoiceExercise.
 * Grammar, vocabulary, reading, and listening questions are all MC in quiz context.
 *
 * Maps QuizQuestionDto → MultipleChoiceExercise props.
 * Header shows skill area Badge (variant="secondary") + CefrBadge.
 * onCorrect/onIncorrect emit a SessionAnswer to the parent QuizSession.
 *
 * NOTE: MultipleChoiceExercise auto-advances via onCorrect/onIncorrect callbacks after
 * a 900ms delay. QuizSession uses these to record the answer and advance currentIndex.
 */

import { MultipleChoiceExercise } from "@/components/grammar/multiple-choice-exercise";
import { CefrBadge } from "@/components/cefr-badge";
import { Badge } from "@/components/ui/badge";
import type { CefrLevel } from "@/components/cefr-badge";
import type { QuizQuestionDto } from "@repo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionAnswer {
  questionRef: string;
  skillArea: "GRAMMAR" | "VOCABULARY" | "READING" | "LISTENING";
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
}

// ─── Skill area display map ───────────────────────────────────────────────────

const SKILL_LABELS: Record<QuizQuestionDto["skillArea"], string> = {
  GRAMMAR: "Grammar",
  VOCABULARY: "Vocabulary",
  READING: "Reading",
  LISTENING: "Listening",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuizQuestionProps {
  question: QuizQuestionDto;
  questionNumber: number;
  total: number;
  cefrLevel?: CefrLevel;
  onAnswer: (answer: SessionAnswer) => void;
}

// ─── QuizQuestion ─────────────────────────────────────────────────────────────

export function QuizQuestion({
  question,
  cefrLevel = "B2",
  onAnswer,
}: QuizQuestionProps) {
  const skillLabel = SKILL_LABELS[question.skillArea];

  const handleCorrect = () => {
    onAnswer({
      questionRef: question.questionRef,
      skillArea: question.skillArea,
      isCorrect: true,
      userAnswer: question.answer,
      correctAnswer: question.answer,
    });
  };

  // MultipleChoiceExercise passes the user's selected option to onIncorrect (CR-05).
  // This allows MistakeReview to highlight which answer the user actually chose.
  const handleIncorrect = (selectedOption: string) => {
    onAnswer({
      questionRef: question.questionRef,
      skillArea: question.skillArea,
      isCorrect: false,
      userAnswer: selectedOption,
      correctAnswer: question.answer,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header: skill area badge + CEFR badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{skillLabel}</Badge>
        <CefrBadge level={cefrLevel} />
      </div>

      {/* Delegate to MultipleChoiceExercise — no MC re-implementation */}
      <MultipleChoiceExercise
        question={{
          id: question.questionRef,
          exerciseType: "MULTIPLE_CHOICE",
          prompt: question.prompt,
          answer: question.answer,
          distractors: question.distractors,
          explanation: question.explanation ?? null,
          difficulty: 1,
          xpReward: 5,
        }}
        onCorrect={handleCorrect}
        onIncorrect={handleIncorrect}
      />
    </div>
  );
}
