"use client";

/**
 * QuizScoreCard — results display after quiz session completion (Screen 3, UI-SPEC).
 *
 * Framer Motion entrance: opacity 0→1, scale 0.95→1, 0.3s easeOut.
 * Score headline "{score}/10 correct" at text-[28px] font-semibold.
 * Sub-line: "{pct}% accuracy · +{xp} XP · {time}".
 * Per-skill breakdown table (Grammar/Vocabulary/Reading/Listening).
 * CTA buttons: "Review Mistakes" (primary, only if incorrect > 0), "Try Another Quiz" (outline), "Back to Quiz Center" (ghost).
 *
 * XP toast and level-up modal mount point: the parent (quiz/[sessionId]/results/page.tsx)
 * passes completeResponse; gamification overlays (07-06) will be wired here.
 */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SessionAnswer } from "@/components/quiz/quiz-question";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillBreakdownRow {
  label: string;
  correct: number;
  attempted: number;
}

interface QuizScoreCardProps {
  sessionId: string;
  score: number;
  total: number;
  accuracy: number;
  xpEarned: number;
  timeTakenSec: number;
  answers: SessionAnswer[];
  incorrectCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function buildSkillBreakdown(answers: SessionAnswer[]): SkillBreakdownRow[] {
  const skills = [
    { key: "GRAMMAR" as const, label: "Grammar" },
    { key: "VOCABULARY" as const, label: "Vocabulary" },
    { key: "READING" as const, label: "Reading" },
    { key: "LISTENING" as const, label: "Listening" },
  ];

  return skills.map(({ key, label }) => {
    const forSkill = answers.filter((a) => a.skillArea === key);
    const correct = forSkill.filter((a) => a.isCorrect).length;
    return { label, correct, attempted: forSkill.length };
  });
}

// ─── QuizScoreCard ────────────────────────────────────────────────────────────

export function QuizScoreCard({
  sessionId,
  score,
  total,
  accuracy,
  xpEarned,
  timeTakenSec,
  answers,
  incorrectCount,
}: QuizScoreCardProps) {
  const router = useRouter();
  const rows = buildSkillBreakdown(answers);
  const pct = Math.round(accuracy);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto max-w-lg mt-8"
      role="region"
      aria-label="Quiz results"
    >
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {/* Score headline — 28px semibold per UI-SPEC Typography (Display) */}
          <div className="text-center">
            <p className="text-[28px] font-semibold text-foreground text-center">
              {score}/{total} correct
            </p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {pct}% accuracy · +{xpEarned} XP · {formatTime(timeTakenSec)}
            </p>
          </div>

          {/* Per-skill breakdown table */}
          <dl className="flex flex-col gap-2">
            {rows.map(({ label, correct, attempted }) => (
              <div
                key={label}
                className="flex items-center justify-between text-sm"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-foreground font-medium">
                  {correct}/{attempted}
                </dd>
              </div>
            ))}
          </dl>

          {/* TODO(07-06): XP toast + level-up modal mount point */}
          {/* Mount point: QuizCompleteResponseDto is available from the parent page.
              07-06 will add: <XpToast xpAmount={xpEarned} /> and <LevelUpModal /> here */}

          {/* CTA buttons (stacked, full-width) */}
          <div className="flex flex-col gap-3 mt-2">
            {incorrectCount > 0 && (
              <Button
                variant="default"
                size="lg"
                className="min-h-[44px] w-full"
                onClick={() =>
                  router.push(`/quiz/${sessionId}/results/mistakes`)
                }
              >
                Review Mistakes
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="min-h-[44px] w-full"
              onClick={() => router.push("/quiz")}
            >
              Try Another Quiz
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="min-h-[44px] w-full"
              onClick={() => router.push("/quiz")}
            >
              Back to Quiz Center
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
