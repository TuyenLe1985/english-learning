"use client";

/**
 * SessionResults — end-of-session results screen (D-07, VOCAB-04)
 *
 * Shows:
 * - Score "X/10 correct" (Display 28/600)
 * - Time taken
 * - List of incorrect/uncertain words
 * - shadcn Dialog: "Add to review schedule?" with per-word checkboxes
 *   Confirm: "Add to review schedule" | Cancel: "Skip"
 *
 * On dialog confirm, enrolls each selected word via POST /api/vocabulary/enroll.
 *
 * Key links:
 *   session-results → /api/vocabulary/enroll (Add to SRS dialog confirm)
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { VocabularyWordDto } from "@repo/shared";

interface SessionResultsProps {
  score: number;
  total: number;
  timeTakenMs: number;
  /** Words the user got wrong or self-rated as incorrect */
  wrongWords: VocabularyWordDto[];
  categorySlug: string;
  onRestart?: () => void;
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

export function SessionResults({
  score,
  total,
  timeTakenMs,
  wrongWords,
  onRestart,
}: SessionResultsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    new Set(wrongWords.map((w) => w.id)),
  );
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [toast, setToast] = useState("");

  const toggleWord = (wordId: string) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const handleEnrollConfirm = async () => {
    if (enrolling) return;
    setEnrolling(true);
    setEnrollError("");

    const wordsToEnroll = wrongWords.filter((w) => selectedWordIds.has(w.id));

    try {
      await Promise.all(
        wordsToEnroll.map((w) =>
          fetch("/api/vocabulary/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wordId: w.id }),
          }),
        ),
      );
      setEnrolled(true);
      setDialogOpen(false);
      setToast(`${wordsToEnroll.length} word${wordsToEnroll.length !== 1 ? "s" : ""} added to your review schedule`);
      setTimeout(() => setToast(""), 5000);
    } catch {
      setEnrollError("Couldn't add to review schedule. Try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const percentage = Math.round((score / total) * 100);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mx-auto flex max-w-lg flex-col items-center gap-8 py-8"
      >
        {/* Score display */}
        <div className="text-center">
          <p className="mb-2 text-sm text-muted-foreground">Session complete!</p>
          <p className="text-[28px] font-semibold text-foreground">
            {score}/{total} correct
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {percentage}% · {formatTime(timeTakenMs)}
          </p>
        </div>

        {/* Wrong words list */}
        {wrongWords.length > 0 ? (
          <div className="w-full">
            <p className="mb-3 text-sm font-semibold text-foreground">
              Words to review ({wrongWords.length})
            </p>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {wrongWords.map((word) => (
                <div key={word.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{word.word}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {word.definition}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {!enrolled && (
              <Button
                onClick={() => setDialogOpen(true)}
                className="mt-4 w-full min-h-[44px]"
              >
                Add to review schedule?
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card px-6 py-8 text-center">
            <p className="text-lg font-semibold text-foreground">Perfect score!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You got all {total} words correct.
            </p>
          </div>
        )}

        {/* Restart button */}
        {onRestart && (
          <Button variant="outline" onClick={onRestart} className="w-full min-h-[44px]">
            Practice again
          </Button>
        )}
      </motion.div>

      {/* Add to SRS Dialog (D-07) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to review schedule?</DialogTitle>
            <DialogDescription>
              Select the words you want to add to your spaced repetition review schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-2">
            {wrongWords.map((word) => (
              <label
                key={word.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedWordIds.has(word.id)}
                  onChange={() => toggleWord(word.id)}
                  className="h-4 w-4 rounded border-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{word.word}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {word.definition}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {enrollError && (
            <p className="text-sm text-destructive">{enrollError}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="min-h-[44px]"
            >
              Skip
            </Button>
            <Button
              onClick={handleEnrollConfirm}
              disabled={enrolling || selectedWordIds.size === 0}
              className="min-h-[44px]"
            >
              {enrolling ? "Adding..." : "Add to review schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
