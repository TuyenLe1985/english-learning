'use client';

/**
 * ListeningSession — exercise session orchestrator for listening items.
 *
 * Implements:
 * - D-13: Start Exercises button gated on hasListenedEnough (50% audio)
 * - D-14: 3 exercise types dispatched to correct components
 * - D-15: onSubmitComplete() called on POST success → triggers transcriptLocked=false
 * - D-16: ListeningScoreCard rendered inline after submit
 *
 * Session accumulates answers client-side and POSTs to
 * /api/listening/sessions/complete on submit.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MultipleChoiceExercise } from '@/components/grammar/multiple-choice-exercise';
import { FillMissingWordsExercise } from '@/components/listening/exercises/fill-missing-words';
import { DictationExercise } from '@/components/listening/exercises/dictation-exercise';
import { ListeningScoreCard } from '@/components/listening/listening-score-card';
import type { ListeningItemDetailDto, ListeningQuestionDto } from '@repo/shared';
import type { RefObject } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionAnswer {
  questionId: string;
  isCorrect: boolean;
  userAnswer?: string;
  exerciseType: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ListeningSessionProps {
  item: ListeningItemDetailDto;
  audioRef: RefObject<HTMLAudioElement>;
  hasListenedEnough: boolean;
  seek: (time: number) => void;
  onSubmitComplete: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortedQuestions(questions: ListeningQuestionDto[]): ListeningQuestionDto[] {
  return [...questions].sort((a, b) => a.sortOrder - b.sortOrder);
}

function buildBreakdown(
  answers: SessionAnswer[],
  questions: ListeningQuestionDto[],
): {
  multipleChoice: [number, number];
  fillMissingWords: [number, number];
  dictation: [number, number];
} {
  const byType = (type: string) => {
    const qs = questions.filter((q) => q.exerciseType === type);
    const correct = answers.filter(
      (a) => a.exerciseType === type && a.isCorrect,
    ).length;
    return [correct, qs.length] as [number, number];
  };

  return {
    multipleChoice: byType('MULTIPLE_CHOICE'),
    fillMissingWords: byType('FILL_MISSING_WORDS'),
    dictation: byType('DICTATION'),
  };
}

// ─── ListeningSession ─────────────────────────────────────────────────────────

export function ListeningSession({
  item,
  hasListenedEnough,
  seek,
  onSubmitComplete,
}: ListeningSessionProps) {
  const { toast } = useToast();
  const [exercisesActivated, setExercisesActivated] = useState(false);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionResult, setSessionResult] = useState<{
    xpEarned: number;
    score: number;
  } | null>(null);

  const questions = sortedQuestions(item.questions);
  const total = questions.length;
  const answeredCount = answers.length;
  const allAnswered = answeredCount >= total;

  const handleAnswer = (
    questionId: string,
    isCorrect: boolean,
    exerciseType: string,
    userAnswer?: string,
  ) => {
    // Prevent double-answering the same question
    if (answers.some((a) => a.questionId === questionId)) return;
    setAnswers((prev) => [
      ...prev,
      { questionId, isCorrect, exerciseType, userAnswer },
    ]);
  };

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;

    setSubmitting(true);
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;

    try {
      const res = await fetch('/api/listening/sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: item.id,
          score: correctCount,
          accuracy,
          attempts: answers.map(({ questionId, isCorrect, userAnswer }) => ({
            questionId,
            isCorrect,
            userAnswer,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit session');
      }

      const result = (await res.json()) as { xpEarned?: number };
      const xpEarned = result?.xpEarned ?? correctCount * 10;

      setSessionResult({ xpEarned, score: correctCount });
      setIsComplete(true);
      // D-15: atomic transcript unlock — called only on successful submit
      onSubmitComplete();
    } catch {
      toast({
        title: 'Submission failed',
        description: 'Could not save your session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Complete state: render score card ─────────────────────────────────────

  if (isComplete && sessionResult) {
    const breakdown = buildBreakdown(answers, questions);
    return (
      <ListeningScoreCard
        score={sessionResult.score}
        total={total}
        xpEarned={sessionResult.xpEarned}
        breakdown={breakdown}
        hasWordTimestamps={item.wordTimestamps !== null}
        onReset={() => {
          setAnswers([]);
          setExercisesActivated(false);
          setIsComplete(false);
          setSessionResult(null);
        }}
      />
    );
  }

  // ─── Pre-activation state: Start Exercises button ──────────────────────────

  return (
    <section className="mt-6">
      {!exercisesActivated ? (
        <div className="flex flex-col items-center gap-2">
          <Button
            size="lg"
            className="mt-6 min-h-[44px] w-full max-w-xs"
            disabled={!hasListenedEnough}
            aria-disabled={!hasListenedEnough}
            title={
              !hasListenedEnough
                ? 'Listen to at least half the audio to unlock exercises'
                : undefined
            }
            onClick={() => setExercisesActivated(true)}
          >
            Start Exercises
          </Button>
          {!hasListenedEnough && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Listen to at least half the audio to unlock exercises.
            </p>
          )}
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            key="exercises"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            {/* Section header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Exercises
              </h2>
              <p className="text-sm text-muted-foreground">
                {answeredCount} of {total} answered
              </p>
            </div>

            {/* Exercise cards */}
            {questions.map((question, index) => {
              const questionNumber = index + 1;

              return (
                <Card key={question.id}>
                  <CardContent className="p-6">
                    {question.exerciseType === 'MULTIPLE_CHOICE' && (
                      <MultipleChoiceExercise
                        question={{
                          id: question.id,
                          exerciseType: question.exerciseType,
                          prompt: question.prompt,
                          answer: question.answer,
                          distractors: question.distractors,
                          explanation: question.explanation,
                          difficulty: 1,
                          xpReward: question.xpReward,
                        }}
                        onCorrect={() =>
                          handleAnswer(question.id, true, 'MULTIPLE_CHOICE')
                        }
                        onIncorrect={() =>
                          handleAnswer(question.id, false, 'MULTIPLE_CHOICE')
                        }
                      />
                    )}

                    {question.exerciseType === 'FILL_MISSING_WORDS' && (
                      <FillMissingWordsExercise
                        question={question}
                        questionNumber={questionNumber}
                        total={total}
                        onAnswer={(isCorrect) =>
                          handleAnswer(
                            question.id,
                            isCorrect,
                            'FILL_MISSING_WORDS',
                          )
                        }
                      />
                    )}

                    {question.exerciseType === 'DICTATION' && (
                      <DictationExercise
                        question={question}
                        questionNumber={questionNumber}
                        total={total}
                        onAnswer={(isCorrect) =>
                          handleAnswer(
                            question.id,
                            isCorrect,
                            'DICTATION',
                          )
                        }
                        onPlayClip={(startSec) => seek(startSec)}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Submit button */}
            <Button
              size="lg"
              className="mt-6 min-h-[44px] w-full"
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Exercises'
              )}
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
