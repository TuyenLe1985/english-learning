"use client";

/**
 * PassageRenderer — interactive passage body renderer.
 *
 * Responsibilities (plan 05-07):
 * 1. Sanitize crawled HTML with isomorphic-dompurify (XSS mitigation T-05-07-01)
 * 2. Wrap each word in <span data-word='{normalized}'> for word-tap popover (D-14)
 * 3. Restore persisted highlights via dom-anchor-text-position toRange() (D-06, READ-04)
 * 4. Detect mouseup text selection → emit position state for HighlightTooltip (D-07)
 *
 * CRITICAL: dom-anchor-text-position and isomorphic-dompurify are browser-only.
 * All DOM access is inside useEffect / event handlers — never at module scope (Pitfall 4, 6).
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { fromRange, toRange } from "dom-anchor-text-position";
import { HighlightTooltip } from "./highlight-tooltip";
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
  html: string;
  passageId: string;
  highlights: HighlightDto[];
  onHighlightCreated: (h: HighlightDto) => void;
  /** Called when a word span is clicked: (normalizedWord, sentenceContext, anchorElement) */
  onWordTap?: (word: string, sentence: string, el: HTMLElement) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * DOMPurify config — tight whitelist matching the CEFR content format.
 * No script, style, iframe, object, embed, form elements allowed (T-05-07-01).
 */
const DOMPURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ["p", "b", "i", "strong", "em", "br", "ul", "ol", "li", "blockquote"],
  ALLOWED_ATTR: [],
};

/** Normalize a word token for the data-word attribute and dictionary lookup. */
function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[.,!?;:'"()[\]{}…—–-]/g, "");
}

/**
 * Extract the surrounding sentence for word-tap context.
 * Splits on sentence boundary (D-15: split on . ! ? followed by space or end).
 */
function extractSentence(textContent: string, wordIndex: number): string {
  const sentences = textContent.split(/(?<=[.!?])(?:\s|$)/);
  let charCount = 0;
  for (const sentence of sentences) {
    if (charCount + sentence.length >= wordIndex) {
      return sentence.trim();
    }
    charCount += sentence.length + 1;
  }
  return textContent.trim();
}

/**
 * Apply a highlight range to the DOM.
 * Uses surroundContents for simple cases; extractContents+insertNode for multi-element spans.
 */
function applyHighlightRange(range: Range, highlightId: string): void {
  const mark = document.createElement("mark");
  mark.className = "bg-amber-100/70 rounded-sm";
  mark.setAttribute("aria-label", "Highlighted text");
  mark.setAttribute("data-highlight-id", highlightId);
  try {
    range.surroundContents(mark);
  } catch {
    // Range spans multiple elements — use extractContents + insertNode
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PassageRenderer({
  html,
  passageId,
  highlights,
  onHighlightCreated,
  onWordTap,
}: Props) {
  const passageBodyRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const wordSpanDoneRef = useRef(false);

  // Sanitize HTML once — deterministic output for the initial DOM injection
  const cleanHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);

  // ─── Initial HTML injection ─────────────────────────────────────────────────
  useEffect(() => {
    const container = passageBodyRef.current;
    if (!container || wordSpanDoneRef.current) return;
    // Set sanitized HTML directly (avoids React reconciliation of large DOM)
    container.innerHTML = cleanHtml;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Client mount: word-span wrapping ──────────────────────────────────────
  useEffect(() => {
    const container = passageBodyRef.current;
    if (!container || wordSpanDoneRef.current) return;

    // Walk all text nodes and wrap words in span elements
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    for (const textNode of textNodes) {
      const parent = textNode.parentNode;
      if (!parent) continue;
      // Skip if already inside a mark (highlight) element
      if (parent instanceof HTMLElement && parent.tagName === "MARK") continue;

      const text = textNode.nodeValue ?? "";
      if (!text.trim()) continue;

      // Split text into tokens: words and whitespace/punctuation separators
      const tokens = text.split(/(\s+)/);
      const fragment = document.createDocumentFragment();

      for (const token of tokens) {
        if (/^\s+$/.test(token) || token === "") {
          fragment.appendChild(document.createTextNode(token));
        } else {
          const normalized = normalizeWord(token);
          if (!normalized) {
            // Pure punctuation — render as plain text
            fragment.appendChild(document.createTextNode(token));
          } else {
            const span = document.createElement("span");
            span.setAttribute("data-word", normalized);
            span.setAttribute("role", "button");
            span.setAttribute("tabIndex", "0");
            span.className =
              "cursor-pointer hover:bg-muted/50 rounded-sm px-0.5 transition-colors";
            span.textContent = token;
            fragment.appendChild(span);
          }
        }
      }

      parent.replaceChild(fragment, textNode);
    }

    wordSpanDoneRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Highlight restoration ──────────────────────────────────────────────────
  useEffect(() => {
    const container = passageBodyRef.current;
    if (!container || !highlights.length) return;

    for (const h of highlights) {
      try {
        const range = toRange(container, { start: h.startOffset, end: h.endOffset });
        if (range && !range.collapsed) {
          // Skip if already highlighted
          if (!container.querySelector(`[data-highlight-id="${h.id}"]`)) {
            applyHighlightRange(range, h.id);
          }
        }
      } catch {
        // Range restoration failed — silently skip (DOM may have changed)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights]);

  // ─── mouseup: text selection → tooltip ─────────────────────────────────────
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
        setSelection(null);
        setTooltipPos(null);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const container = passageBodyRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setSelection(null);
        setTooltipPos(null);
        return;
      }

      const selectedText = domSelection.toString().trim();
      if (!selectedText) {
        setSelection(null);
        setTooltipPos(null);
        return;
      }

      try {
        const { start, end } = fromRange(container, range);
        const rect = range.getBoundingClientRect();
        // Position tooltip near the selection endpoint
        const x = e.clientX;
        const y = rect.bottom;

        setSelection({ start, end, text: selectedText, x, y });
        setTooltipPos({ x, y });
      } catch {
        // fromRange failed — ignore selection
      }
    },
    [],
  );

  // ─── Word click / keyboard handler ─────────────────────────────────────────
  const handleInteraction = useCallback(
    (target: EventTarget | null) => {
      if (!onWordTap) return;
      const el = target as HTMLElement | null;
      if (!el) return;
      const wordSpan = el.closest("[data-word]") as HTMLElement | null;
      if (!wordSpan) return;

      const normalizedWord = wordSpan.getAttribute("data-word") ?? "";
      if (!normalizedWord) return;

      const container = passageBodyRef.current;
      const textContent = container?.textContent ?? "";
      const wordPos = textContent.toLowerCase().indexOf(normalizedWord);
      const sentence = extractSentence(textContent, wordPos >= 0 ? wordPos : 0);
      // Pass the wordSpan element as anchor for WordPopover positioning (VOCAB-08)
      onWordTap(normalizedWord, sentence, wordSpan);
    },
    [onWordTap],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handleInteraction(e.target);
    },
    [handleInteraction],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleInteraction(e.target);
      }
    },
    [handleInteraction],
  );

  // ─── Highlight tooltip callbacks ────────────────────────────────────────────
  const handleHighlightSaved = useCallback(
    (h: HighlightDto) => {
      onHighlightCreated(h);
      setSelection(null);
      setTooltipPos(null);
      // Optimistically apply highlight to DOM
      const container = passageBodyRef.current;
      if (!container) return;
      try {
        const range = toRange(container, { start: h.startOffset, end: h.endOffset });
        if (range && !range.collapsed) {
          applyHighlightRange(range, h.id);
        }
      } catch {
        // Ignore DOM failures on optimistic update
      }
    },
    [onHighlightCreated],
  );

  const handleTooltipDismiss = useCallback(() => {
    setSelection(null);
    setTooltipPos(null);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* The ref container is populated via innerHTML in useEffect.
          Suppress hydration mismatch warning — content is browser-only. */}
      <div
        ref={passageBodyRef}
        className="max-w-[65ch] text-[18px] leading-[1.75] text-foreground [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic"
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label="Reading passage"
        suppressHydrationWarning
      />

      {selection && tooltipPos && (
        <HighlightTooltip
          selection={selection}
          position={tooltipPos}
          passageId={passageId}
          onSaved={handleHighlightSaved}
          onDismiss={handleTooltipDismiss}
        />
      )}
    </>
  );
}
