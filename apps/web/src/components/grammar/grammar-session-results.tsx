"use client";

/**
 * GrammarSessionResults — end-of-session results screen for grammar lessons.
 *
 * Displays score, time, topic mastery progress bar, and action buttons.
 * No SRS dialog — grammar exercises do not feed SRS (D-07 grammar variant).
 *
 * UI-SPEC: Sub-state C — framer-motion entrance, Session complete!, score display,
 * mastery progress bar, "Practice again" + "Back to topic" buttons.
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface GrammarSessionResultsProps {
  score: number;
  total: number;
  masteryPct: number;
  timeTakenMs: number;
  onRestart?: () => void;
  onBackToTopic?: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function GrammarSessionResults({
  score,
  total,
  masteryPct,
  timeTakenMs,
  onRestart,
  onBackToTopic,
}: GrammarSessionResultsProps) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto flex max-w-lg flex-col items-center gap-8 py-8"
    >
      {/* Score display */}
      <div className="text-center">
        <p className="mb-2 text-sm text-muted-foreground">Session complete!</p>
        <p className="text-[28px] font-semibold leading-tight text-foreground">
          {score}/{total} correct
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {percentage}% · {formatTime(timeTakenMs)}
        </p>
      </div>

      {/* Topic mastery progress bar — grammar-specific */}
      <div className="w-full">
        <p className="mb-1 text-sm text-muted-foreground">Topic mastery</p>
        <Progress value={masteryPct} className="h-3" aria-label="Topic mastery" />
        <p className="mt-1 text-xs text-muted-foreground">
          {Math.round(masteryPct)}%
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex w-full flex-col gap-3">
        {onRestart && (
          <Button
            variant="outline"
            onClick={onRestart}
            className="w-full min-h-[44px]"
          >
            Practice again
          </Button>
        )}
        {onBackToTopic && (
          <Button
            variant="outline"
            onClick={onBackToTopic}
            className="w-full min-h-[44px]"
          >
            Back to topic
          </Button>
        )}
      </div>
    </motion.div>
  );
}
