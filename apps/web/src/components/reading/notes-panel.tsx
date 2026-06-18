"use client";

/**
 * NotesPanel — sticky note panel for reading passages.
 *
 * Plan 05-07, D-08, READ-05:
 * - Desktop: right sidebar (w-80, slide-in translateX animation)
 * - Mobile: shadcn Sheet (side="bottom", h-[60vh])
 * - Textarea auto-saves on blur: POST /api/reading/notes { passageId, content }
 * - "Saved" indicator for 2 seconds after successful save (Check icon)
 * - Error state: "Could not save note. Changes may not persist."
 *
 * UI-SPEC §2g: Notes panel anatomy, Sheet, auto-save, copywriting contract.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  passageId: string;
  initialContent: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Simple hook to detect mobile breakpoint (< 768px). */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotesPanel({ passageId, initialContent, isOpen, onClose }: Props) {
  const isMobile = useIsMobile();
  const [content, setContent] = useState(initialContent ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, []);

  // ─── Auto-save on blur ────────────────────────────────────────────────────

  const handleBlur = useCallback(async () => {
    if (saveStatus === "saving") return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/reading/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId, content }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSaveStatus("saved");
      // Reset to idle after 2 seconds
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [saveStatus, passageId, content]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Panel content (shared between sidebar and Sheet) ────────────────────

  const panelContent = (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Notes</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close notes panel"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => void handleBlur()}
        placeholder="Jot down your notes about this passage..."
        className="min-h-[200px] max-h-[400px] resize-none text-sm"
        aria-label="Passage notes"
      />

      {/* Save status indicator */}
      <div className="h-5">
        {saveStatus === "saved" && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5" />
            Saved
          </p>
        )}
        {saveStatus === "saving" && (
          <p className="text-xs text-muted-foreground">Saving...</p>
        )}
        {saveStatus === "error" && (
          <p className="text-xs text-destructive">
            Could not save note. Changes may not persist.
          </p>
        )}
      </div>
    </div>
  );

  // ─── Mobile: Sheet ────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[60vh] px-4 py-6">
          <SheetHeader className="sr-only">
            <SheetTitle>Notes</SheetTitle>
          </SheetHeader>
          {panelContent}
        </SheetContent>
      </Sheet>
    );
  }

  // ─── Desktop: right sidebar ───────────────────────────────────────────────

  return (
    <div
      className="fixed right-0 top-0 z-40 h-full w-80 shrink-0 overflow-y-auto border-l border-border bg-background p-6 shadow-xl transition-transform duration-200 ease-out"
      style={{
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
      }}
      aria-hidden={!isOpen}
    >
      {panelContent}
    </div>
  );
}
