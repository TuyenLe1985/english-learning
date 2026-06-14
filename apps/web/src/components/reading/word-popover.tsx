"use client";

/**
 * WordPopover — vocabulary lookup + SRS enrollment popover.
 *
 * Opens on word tap from PassageRenderer (D-14 / VOCAB-08).
 * Fetches GET /api/vocabulary/lookup?word={word} on mount.
 * Shows definition (or graceful no-match fallback per D-13).
 * "Add to SRS" button: calls POST /api/vocabulary/enroll (relay → NestJS POST /api/srs/enroll).
 *   - Disabled if lookup returns null (no wordId available — Pitfall 5).
 *   - Disabled after successful enrollment (T-05-08-03: prevents duplicate enrollment).
 *
 * UI-SPEC §2e: 280px max width, word/POS/definition/context/separator/CTA layout.
 * Security: T-05-08-01 — button never sends enrollment without a valid wordId.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { VocabularyWordDto } from "@repo/shared";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WordPopoverProps {
  word: string;
  contextSentence: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

// ─── Lookup state ─────────────────────────────────────────────────────────────

type LookupState = "loading" | VocabularyWordDto | null;

// ─── Context sentence renderer ────────────────────────────────────────────────

/**
 * Renders the context sentence with the target word bolded.
 * Uses a simple split approach — highlights first occurrence of word.
 */
function ContextSentenceDisplay({
  sentence,
  word,
}: {
  sentence: string;
  word: string;
}) {
  const lower = sentence.toLowerCase();
  const wordLower = word.toLowerCase();
  const idx = lower.indexOf(wordLower);
  if (idx === -1) {
    return (
      <span className="block rounded bg-muted px-2 py-1 text-xs text-muted-foreground mt-1">
        {sentence}
      </span>
    );
  }

  const before = sentence.slice(0, idx);
  const match = sentence.slice(idx, idx + word.length);
  const after = sentence.slice(idx + word.length);

  return (
    <span className="block rounded bg-muted px-2 py-1 text-xs text-muted-foreground mt-1">
      {before}
      <span className="font-semibold">{match}</span>
      {after}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WordPopover({
  word,
  contextSentence,
  anchorEl,
  onClose,
}: WordPopoverProps) {
  const [lookupResult, setLookupResult] = useState<LookupState>("loading");
  const [enrolled, setEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Position state for the floating popover
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // ── Position the popover near the anchor element ──────────────────────────
  useEffect(() => {
    if (!anchorEl) return;

    const rect = anchorEl.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Prefer above the word; adjust if too close to viewport top
    const popoverHeight = 280; // estimated max height
    const preferredTop = rect.top + scrollY - popoverHeight - 8;
    const fallbackTop = rect.bottom + scrollY + 8;

    const top = rect.top + scrollY - popoverHeight - 8 < scrollY
      ? fallbackTop
      : preferredTop;

    // Clamp horizontally to keep within viewport
    const viewportWidth = window.innerWidth;
    const popoverWidth = 280;
    let left = rect.left + scrollX;
    if (left + popoverWidth > viewportWidth + scrollX) {
      left = viewportWidth + scrollX - popoverWidth - 8;
    }
    if (left < scrollX + 8) {
      left = scrollX + 8;
    }

    setPosition({ top, left });
  }, [anchorEl]);

  // ── Vocabulary lookup on mount (or when word changes) ────────────────────
  useEffect(() => {
    if (!word) return;
    setLookupResult("loading");
    setEnrolled(false);

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/vocabulary/lookup?word=${encodeURIComponent(word)}`,
          { credentials: "include" },
        );
        if (cancelled) return;
        if (!res.ok) {
          setLookupResult(null);
          return;
        }
        const data: VocabularyWordDto | null = await res.json() as VocabularyWordDto | null;
        if (!cancelled) setLookupResult(data);
      } catch {
        if (!cancelled) setLookupResult(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [word]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [anchorEl, onClose]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // ── SRS enrollment handler ────────────────────────────────────────────────
  const handleEnroll = useCallback(async () => {
    if (
      lookupResult === "loading" ||
      lookupResult === null ||
      enrolled ||
      enrollLoading
    ) {
      return;
    }

    // T-05-08-01: Only enroll when we have a valid wordId
    const wordId = lookupResult.id;
    setEnrollLoading(true);

    try {
      const res = await fetch("/api/vocabulary/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wordId, contextSentence }),
      });

      if (res.status === 409) {
        // Already enrolled — treat as success
        setEnrolled(true);
        return;
      }

      if (!res.ok) {
        const err: unknown = await res.json().catch(() => null);
        const message =
          err && typeof err === "object" && "error" in err
            ? String((err as { error: unknown }).error)
            : "Could not add to SRS. Try again.";
        toast({ title: message, variant: "destructive" });
        return;
      }

      setEnrolled(true);
    } catch {
      toast({ title: "Could not add to SRS. Try again.", variant: "destructive" });
    } finally {
      setEnrollLoading(false);
    }
  }, [lookupResult, enrolled, enrollLoading, contextSentence, toast]);

  // ── Don't render until positioned ────────────────────────────────────────
  if (!position) return null;

  // Word found indicator (helps TypeScript narrow the union)
  const wordFound =
    lookupResult !== "loading" && lookupResult !== null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`Definition of "${word}"`}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        width: "280px",
        zIndex: 50,
      }}
      className="rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
    >
      {/* ── Loading state ── */}
      {lookupResult === "loading" && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}

      {/* ── Word found ── */}
      {wordFound && lookupResult !== null && (
        <>
          {/* Word + POS */}
          <div className="mb-1">
            <span className="text-sm font-semibold text-foreground">
              {lookupResult.word}
            </span>
            {lookupResult.partOfSpeech && (
              <span className="ml-1 text-xs italic text-muted-foreground">
                {lookupResult.partOfSpeech}
              </span>
            )}
          </div>

          {/* Definition */}
          <p className="text-sm text-foreground">{lookupResult.definition}</p>

          {/* Context sentence */}
          <ContextSentenceDisplay
            sentence={contextSentence}
            word={word}
          />
        </>
      )}

      {/* ── Word not found ── */}
      {lookupResult === null && (
        <>
          <p className="text-sm font-semibold text-foreground">{word}</p>
          <p className="mt-1 text-sm italic text-muted-foreground">
            Definition not yet in our vocabulary library
          </p>
          {/* Context sentence still shown */}
          <ContextSentenceDisplay
            sentence={contextSentence}
            word={word}
          />
        </>
      )}

      {/* ── Separator + CTA ── */}
      {lookupResult !== "loading" && (
        <>
          <Separator className="my-3" />

          {/* After successful enrollment */}
          {enrolled ? (
            <div className="flex min-h-[44px] w-full items-center justify-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <span>Added to SRS</span>
            </div>
          ) : (
            <Button
              variant="default"
              className="min-h-[44px] w-full"
              disabled={lookupResult === null || enrollLoading}
              aria-disabled={lookupResult === null}
              onClick={() => { void handleEnroll(); }}
            >
              {enrollLoading ? "Adding..." : "Add to SRS"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
