"use client";

/**
 * WordPopover — vocabulary lookup popover for the passage reader (VOCAB-08 / D-14).
 *
 * Triggered when a user taps/clicks a <span data-word> in the passage body.
 * Fetches GET /api/vocabulary/lookup?word={word} on mount.
 *
 * Behaviour:
 * - Loading: shows 2-line skeleton while fetch resolves
 * - Word found (VocabularyWordDto): shows definition + context sentence + "Add to SRS" button
 * - Word not found (null): shows graceful fallback message + disabled "Add to SRS" button
 *   (Pitfall 5: EnrollWordSchema requires wordId; cannot enroll without it)
 *
 * After SRS enrollment: button replaced with "Added to SRS" + CheckCircle (disabled).
 * Security (T-05-08-01): "Add to SRS" button is disabled when lookupResult is null.
 * Security (T-05-08-03): enrolled state prevents duplicate POST /api/srs/enroll calls.
 *
 * Popover is positioned using PopoverAnchor (Radix primitive) with the anchorEl as
 * the virtual reference element. Radix handles viewport edge flipping automatically.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { VocabularyWordDto } from "@repo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WordPopoverProps {
  word: string;                  // normalized word (lowercase, no punctuation)
  contextSentence: string;       // extracted sentence containing the word (D-15)
  anchorEl: HTMLElement | null;  // the <span data-word> element (popover anchor)
  onClose: () => void;
}

type LookupState = "loading" | VocabularyWordDto | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Bold the target word within the context sentence display.
 * Finds the first occurrence (case-insensitive) and wraps it in font-semibold.
 */
function highlightWordInSentence(sentence: string, word: string): React.ReactNode {
  if (!sentence || !word) return sentence;

  const lowerSentence = sentence.toLowerCase();
  const lowerWord = word.toLowerCase();
  const idx = lowerSentence.indexOf(lowerWord);

  if (idx === -1) {
    return sentence;
  }

  return (
    <>
      {sentence.slice(0, idx)}
      <span className="font-semibold">{sentence.slice(idx, idx + word.length)}</span>
      {sentence.slice(idx + word.length)}
    </>
  );
}

// ─── WordAnchorPortal ─────────────────────────────────────────────────────────

/**
 * Renders a zero-size fixed span at the anchorEl's position.
 * Used as the PopoverAnchor child so Radix positions PopoverContent relative to the word span.
 */
function WordAnchorPortal({ anchorEl }: { anchorEl: HTMLElement | null }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!anchorEl) return;
    const updateRect = () => setRect(anchorEl.getBoundingClientRect());
    updateRect();

    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, [anchorEl]);

  if (!rect) return <span style={{ display: "none" }} />;

  return (
    <span
      aria-hidden="true"
      style={{
        position: "fixed",
        left: rect.left + rect.width / 2,
        top: rect.top,
        width: 0,
        height: rect.height,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── WordPopoverContent ───────────────────────────────────────────────────────

interface WordPopoverContentProps {
  word: string;
  contextSentence: string;
  lookupResult: VocabularyWordDto | null;
  enrolled: boolean;
  enrolling: boolean;
  onAddToSrs: () => void;
}

function WordPopoverContent({
  word,
  contextSentence,
  lookupResult,
  enrolled,
  enrolling,
  onAddToSrs,
}: WordPopoverContentProps) {
  const hasWord = lookupResult !== null;
  // T-05-08-01: Only enable Add to SRS when a valid wordId is available (Pitfall 5)
  const canEnroll = hasWord && Boolean(lookupResult.id);

  return (
    <div className="space-y-2">
      {/* Word + part of speech */}
      <div>
        <span className="text-sm font-semibold text-foreground">{word}</span>
        {hasWord && lookupResult.partOfSpeech && (
          <span className="ml-1.5 text-xs italic text-muted-foreground">
            {lookupResult.partOfSpeech}
          </span>
        )}
      </div>

      {/* Definition or graceful fallback (D-13) */}
      {hasWord ? (
        <p className="text-sm text-foreground">{lookupResult.definition}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Definition not yet in our vocabulary library
        </p>
      )}

      {/* Context sentence with target word bolded */}
      {contextSentence && (
        <p className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
          {highlightWordInSentence(contextSentence, word)}
        </p>
      )}

      <Separator />

      {/* Add to SRS button — disabled after enrollment (T-05-08-03) or when no wordId (T-05-08-01) */}
      {enrolled ? (
        <div className="flex min-h-[44px] w-full items-center justify-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <span>Added to SRS</span>
        </div>
      ) : (
        <Button
          variant="default"
          className="min-h-[44px] w-full"
          disabled={!canEnroll || enrolling}
          aria-disabled={!canEnroll || undefined}
          onClick={onAddToSrs}
        >
          {enrolling ? "Adding..." : "Add to SRS"}
        </Button>
      )}
    </div>
  );
}

// ─── WordPopover (main export) ────────────────────────────────────────────────

export function WordPopover({
  word,
  contextSentence,
  anchorEl,
  onClose,
}: WordPopoverProps) {
  const { toast } = useToast();
  const [lookupResult, setLookupResult] = useState<LookupState>("loading");
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const mountedRef = useRef(true);

  // ─── Vocabulary lookup on word change ───────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    setLookupResult("loading");
    setEnrolled(false);
    setEnrolling(false);

    if (!word) {
      setLookupResult(null);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/vocabulary/lookup?word=${encodeURIComponent(word)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!mountedRef.current) return;
        // 204 = word not found (graceful no-match per D-13)
        if (res.status === 204 || res.status === 404) {
          setLookupResult(null);
          return;
        }
        if (!res.ok) {
          setLookupResult(null);
          return;
        }
        const data = (await res.json()) as VocabularyWordDto | null;
        if (mountedRef.current) {
          setLookupResult(data ?? null);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (mountedRef.current) setLookupResult(null);
      });

    return () => {
      controller.abort();
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  // ─── Add to SRS handler ─────────────────────────────────────────────────
  const handleAddToSrs = useCallback(async () => {
    if (lookupResult === "loading" || lookupResult === null || enrolled || enrolling) return;

    setEnrolling(true);
    try {
      // Use the existing /api/vocabulary/enroll relay route (proxies to NestJS POST /api/srs/enroll)
      const res = await fetch("/api/vocabulary/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: lookupResult.id,
          contextSentence,
        }),
      });

      if (res.status === 409) {
        // Already enrolled — treat as success (T-05-08-03 idempotency)
        setEnrolled(true);
        toast({ description: "Already in your SRS queue" });
        return;
      }

      if (!res.ok) throw new Error(`SRS enroll failed: ${res.status}`);

      setEnrolled(true);
    } catch {
      toast({
        variant: "destructive",
        description: "Could not add to SRS. Try again.",
      });
    } finally {
      setEnrolling(false);
    }
  }, [lookupResult, enrolled, enrolling, contextSentence, toast]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Virtual anchor: zero-size fixed span at the word span's position.
          Radix uses this to position PopoverContent above/below the word. */}
      <PopoverAnchor asChild>
        <WordAnchorPortal anchorEl={anchorEl} />
      </PopoverAnchor>

      <PopoverContent
        className="max-w-[280px] p-3"
        side="top"
        align="center"
        sideOffset={8}
        onEscapeKeyDown={onClose}
        onInteractOutside={onClose}
        aria-label={`Word definition: ${word}`}
      >
        {lookupResult === "loading" ? (
          /* Loading state: 2-line skeleton per UI-SPEC §2e */
          <div
            className="space-y-2"
            aria-busy="true"
            aria-label="Loading definition"
          >
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <WordPopoverContent
            word={word}
            contextSentence={contextSentence}
            lookupResult={lookupResult}
            enrolled={enrolled}
            enrolling={enrolling}
            onAddToSrs={() => void handleAddToSrs()}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
