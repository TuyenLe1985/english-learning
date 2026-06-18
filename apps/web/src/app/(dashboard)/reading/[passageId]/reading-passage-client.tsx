"use client";

/**
 * ReadingPassageClient — client-side orchestrator for the passage reader page.
 *
 * Handles:
 * - Reading timer (D-03): starts on mount, stops when last question is answered
 * - Bookmark toggle with optimistic update (READ-06)
 * - Notes panel toggle state
 * - Highlight state (passed down to PassageRenderer)
 * - WordPopover (VOCAB-08): word tap → vocabulary lookup → SRS enrollment
 * - QuestionsSection (timer coordination via onTimerStop callback)
 * - NotesPanel (Sheet on mobile, sidebar on desktop)
 *
 * PassageRenderer is injected as a prop because it is dynamically imported in the
 * Server Component parent with ssr:false (browser-only APIs).
 */

import React, { useState, useEffect, useRef, useCallback, ComponentType } from "react";
import { Clock, Bookmark, BookmarkCheck, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QuestionsSection } from "@/components/reading/questions-section";
import { NotesPanel } from "@/components/reading/notes-panel";
import { WordPopover } from "@/components/reading/word-popover";
import type { ReadingPassageDetailDto, HighlightDto } from "@repo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PassageRendererProps {
  html: string;
  passageId: string;
  highlights: HighlightDto[];
  onHighlightCreated: (h: HighlightDto) => void;
  onWordTap?: (word: string, sentence: string, el: HTMLElement) => void;
}

interface Props {
  data: ReadingPassageDetailDto;
  passageId: string;
  PassageRendererComponent: ComponentType<PassageRendererProps>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReadingPassageClient({
  data,
  passageId,
  PassageRendererComponent,
}: Props) {
  const { toast } = useToast();

  // ─── Timer state (D-03) ─────────────────────────────────────────────────────
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerStopped, setTimerStopped] = useState(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /** Called by QuestionsSection when the last question is answered. Returns readingTimeSec. */
  const handleTimerStop = useCallback((): number => {
    if (!timerStopped) {
      if (timerRef.current) clearInterval(timerRef.current);
      const readingTimeSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimerStopped(true);
      return readingTimeSec;
    }
    return elapsedSeconds;
  }, [timerStopped, elapsedSeconds]);

  // ─── Highlight state ─────────────────────────────────────────────────────────
  const [highlights, setHighlights] = useState<HighlightDto[]>(data.highlights);

  const handleHighlightCreated = useCallback((h: HighlightDto) => {
    setHighlights((prev) => [...prev, h]);
  }, []);

  // ─── Bookmark state ──────────────────────────────────────────────────────────
  const [isBookmarked, setIsBookmarked] = useState(data.isBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const handleBookmarkToggle = useCallback(async () => {
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    const prev = isBookmarked;
    // Optimistic update
    setIsBookmarked(!prev);

    try {
      const res = await fetch(`/api/reading/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId }),
      });
      if (!res.ok) throw new Error();
      toast({
        description: prev ? "Bookmark removed." : "Passage bookmarked.",
      });
    } catch {
      // Revert optimistic update
      setIsBookmarked(prev);
      toast({
        variant: "destructive",
        description: "Could not update bookmark. Try again.",
      });
    } finally {
      setBookmarkLoading(false);
    }
  }, [bookmarkLoading, isBookmarked, passageId, toast]);

  // ─── Notes panel state ───────────────────────────────────────────────────────
  const [notesOpen, setNotesOpen] = useState(false);

  const handleNotesToggle = useCallback(() => {
    setNotesOpen((prev) => !prev);
  }, []);

  const handleNotesClose = useCallback(() => {
    setNotesOpen(false);
  }, []);

  // ─── Word tap state (VOCAB-08 / D-14) ─────────────────────────────────────
  const [activeWord, setActiveWord] = useState<{
    word: string;
    contextSentence: string;
    anchorEl: HTMLElement;
  } | null>(null);

  const handleWordTap = useCallback(
    (word: string, sentence: string, el: HTMLElement) => {
      // el is the clicked <span data-word> element — used as PopoverAnchor reference
      setActiveWord({ word, contextSentence: sentence, anchorEl: el });
    },
    [],
  );

  const handleWordPopoverClose = useCallback(() => {
    setActiveWord(null);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Action row: timer, bookmark, notes */}
      <div className="mb-6 flex items-center gap-4 text-sm">
        {/* Reading timer (D-03): passive, aria-live="polite" for SR announcements */}
        <div
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-live="polite"
          aria-label="Reading time"
          aria-atomic="false"
        >
          <Clock className="h-4 w-4" />
          <span>{formatElapsedTime(elapsedSeconds)}</span>
        </div>

        {/* Bookmark toggle */}
        <button
          type="button"
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark passage"}
          disabled={bookmarkLoading}
          onClick={() => void handleBookmarkToggle()}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {isBookmarked ? (
            <>
              <BookmarkCheck className="h-4 w-4 text-amber-400" />
              <span>Bookmarked</span>
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              <span>Bookmark</span>
            </>
          )}
        </button>

        {/* Notes toggle */}
        <button
          type="button"
          aria-label="Toggle notes panel"
          onClick={handleNotesToggle}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted ${notesOpen ? "bg-muted" : ""}`}
        >
          <StickyNote className="h-4 w-4" />
          <span>Notes</span>
        </button>
      </div>

      {/* 2b: Passage body via PassageRenderer (DOMPurify + word-span + highlight restore) */}
      <PassageRendererComponent
        html={data.content}
        passageId={passageId}
        highlights={highlights}
        onHighlightCreated={handleHighlightCreated}
        onWordTap={handleWordTap}
      />

      {/* 2e: Word tap popover (VOCAB-08 / D-14) */}
      {activeWord && (
        <WordPopover
          word={activeWord.word}
          contextSentence={activeWord.contextSentence}
          anchorEl={activeWord.anchorEl}
          onClose={handleWordPopoverClose}
        />
      )}

      {/* 2c: Questions section (inline, all questions visible) */}
      <QuestionsSection
        questions={data.questions}
        passageId={passageId}
        onTimerStop={handleTimerStop}
      />

      {/* 2g: Notes panel (Sheet on mobile, sidebar on desktop) */}
      <NotesPanel
        passageId={passageId}
        initialContent={data.note}
        isOpen={notesOpen}
        onClose={handleNotesClose}
      />
    </div>
  );
}
