"use client";

/**
 * ReadingPageClient — thin client wrapper that coordinates all interactive
 * client-side state for the reading passage detail page.
 *
 * Responsibilities:
 * - Highlight state (optimistic add from onHighlightCreated)
 * - Reading timer (starts on mount, stops when QuestionsSection calls onTimerStop)
 * - Notes panel open/close state
 * - Coordinates PassageRenderer ↔ QuestionsSection via shared refs
 *
 * UI-SPEC Screen 2: Reading timer, Bookmark button, Notes panel toggle.
 * D-03: Passive timer — starts on mount, stops on last question answered.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Clock, StickyNote, Bookmark } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { QuestionsSection } from "./questions-section";
import { NotesPanel } from "./notes-panel";
import type { HighlightDto, ReadingPassageDetailDto } from "@repo/shared";

// Dynamic import — PassageRenderer uses isomorphic-dompurify and
// dom-anchor-text-position which are browser-only (Pitfall 4, Pitfall 6)
const PassageRenderer = dynamic(
  () => import("./passage-renderer").then((m) => m.PassageRenderer),
  { ssr: false },
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReadingPageClientProps {
  data: ReadingPassageDetailDto;
  passageId: string;
}

// ─── Timer utils ──────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReadingPageClient({ data, passageId }: ReadingPageClientProps) {
  // Highlight state — optimistic adds from HighlightTooltip
  const [highlights, setHighlights] = useState<HighlightDto[]>(data.highlights);

  // Reading timer state (D-03)
  const startTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timerStopped, setTimerStopped] = useState(false);

  // Notes panel visibility
  const [notesOpen, setNotesOpen] = useState(false);

  // Start timer on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // onTimerStop — called by QuestionsSection when last question is answered
  const handleTimerStop = useCallback((): number => {
    if (!timerStopped) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setTimerStopped(true);
    }
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, [timerStopped]);

  const handleHighlightCreated = useCallback((h: HighlightDto) => {
    setHighlights((prev) => [...prev, h]);
  }, []);

  return (
    <>
      {/* ── Action row: timer + Notes toggle + Bookmark ─────────────────────── */}
      <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
        {/* Reading timer (D-03, UI-SPEC Reading Timer Contract) */}
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span aria-live="polite">{formatElapsed(elapsedSec)}</span>
        </span>

        {/* Bookmark button (non-interactive in this plan — wired later) */}
        <button
          aria-label={data.isBookmarked ? "Remove bookmark" : "Bookmark passage"}
          className="inline-flex min-h-[44px] items-center gap-1 transition-colors"
        >
          <Bookmark
            className={`h-4 w-4 ${
              data.isBookmarked
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
          <span>{data.isBookmarked ? "Bookmarked" : "Bookmark"}</span>
        </button>

        {/* Notes toggle (D-08) */}
        <button
          aria-label="Toggle notes panel"
          aria-pressed={notesOpen}
          onClick={() => setNotesOpen((o) => !o)}
          className={`inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 transition-colors ${
            notesOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <StickyNote className="h-4 w-4" />
          <span>Notes</span>
        </button>
      </div>

      {/* ── 2b. Passage body — PassageRenderer (client, browser-only) ───────── */}
      <PassageRenderer
        html={data.content}
        passageId={passageId}
        highlights={highlights}
        onHighlightCreated={handleHighlightCreated}
      />

      <Separator className="my-8" />

      {/* ── 2c + 2d. Questions section + inline score card ───────────────────── */}
      <QuestionsSection
        questions={data.questions}
        passageId={passageId}
        onTimerStop={handleTimerStop}
      />

      {/* ── 2g. Notes panel (Sheet on mobile, sidebar on desktop) ────────────── */}
      <NotesPanel
        passageId={passageId}
        initialContent={data.note}
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
      />
    </>
  );
}
