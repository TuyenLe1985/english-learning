"use client";

/**
 * NotesPanel — auto-saving note panel for reading passages.
 *
 * Layout:
 * - Desktop: right sidebar w-80, fixed position, slide-in from right (D-08)
 * - Mobile: shadcn Sheet side="bottom" h-[60vh]
 *
 * Auto-save on textarea blur — POST /api/reading/notes with { passageId, content }.
 * On success: shows "Saved" + Check icon for 2 seconds.
 * On error: shows "Could not save note. Changes may not persist."
 *
 * UI-SPEC §2g: Notes panel layout, auto-save behavior, save status indicator.
 * Security: T-05-07-02 — note content is plain text; never rendered as innerHTML.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Check, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotesPanelProps {
  passageId: string;
  initialContent: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Save status type ─────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export function NotesPanel({
  passageId,
  initialContent,
  isOpen,
  onClose,
}: NotesPanelProps) {
  const [content, setContent] = useState(initialContent ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isMobile, setIsMobile] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect mobile (< md breakpoint = 768px)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Reset content when passage changes
  useEffect(() => {
    setContent(initialContent ?? "");
    setSaveStatus("idle");
  }, [passageId, initialContent]);

  const handleBlur = useCallback(async () => {
    if (saveStatus === "saving") return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/reading/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId, content }),
      });

      if (!res.ok) throw new Error(`Save failed: ${res.status}`);

      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [saveStatus, passageId, content]);

  // Panel content — shared between mobile Sheet and desktop sidebar
  const panelContent = (
    <div className="flex h-full flex-col gap-3">
      {/* Textarea */}
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (saveStatus !== "idle") setSaveStatus("idle");
        }}
        onBlur={() => void handleBlur()}
        placeholder="Jot down your notes about this passage..."
        className="min-h-[200px] max-h-[400px] flex-1 resize-none text-sm"
        aria-label="Passage notes"
      />

      {/* Save status indicator */}
      <div className="h-5 text-xs text-muted-foreground">
        {saveStatus === "saving" && <span>Saving...</span>}
        {saveStatus === "saved" && (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-destructive">
            Could not save note. Changes may not persist.
          </span>
        )}
      </div>
    </div>
  );

  // ── Mobile: shadcn Sheet (bottom drawer) ──────────────────────────────────
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Notes</SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-[calc(100%-4rem)]">{panelContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // ── Desktop: right sidebar with CSS slide-in ──────────────────────────────
  return (
    <div
      aria-label="Notes panel"
      role="complementary"
      style={{
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 200ms ease-out",
      }}
      className="fixed right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-border bg-background p-4 shadow-lg"
    >
      {/* Panel header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Notes</h2>
        <button
          aria-label="Close notes panel"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {panelContent}
    </div>
  );
}
