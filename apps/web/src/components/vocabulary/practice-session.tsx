"use client";

/**
 * PracticeSession — session orchestrator (D-05, D-06, D-07, VOCAB-03)
 *
 * - Samples up to 10 words from the provided list (D-06)
 * - Assigns exercise types client-side (D-05): 6 types, ≤2 matching per session
 * - Tracks score, per-word correctness, and elapsed time in React state (no API calls mid-session)
 * - Shows shadcn Progress bar ("n of 10")
 * - On completion: POSTs one batch to /api/vocabulary/session/complete
 * - Then renders SessionResults with the wrong words + Add-to-SRS dialog
 *
 * Patterns: PATTERNS.md practice-session / profile-form client pattern
 */

import React, { useState, useRef, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { FlashcardExercise } from "./exercises/flashcard-exercise";
import { MatchingExercise } from "./exercises/matching-exercise";
import { ClozeExercise } from "./exercises/cloze-exercise";
import { ContextSelectionExercise } from "./exercises/context-selection-exercise";
import { SynonymExercise } from "./exercises/synonym-exercise";
import { RecallExercise } from "./exercises/recall-exercise";
import { SessionResults } from "./session-results";
import { assignExerciseTypes, type ExerciseAssignment } from "@/lib/exercise-assignment";
import type { VocabularyWordDto } from "@repo/shared";

const SESSION_SIZE = 10;

interface Answer {
  wordId: string;
  exerciseType: string;
  isCorrect: boolean;
}

interface Props {
  words: VocabularyWordDto[];
  categorySlug: string;
}

/**
 * Sample up to SESSION_SIZE words randomly from the list.
 */
function sampleWords(words: VocabularyWordDto[], size: number): VocabularyWordDto[] {
  if (words.length <= size) return [...words];
  return shuffle([...words]).slice(0, size);
}

/**
 * Build cloze sentence: replace the target word with "___" in the first example.
 * Falls back to a generic sentence if no examples available.
 */
function buildClozeData(word: VocabularyWordDto): {
  sentence: string;
  options: string[];
} {
  const example = word.examples[0] ?? `The word "${word.word}" is used in context.`;
  // Replace the word (case-insensitive) with ___
  const sentence = example.replace(new RegExp(`\\b${word.word}\\b`, "gi"), "___");
  const wrongOptions = word.synonyms.slice(0, 2);
  // Pad with generic distractors if needed
  const distractors = ["understand", "create", "develop", "achieve", "maintain"];
  while (wrongOptions.length < 3) {
    const d = distractors.find((x) => !wrongOptions.includes(x) && x !== word.word);
    if (d) wrongOptions.push(d);
    else break;
  }
  const options = shuffle([word.word, ...wrongOptions.slice(0, 3)]);
  return { sentence, options };
}

/**
 * Build synonym options for the synonym exercise.
 */
function buildSynonymData(word: VocabularyWordDto, allWords: VocabularyWordDto[]): {
  options: string[];
  correctSynonym: string;
} {
  const correctSynonym = word.synonyms[0] ?? word.word;
  const wrongWords = allWords
    .filter((w) => w.id !== word.id)
    .slice(0, 3)
    .map((w) => w.word);
  const options = shuffle([correctSynonym, ...wrongWords]);
  return { options, correctSynonym };
}

/**
 * Build context sentences for context-selection exercise.
 */
function buildContextData(word: VocabularyWordDto, allWords: VocabularyWordDto[]): {
  sentences: string[];
  correctIndex: number;
} {
  const correctSentence =
    word.examples[0] ?? `She used the word "${word.word}" in her essay.`;
  const wrongSentences = allWords
    .filter((w) => w.id !== word.id && w.examples[0])
    .slice(0, 3)
    .map((w) => w.examples[0] ?? `The term relates to ${w.word}.`);
  while (wrongSentences.length < 3) {
    wrongSentences.push(`This sentence does not use the word "${word.word}" correctly.`);
  }
  const shuffled = shuffle([correctSentence, ...wrongSentences]);
  const correctIndex = shuffled.indexOf(correctSentence);
  return { sentences: shuffled, correctIndex };
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function PracticeSession({ words, categorySlug }: Props) {
  const sessionWords = useRef<VocabularyWordDto[]>(sampleWords(words, SESSION_SIZE));
  const assignments = useRef<ExerciseAssignment[]>(
    assignExerciseTypes(sessionWords.current.length),
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const startTime = useRef<number>(Date.now());
  // Stable ref for matching exercise correct IDs — avoids stale closure bug
  const matchingCorrectIds = useRef(new Set<string>());

  // Reset matching correct IDs when the step changes
  useEffect(() => {
    matchingCorrectIds.current = new Set();
  }, [stepIndex]);

  // Flatten assignments into individual question steps
  // Each matching assignment counts as one "step" covering 4 words
  const steps = assignments.current;
  const totalSteps = steps.length;

  // For progress calculation: count words answered so far
  const totalWords = sessionWords.current.length;
  const answeredWords = answers.length;

  const currentStep = steps[stepIndex];

  const handleCorrect = (wordId: string, exerciseType: string) => {
    const newAnswers = [...answers, { wordId, exerciseType, isCorrect: true }];
    setAnswers(newAnswers);
    advanceStep(newAnswers);
  };

  const handleIncorrect = (wordId: string, exerciseType: string) => {
    const newAnswers = [...answers, { wordId, exerciseType, isCorrect: false }];
    setAnswers(newAnswers);
    advanceStep(newAnswers);
  };

  const handleMatchingComplete = (wordIds: string[], correctIds: Set<string>) => {
    const newBatch: Answer[] = wordIds.map((wordId) => ({
      wordId,
      exerciseType: "matching",
      isCorrect: correctIds.has(wordId),
    }));
    const newAnswers = [...answers, ...newBatch];
    setAnswers(newAnswers);
    advanceStep(newAnswers);
  };

  const advanceStep = (currentAnswers: Answer[]) => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= totalSteps) {
      // Session done — submit batch
      void submitSession(currentAnswers);
    } else {
      setStepIndex(nextIndex);
    }
  };

  const submitSession = async (finalAnswers: Answer[]) => {
    setSubmitting(true);
    setSubmitError("");
    const timeTakenMs = Date.now() - startTime.current;
    try {
      await fetch("/api/vocabulary/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug,
          answers: finalAnswers,
          timeTakenMs,
        }),
      });
    } catch {
      // Non-blocking — session data is informational; still show results
    } finally {
      setSubmitting(false);
      setIsComplete(true);
    }
  };

  const score = answers.filter((a) => a.isCorrect).length;
  const wrongWords = sessionWords.current.filter((w) =>
    answers.some((a) => a.wordId === w.id && !a.isCorrect),
  );
  const timeTakenMs = Date.now() - startTime.current;

  // Session complete — show results
  if (isComplete) {
    return (
      <SessionResults
        score={score}
        total={answers.length}
        timeTakenMs={timeTakenMs}
        wrongWords={wrongWords}
        categorySlug={categorySlug}
        onRestart={() => {
          // Re-sample and restart
          sessionWords.current = sampleWords(words, SESSION_SIZE);
          assignments.current = assignExerciseTypes(sessionWords.current.length);
          setStepIndex(0);
          setAnswers([]);
          setIsComplete(false);
          setSubmitError("");
          startTime.current = Date.now();
        }}
      />
    );
  }

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">No more steps.</p>
      </div>
    );
  }

  const stepNumber = Math.min(answeredWords + 1, totalWords);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p
            className="text-sm text-muted-foreground"
            aria-label="Session progress"
          >
            {stepNumber} of {totalWords}
          </p>
          {submitting && (
            <p className="text-xs text-muted-foreground">Saving...</p>
          )}
        </div>
        <Progress
          value={(answeredWords / totalWords) * 100}
          aria-label="Session progress"
          className="h-2"
        />
      </div>

      {/* Exercise card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm min-h-[280px]">
        {renderStep(
          currentStep,
          sessionWords.current,
          words,
          handleCorrect,
          handleIncorrect,
          handleMatchingComplete,
          matchingCorrectIds,
        )}
      </div>

      {submitError && (
        <p className="text-sm text-destructive text-center">{submitError}</p>
      )}
    </div>
  );
}

function renderStep(
  step: ExerciseAssignment,
  sessionWords: VocabularyWordDto[],
  allWords: VocabularyWordDto[],
  onCorrect: (wordId: string, type: string) => void,
  onIncorrect: (wordId: string, type: string) => void,
  onMatchingComplete: (wordIds: string[], correctIds: Set<string>) => void,
  matchingCorrectIds: React.MutableRefObject<Set<string>>,
): React.ReactNode {
  if (step.type === "matching") {
    const pairs = step.wordIndices.map((i) => {
      const word = sessionWords[i]!;
      return { wordId: word.id, word: word.word, definition: word.definition };
    });
    return (
      <MatchingExercise
        pairs={pairs}
        onPairResult={(wordId, isCorrect) => {
          if (isCorrect) matchingCorrectIds.current.add(wordId);
        }}
        onComplete={() => {
          onMatchingComplete(
            pairs.map((p) => p.wordId),
            matchingCorrectIds.current,
          );
        }}
      />
    );
  }

  const word = sessionWords[step.wordIndex]!;

  switch (step.type) {
    case "flashcard":
      return (
        <FlashcardExercise
          word={word.word}
          definition={word.definition}
          onCorrect={() => onCorrect(word.id, "flashcard")}
          onIncorrect={() => onIncorrect(word.id, "flashcard")}
        />
      );

    case "cloze": {
      const { sentence, options } = buildClozeData(word);
      return (
        <ClozeExercise
          sentence={sentence}
          blankedWord={word.word}
          options={options}
          onCorrect={() => onCorrect(word.id, "cloze")}
          onIncorrect={() => onIncorrect(word.id, "cloze")}
        />
      );
    }

    case "context-selection": {
      const { sentences, correctIndex } = buildContextData(word, allWords);
      return (
        <ContextSelectionExercise
          word={word.word}
          sentences={sentences}
          correctIndex={correctIndex}
          onCorrect={() => onCorrect(word.id, "context-selection")}
          onIncorrect={() => onIncorrect(word.id, "context-selection")}
        />
      );
    }

    case "synonym": {
      const { options, correctSynonym } = buildSynonymData(word, allWords);
      return (
        <SynonymExercise
          word={word.word}
          options={options}
          correctSynonym={correctSynonym}
          onCorrect={() => onCorrect(word.id, "synonym")}
          onIncorrect={() => onIncorrect(word.id, "synonym")}
        />
      );
    }

    case "recall":
      return (
        <RecallExercise
          definition={word.definition}
          word={word.word}
          onCorrect={() => onCorrect(word.id, "recall")}
          onIncorrect={() => onIncorrect(word.id, "recall")}
        />
      );

    default:
      return null;
  }
}
