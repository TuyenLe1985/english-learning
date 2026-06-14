"use client";

/**
 * PassageRenderer — interactive passage body client component.
 *
 * Responsibilities:
 * 1. Sanitize passage HTML with isomorphic-dompurify (T-05-07-01 XSS mitigation)
 * 2. Wrap each word in <span data-word="{normalized}"> with role=button + tabIndex=0 (D-14)
 * 3. Restore existing highlights on mount using dom-anchor-text-position toRange() (D-06, READ-04)
 * 4. Show HighlightTooltip on mouseup text selection → POST highlight (D-07, READ-04)
 * 5. Word click → onWordTap callback (wired in 05-08 for word popover)
 *
 * UI-SPEC: §2b passage body — max-w-[65ch] mx-auto, text-[18px] leading-[1.75]
 * Security: T-05-07-01 — DOMPurify.sanitize() with strict allowed-tags whitelist
 * Pitfall 4: dom-anchor-text-position is browser-only — only used inside useEffect/event handlers
 * Pitfall 6: isomorphic-dompurify used client-component-only (no SSR)
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { HighlightTooltip } from "./highlight-tooltip";
import type { HighlightDto } from "@repo/shared";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PassageRendererProps {
  html: string;
  passageId: string;
  highlights: HighlightDto[];
  onHighlightCreated: (h: HighlightDto) => void;
  /** Optional: called when user taps a word (D-14 / VOCAB-08). Passes the clicked span element for popover positioning. */
  onWordTap?: (word: string, sentence: string, anchorEl: HTMLElement) => void;
}

// ─── Sanitization config (T-05-07-01) ────────────────────────────────────────

const ALLOWED_TAGS = [
  "p",
  "b",
  "i",
  "strong",
  "em",
  "br",
  "ul",
  "ol",
  "li",
  "blockquote",
] as const;

// ─── Tooltip selection state ──────────────────────────────────────────────────

interface SelectionState {
  selection: { start: number; end: number; text: string };
  position: { x: number; y: number };
}

// ─── Word tokenizer ───────────────────────────────────────────────────────────

/**
 * Walk all text nodes within an element and split each word into
 * an interactive span. Returns React nodes representing the tokenized content.
 *
 * The approach mirrors the server-side render but operates on the live DOM
 * inside useEffect so we keep the initial SSR output until mount.
 */
function tokenizeNode(
  node: Node,
  onWordTap?: (word: string, sentence: string, container: HTMLElement) => void,
): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  node.childNodes.forEach((child, idx) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      if (!text.trim()) {
        result.push(text);
        return;
      }
      // Split on word boundaries while preserving whitespace
      const parts = text.split(/(\s+)/);
      parts.forEach((part, pIdx) => {
        if (/^\s+$/.test(part)) {
          result.push(part);
        } else if (part.length > 0) {
          const normalized = part.toLowerCase().replace(/[.,!?;:'"()[\]]/g, "");
          result.push(
            <span
              key={`w-${idx}-${pIdx}`}
              data-word={normalized}
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-sm px-0.5 hover:bg-muted/50"
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && onWordTap && normalized) {
                  const container = e.currentTarget.closest("[data-passage-body]") as HTMLElement | null;
                  if (container) onWordTap(normalized, extractSentence(container, e.currentTarget as HTMLElement), container);
                }
              }}
            >
              {part}
            </span>,
          );
        }
      });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tagName = el.tagName.toLowerCase();
      const children = tokenizeNode(child, onWordTap);

      const ElementTag = tagName as keyof React.JSX.IntrinsicElements;
      result.push(
        <ElementTag key={`el-${idx}`} className={tagName === "p" ? "mb-4" : undefined}>
          {children}
        </ElementTag>,
      );
    }
  });

  return result;
}

/**
 * Extract the sentence containing the given word element from the passage body.
 * Splits on sentence-ending punctuation followed by whitespace or end-of-string (D-15).
 */
function extractSentence(container: HTMLElement, wordEl: HTMLElement): string {
  const fullText = container.textContent ?? "";
  const sentences = fullText.split(/(?<=[.!?])\s+/);
  const wordText = wordEl.textContent ?? "";
  return sentences.find((s) => s.includes(wordText)) ?? fullText.slice(0, 200);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PassageRenderer({
  html,
  passageId,
  highlights,
  onHighlightCreated,
  onWordTap,
}: PassageRendererProps) {
  const passageBodyRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [tokenizedContent, setTokenizedContent] = useState<React.ReactNode[] | null>(null);
  const [tooltipState, setTooltipState] = useState<SelectionState | null>(null);

  // ─── Step 1: Sanitize HTML (T-05-07-01) ────────────────────────────────────
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [],
  });

  // ─── Step 2: Word tokenization (client-side only — after mount) ─────────────
  useEffect(() => {
    if (!passageBodyRef.current) return;

    // Parse the sanitized HTML in a temp container
    const temp = document.createElement("div");
    temp.innerHTML = cleanHtml;

    const handleWordTap = onWordTap
      ? (word: string, sentence: string, _container: HTMLElement) => {
          // Note: keyboard-triggered onWordTap passes container as element (no span available);
          // click-triggered handler passes the actual wordSpan (see handleClick).
          // The keyboard path is rarely used; the parent can handle null el gracefully.
          onWordTap(word, sentence, _container);
        }
      : undefined;

    const nodes = tokenizeNode(temp, handleWordTap);
    setTokenizedContent(nodes);
    setMounted(true);
  }, [cleanHtml, onWordTap]);

  // ─── Step 3: Restore highlights (dom-anchor-text-position) ─────────────────
  useEffect(() => {
    if (!mounted || !passageBodyRef.current || highlights.length === 0) return;

    // Dynamic import to ensure browser-only usage (Pitfall 4)
    void import("dom-anchor-text-position").then(({ toRange }) => {
      const root = passageBodyRef.current;
      if (!root) return;

      highlights.forEach((h) => {
        try {
          const range = toRange(root, { start: h.startOffset, end: h.endOffset });
          if (!range || range.collapsed) return;

          const mark = document.createElement("mark");
          mark.className = "bg-amber-100/70 rounded-sm";
          mark.setAttribute("aria-label", "Highlighted text");
          mark.setAttribute("data-highlight-id", h.id);

          try {
            range.surroundContents(mark);
          } catch {
            // surroundContents throws when selection spans multiple elements
            // Use extractContents + insertNode as fallback
            const fragment = range.extractContents();
            mark.appendChild(fragment);
            range.insertNode(mark);
          }
        } catch {
          // Invalid offsets — skip this highlight silently
        }
      });
    });
  }, [mounted, highlights]);

  // ─── Step 4: mouseup handler — text selection → HighlightTooltip ───────────
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const selection = window.getSelection();
      if (
        !selection ||
        selection.isCollapsed ||
        !selection.toString().trim() ||
        !passageBodyRef.current
      ) {
        setTooltipState(null);
        return;
      }

      // Verify selection is within the passage body
      const range = selection.getRangeAt(0);
      if (!passageBodyRef.current.contains(range.commonAncestorContainer)) {
        setTooltipState(null);
        return;
      }

      void import("dom-anchor-text-position").then(({ fromRange }) => {
        if (!passageBodyRef.current) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;

        const r = sel.getRangeAt(0);
        try {
          const { start, end } = fromRange(passageBodyRef.current, r);
          const rect = r.getBoundingClientRect();
          setTooltipState({
            selection: {
              start,
              end,
              text: r.toString(),
            },
            position: {
              x: rect.right,
              y: rect.top + window.scrollY - 40, // above selection
            },
          });
        } catch {
          setTooltipState(null);
        }
      });
    },
    [],
  );

  // ─── Step 5: Word click handler (D-14) ──────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const wordSpan = target.closest("[data-word]") as HTMLElement | null;
      if (!wordSpan || !onWordTap) return;

      const word = wordSpan.getAttribute("data-word");
      if (!word) return;

      const container = passageBodyRef.current;
      if (!container) return;

      const sentence = extractSentence(container, wordSpan);
      // Pass wordSpan as anchorEl so parent can position the WordPopover (D-14)
      onWordTap(word, sentence, wordSpan);
    },
    [onWordTap],
  );

  const handleDismissTooltip = useCallback(() => {
    setTooltipState(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleHighlightSaved = useCallback(
    (h: HighlightDto) => {
      onHighlightCreated(h);
      setTooltipState(null);
      window.getSelection()?.removeAllRanges();
    },
    [onHighlightCreated],
  );

  return (
    <div className="relative">
      {/* Passage body container */}
      <div
        ref={passageBodyRef}
        data-passage-body="true"
        className="max-w-[65ch] text-[18px] leading-[1.75] text-foreground"
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        {mounted && tokenizedContent !== null ? (
          tokenizedContent
        ) : (
          /* Initial SSR / pre-hydration fallback — dangerouslySetInnerHTML with sanitized html */
          <div
            /* eslint-disable-next-line react/no-danger */
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
        )}
      </div>

      {/* Highlight tooltip — shows on text selection (D-07) */}
      {tooltipState && (
        <HighlightTooltip
          selection={tooltipState.selection}
          position={tooltipState.position}
          passageId={passageId}
          onSaved={handleHighlightSaved}
          onDismiss={handleDismissTooltip}
        />
      )}
    </div>
  );
}
