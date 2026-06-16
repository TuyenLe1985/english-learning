"use client";

/**
 * PassageScoreCard — inline score display after all questions answered.
 *
 * Plan 05-07, D-04, READ-07:
 * - framer-motion entrance: opacity 0→1, scale 0.95→1, duration 0.3s (mirrors GrammarSessionResults)
 * - No redirect — user stays on page (D-04)
 * - Two CTA buttons: "Try another passage" + "Browse all passages" (both link to /reading)
 *
 * UI-SPEC §2d: Card, headline at 28px, sub-line at 14px muted, two full-width buttons.
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReadingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  score: number;
  total: number;
  readingTimeSec: number;
  passageId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PassageScoreCard({ score, total, readingTimeSec }: Props) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto mt-8 max-w-lg"
    >
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          {/* Score headline */}
          <div className="text-center">
            <p className="text-[28px] font-semibold leading-tight text-foreground">
              {score}/{total} correct
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {percentage}% · {formatReadingTime(readingTimeSec)} reading time
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex w-full flex-col gap-3">
            <Button asChild className="min-h-[44px] w-full">
              <Link href="/reading">Try another passage</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="min-h-[44px] w-full"
            >
              <Link href="/reading">Browse all passages</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
