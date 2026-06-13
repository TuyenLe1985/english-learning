"use client";

/**
 * MatchingExercise — 4-item tap grid (D-08)
 *
 * 4 words (left) × 4 shuffled definitions (right).
 * Tap a word chip → tap a definition chip → evaluates the pair.
 * Correct: both animate out (opacity/scale 0.3s easeOut).
 * Incorrect: shake animation (x: [0,-6,6,-6,0] 0.3s) then deselect.
 * All 4 matched → onComplete() fires.
 *
 * UI-SPEC:
 * - word chips: bg-secondary default, bg-primary text-primary-foreground when selected
 * - definition chips: bg-secondary default
 * - correct pair: opacity 0, scale 0.9, 0.3s easeOut
 * - incorrect: shake x:[0,-6,6,-6,0] 0.3s easeInOut then deselect
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MatchPair {
  wordId: string;
  word: string;
  definition: string;
}

interface Props {
  /** Exactly 4 pairs for the matching grid */
  pairs: MatchPair[];
  onComplete: () => void;
  /** Called once per pair with whether the pair was correct */
  onPairResult?: (wordId: string, isCorrect: boolean) => void;
}

export function MatchingExercise({ pairs, onComplete, onPairResult }: Props) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [shakeIds, setShakeIds] = useState<Set<string>>(new Set());
  const [shuffledDefs, setShuffledDefs] = useState<MatchPair[]>([]);

  // Shuffle definitions on mount using Fisher-Yates for uniform distribution
  useEffect(() => {
    const arr = [...pairs];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    setShuffledDefs(arr);
  }, [pairs]);

  const handleWordTap = (wordId: string) => {
    if (matchedIds.has(wordId) || shakeIds.size > 0) return;
    setSelectedWord((prev) => (prev === wordId ? null : wordId));
  };

  const handleDefTap = (defWordId: string) => {
    if (!selectedWord || matchedIds.has(defWordId) || shakeIds.size > 0) return;

    if (selectedWord === defWordId) {
      // Correct match
      const newMatched = new Set(matchedIds).add(defWordId);
      setMatchedIds(newMatched);
      setSelectedWord(null);
      onPairResult?.(defWordId, true);

      if (newMatched.size === pairs.length) {
        setTimeout(() => onComplete(), 400);
      }
    } else {
      // Incorrect match — shake both, then deselect
      const shakingIds = new Set([selectedWord, defWordId]);
      setShakeIds(shakingIds);
      onPairResult?.(selectedWord, false);
      setTimeout(() => {
        setShakeIds(new Set());
        setSelectedWord(null);
      }, 400);
    }
  };

  const shakeVariants = {
    shake: {
      x: [0, -6, 6, -6, 0],
      transition: { duration: 0.3, ease: "easeInOut" as const },
    },
    rest: { x: 0 },
  };

  const dismissVariants = {
    visible: { opacity: 1, scale: 1 },
    dismissed: {
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.3, ease: "easeOut" as const },
    },
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <p className="mb-4 text-sm text-muted-foreground text-center">
        Match each word with its definition
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Left column — word chips */}
        <div className="flex flex-col gap-2">
          {pairs.map((pair) => {
            const isMatched = matchedIds.has(pair.wordId);
            const isSelected = selectedWord === pair.wordId;
            const isShaking = shakeIds.has(pair.wordId);

            return (
              <AnimatePresence key={`word-${pair.wordId}`}>
                {!isMatched && (
                  <motion.button
                    key={`word-btn-${pair.wordId}`}
                    variants={isShaking ? shakeVariants : dismissVariants}
                    animate={isShaking ? "shake" : "visible"}
                    exit="dismissed"
                    role="button"
                    aria-selected={isSelected}
                    className={[
                      "min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium text-left transition-colors",
                      isSelected
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-secondary text-foreground hover:bg-secondary/80",
                    ].join(" ")}
                    onClick={() => handleWordTap(pair.wordId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleWordTap(pair.wordId);
                    }}
                  >
                    {pair.word}
                  </motion.button>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        {/* Right column — definition chips (shuffled) */}
        <div className="flex flex-col gap-2">
          {shuffledDefs.map((pair) => {
            const isMatched = matchedIds.has(pair.wordId);
            const isShaking = shakeIds.has(pair.wordId);

            return (
              <AnimatePresence key={`def-${pair.wordId}`}>
                {!isMatched && (
                  <motion.button
                    key={`def-btn-${pair.wordId}`}
                    variants={isShaking ? shakeVariants : dismissVariants}
                    animate={isShaking ? "shake" : "visible"}
                    exit="dismissed"
                    role="button"
                    aria-selected={false}
                    className="min-h-[44px] rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-left text-foreground hover:bg-secondary/80 transition-colors"
                    onClick={() => handleDefTap(pair.wordId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleDefTap(pair.wordId);
                    }}
                  >
                    {pair.definition}
                  </motion.button>
                )}
              </AnimatePresence>
            );
          })}
        </div>
      </div>
    </div>
  );
}
