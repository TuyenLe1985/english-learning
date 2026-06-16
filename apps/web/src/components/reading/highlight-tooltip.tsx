"use client";

/**
 * HighlightTooltip — floating pill that appears on text selection to save highlights.
 *
 * UI-SPEC §2f: dark pill tooltip at selection endpoint, Highlighter icon + "Highlight" label.
 * On click: POST /api/reading/highlights → NestJS, calls onSaved on success.
 * Dismisses on outside click (D-07).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Highlighter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { HighlightDto } from "@repo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectionState {
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
}

interface Props {
  selection: SelectionState | null;
  position: { x: number; y: number } | null;
  passageId: string;
  onSaved: (highlight: HighlightDto) => void;
  onDismiss: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HighlightTooltip({
  selection,
  position,
  passageId,
  onSaved,
  onDismiss,
}: Props) {
  const { toast } = useToast();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  // ─── Dismiss on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!selection || !position) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    // Slight delay to avoid immediately triggering from the same mouseup event
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [selection, position, onDismiss]);

  // ─── Save highlight ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selection || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/reading/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageId,
          startOffset: selection.start,
          endOffset: selection.end,
          text: selection.text,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const highlight = (await res.json()) as HighlightDto;
      // Clear browser selection
      window.getSelection()?.removeAllRanges();
      onSaved(highlight);
    } catch {
      toast({
        variant: "destructive",
        description: "Could not save highlight. Try again.",
      });
      onDismiss();
    } finally {
      setSaving(false);
    }
  }, [selection, saving, passageId, onSaved, onDismiss, toast]);

  if (!selection || !position) return null;

  // ─── Position: fixed relative to viewport ──────────────────────────────────
  // Offset slightly above the selection endpoint for better UX
  const top = position.y + window.scrollY + 8;
  const left = position.x;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      style={{
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 50,
        transform: "translateX(-50%)",
      }}
    >
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
        aria-label="Save highlight"
      >
        <Highlighter className="h-3.5 w-3.5" />
        <span>{saving ? "Saving..." : "Highlight"}</span>
      </button>
    </div>
  );
}
