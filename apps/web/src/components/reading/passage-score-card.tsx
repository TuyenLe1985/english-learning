"use client";

/**
 * PassageScoreCard — inline score card with framer-motion entrance.
 *
 * Appears below the last question after all comprehension questions are answered.
 * No redirect — user stays on passage page per D-04.
 *
 * UI-SPEC §2d: opacity 0→1, scale 0.95→1, duration 0.3s easeOut.
 * Copywriting: "{score}/{total} correct", "{pct}% · {readingTime}",
 *              "Try another passage" (primary), "Browse all passages" (outline).
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PassageScoreCardProps {
  score: number;
  total: number;
  readingTimeSec: number;
  passageId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PassageScoreCard({
  score,
  total,
  readingTimeSec,
}: PassageScoreCardProps) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto max-w-lg mt-8"
    >
      <Card>
        <CardContent className="flex flex-col items-center gap-6 px-6 py-8 text-center">
          {/* Score headline — UI-SPEC display size */}
          <div>
            <p className="text-[28px] font-semibold leading-tight text-foreground">
              {score}/{total} correct
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {pct}% · {formatTime(readingTimeSec)} reading time
            </p>
          </div>

          {/* CTAs — both link to /reading (D-04: no redirect away from current page) */}
          <div className="flex w-full flex-col gap-3">
            <Link
              href="/reading"
              className={cn(buttonVariants({ variant: "default" }), "min-h-[44px] w-full")}
            >
              Try another passage
            </Link>
            <Link
              href="/reading"
              className={cn(buttonVariants({ variant: "outline" }), "min-h-[44px] w-full")}
            >
              Browse all passages
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
