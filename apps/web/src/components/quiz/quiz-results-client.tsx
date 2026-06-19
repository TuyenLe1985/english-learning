"use client";

/**
 * QuizResultsClient — results page client orchestrator.
 *
 * Reads the stored QuizCompleteResponseDto + answers from sessionStorage
 * (keyed `quiz-result-{sessionId}`, stored by QuizSession on submit).
 * Renders QuizScoreCard with the result data.
 *
 * Gamification overlays (07-06):
 *   - XpToast: fires on mount with xpEarned, always visible after quiz
 *   - Achievement toasts: fire 500ms after XP toast for each newAchievement
 *   - LevelUpModal: appears ~1s after mount if levelUp is true
 *
 * Error state: if sessionStorage entry is missing (e.g., direct URL navigation),
 * shows a recovery message with a link back to /quiz.
 *
 * Achievement Toast Sequencing (UI-SPEC):
 *   1. XP toast fires first (bottom-right, z-50)
 *   2. Achievement toast(s) fire 500ms after XP toast (stacked above, z-51)
 *   3. Level-up modal fires ~1s after if levelUp=true
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizScoreCard } from "@/components/quiz/quiz-score-card";
import { XpToast } from "@/components/gamification/xp-toast";
import { LevelUpModal } from "@/components/gamification/level-up-modal";
import type { SessionAnswer } from "@/components/quiz/quiz-question";
import type { QuizCompleteResponseDto, AchievementDto } from "@repo/shared";

// ─── Achievement Toast (inline — reuses XpToast styling) ─────────────────────

interface AchievementToastProps {
  achievement: AchievementDto;
  index: number; // stacking offset above XP toast
  onDismiss: () => void;
}

function AchievementToast({ achievement, index, onDismiss }: AchievementToastProps) {
  // Delay each achievement toast by: 500ms + (index * 150ms)
  const [show, setShow] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setShow(true), 500 + index * 150);
    const hideTimer = setTimeout(() => {
      setShow(false);
      onDismiss();
    }, 500 + index * 150 + 4000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [index, onDismiss]);

  if (!show) return null;

  return (
    // z-51 to stack above XP toast (z-50), offset upward by index
    <div
      className="fixed right-4 z-[51] rounded-lg bg-emerald-600 px-4 py-3 text-white shadow-lg cursor-pointer select-none text-sm font-semibold"
      style={{ bottom: `calc(1rem + 56px + ${index * 52}px)` }}
      role="status"
      aria-live="polite"
      onClick={() => { setShow(false); onDismiss(); }}
    >
      {achievement.name} unlocked
    </div>
  );
}

// ─── Stored result shape ──────────────────────────────────────────────────────

interface StoredQuizResult {
  result: QuizCompleteResponseDto;
  answers: SessionAnswer[];
  timeTakenSec: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuizResultsClientProps {
  sessionId: string;
}

// ─── QuizResultsClient ────────────────────────────────────────────────────────

export function QuizResultsClient({ sessionId }: QuizResultsClientProps) {
  const router = useRouter();
  const [stored, setStored] = useState<StoredQuizResult | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [dismissedAchievements, setDismissedAchievements] = useState<Set<string>>(new Set());

  useEffect(() => {
    const raw = sessionStorage.getItem(`quiz-result-${sessionId}`);
    if (!raw) {
      setLoadError(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as StoredQuizResult;
      setStored(parsed);
    } catch {
      setLoadError(true);
    }
  }, [sessionId]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-base text-muted-foreground">
          Results not found. The session may have expired.
        </p>
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

  if (!stored) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { result, answers, timeTakenSec } = stored;
  const incorrectCount = result.incorrectAnswers?.length ?? 0;
  const newAchievements: AchievementDto[] = result.newAchievements ?? [];
  const visibleAchievements = newAchievements.filter(
    (a) => !dismissedAchievements.has(a.id),
  );

  return (
    <>
      {/* Gamification overlays — appear on mount */}
      {/* XP toast: always shown after quiz (z-50, bottom-right) */}
      <XpToast xpAmount={result.xpEarned} />

      {/* Achievement toasts: fire 500ms after XP toast, stacked above (z-51) */}
      {visibleAchievements.map((achievement, idx) => (
        <AchievementToast
          key={achievement.id}
          achievement={achievement}
          index={idx}
          onDismiss={() =>
            setDismissedAchievements((prev) => new Set([...prev, achievement.id]))
          }
        />
      ))}

      {/* Level-up modal: appears ~1s after mount, only when levelUp is true */}
      {result.levelUp && <LevelUpModal newLevel={result.newLevel} />}

      {/* Score card */}
      <QuizScoreCard
        sessionId={sessionId}
        score={result.score}
        total={10}
        accuracy={result.accuracy}
        xpEarned={result.xpEarned}
        timeTakenSec={timeTakenSec}
        answers={answers}
        incorrectCount={incorrectCount}
      />
    </>
  );
}
