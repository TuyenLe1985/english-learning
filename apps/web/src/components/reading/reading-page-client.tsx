"use client";

/**
 * ReadingPageClient — thin client wrapper that coordinates all interactive
 * client-side state for the reading passage detail page.
 *
 * Responsibilities:
 * - Highlight state (optimistic add from onHighlightCreated)
 * - Reading timer (starts on mount, stops when QuestionsSection calls onTimerStop)
 * - Notes panel open/close state
 * - Word popover state (activeWord — VOCAB-08 / D-14)
 * - Bookmark toggle state (READ-06)
 * - Coordinates PassageRenderer ↔ QuestionsSection via shared refs
 *
 * UI-SPEC Screen 2: Reading timer, Bookmark button, Notes panel toggle.
 * UI-SPEC Screen 3: Bookmark icon states — Bookmark (unfilled muted) / BookmarkCheck (amber-400).
 * D-03: Passive timer — starts on mount, stops on last question answered.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Clock, StickyNote, Bookmark, BookmarkCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { QuestionsSection } from "./questions-section";
import { NotesPanel } from "./notes-panel";
import { WordPopover } from "./word-popover";
import { useToast } from "@/hooks/use-toast";
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

// ─── Word tap state ───────────────────────────────────────────────────────────

interface ActiveWord {
  word: string;
  sentence: string;
  anchorEl: HTMLElement;
}

// ─── Timer utils ──────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReadingPageClient({ data, passageId }: ReadingPageClientProps) {
  const { toast } = useToast();

  // Highlight state — optimistic adds from HighlightTooltip
  const [highlights, setHighlights] = useState<HighlightDto[]>(data.highlights);

  // Reading timer state (D-03)
  const startTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timerStopped, setTimerStopped] = useState(false);

  // Notes panel visibility
  const [notesOpen, setNotesOpen] = useState(false);

  // Word popover state (VOCAB-08 / D-14)
  const [activeWord, setActiveWord] = useState<ActiveWord | null>(null);

  // Bookmark state (READ-06) — optimistic UI
  const [isBookmarked, setIsBookmarked] = useState(data.isBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

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

  // ── Word tap handler — VOCAB-08 (D-14) ────────────────────────────────────
  const handleWordTap = useCallback(
    (word: string, sentence: string, el?: HTMLElement) => {
      if (!el) return;
      // If same word clicked again, close the popover
      if (activeWord?.word === word && activeWord?.anchorEl === el) {
        setActiveWord(null);
        return;
      }
      setActiveWord({ word, sentence, anchorEl: el });
    },
    [activeWord],
  );

  // ── Bookmark toggle — READ-06 ──────────────────────────────────────────────
  const toggleBookmark = useCallback(async () => {
    if (bookmarkLoading) return;

    // Optimistic update
    const next = !isBookmarked;
    setIsBookmarked(next);
    setBookmarkLoading(true);

    try {
      const res = await fetch("/api/reading/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ passageId }),
      });

      if (!res.ok) {
        // Revert optimistic update on error
        setIsBookmarked(!next);
        toast({
          title: "Could not update bookmark. Try again.",
          variant: "destructive",
        });
        return;
      }

      // Show confirmation toast (UI-SPEC Copywriting Contract)
      toast({
        title: next ? "Passage bookmarked." : "Bookmark removed.",
      });
    } catch {
      // Revert on network error
      setIsBookmarked(!next);
      toast({
        title: "Could not update bookmark. Try again.",
        variant: "destructive",
      });
    } finally {
      setBookmarkLoading(false);
    }
  }, [bookmarkLoading, isBookmarked, passageId, toast]);

  return (
    <div className="relative">
      {/* ── Action row: timer + Notes toggle + Bookmark ─────────────────────── */}
      <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
        {/* Reading timer (D-03, UI-SPEC Reading Timer Contract) */}
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span aria-live="polite">{formatElapsed(elapsedSec)}</span>
        </span>

        {/* Bookmark toggle (READ-06, UI-SPEC Screen 3) */}
        <button
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark passage"}
          onClick={() => { void toggleBookmark(); }}
          disabled={bookmarkLoading}
          className="inline-flex min-h-[44px] items-center gap-1 transition-colors disabled:opacity-50"
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-4 w-4 text-amber-400" />
          ) : (
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          )}
          <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
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
        onWordTap={(word, sentence, el) => handleWordTap(word, sentence, el)}
      />

      {/* ── Word tap popover — VOCAB-08 (D-14) ──────────────────────────────── */}
      {activeWord && (
        <WordPopover
          word={activeWord.word}
          contextSentence={activeWord.sentence}
          anchorEl={activeWord.anchorEl}
          onClose={() => setActiveWord(null)}
        />
      )}

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
    </div>
  );
}
