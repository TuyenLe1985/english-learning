"use client";

/**
 * HighlightTooltip — floating tooltip that appears on text selection in the passage body.
 *
 * Appearance: dark pill at selection endpoint (UI-SPEC §2f).
 * Behaviour:
 * - Shows Highlighter icon + "Highlight" label
 * - On click: POST /api/reading/highlights → calls onSaved with new HighlightDto
 * - On click outside: calls onDismiss
 * - On error: shows Toast error "Could not save highlight. Try again."
 *
 * Positioning: fixed, placed at {x, y} from mouseup event (scrollY-adjusted).
 * Security: T-05-07-01 — no user-controlled HTML rendered; offset integers posted to API.
 */

import React, { useEffect, useRef, useCallback } from "react";
import { Highlighter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { HighlightDto } from "@repo/shared";

// ─── Props ────────────────────────────────────────────────────────────────────

interface HighlightTooltipProps {
  selection: { start: number; end: number; text: string } | null;
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
}: HighlightTooltipProps) {
  const tooltipRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();

  // Dismiss on click outside
  useEffect(() => {
    if (!selection) return;

    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selection, onDismiss]);

  const handleHighlight = useCallback(async () => {
    if (!selection) return;

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
        throw new Error(`Highlight save failed: ${res.status}`);
      }

      const data = (await res.json()) as HighlightDto;
      onSaved(data);
    } catch {
      toast({
        title: "Could not save highlight. Try again.",
        variant: "destructive",
      });
      onDismiss();
    }
  }, [selection, passageId, onSaved, onDismiss]);

  if (!selection || !position) return null;

  return (
    <button
      ref={tooltipRef}
      role="tooltip"
      aria-label="Save highlight"
      onClick={() => void handleHighlight()}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        transform: "translateX(-50%)",
        zIndex: 50,
      }}
      className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg transition-opacity hover:opacity-90"
    >
      <Highlighter className="h-3 w-3" />
      <span>Highlight</span>
    </button>
  );
}
