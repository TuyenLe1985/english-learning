/**
 * ListeningItemClient — Client-side orchestrator for the listening item detail page.
 *
 * STUB: Full implementation (AudioPlayer + TranscriptPanel + exercises) delivered in Plan 06.
 * This stub satisfies the ListeningItemPage import and renders a placeholder.
 *
 * Plan 06 will replace this with: sticky AudioPlayer bar, TranscriptPanel with karaoke,
 * and the exercise carousel (MULTIPLE_CHOICE, FILL_MISSING_WORDS, DICTATION).
 */

"use client";

import type { ListeningItemDetailDto } from "@repo/shared";

interface ListeningItemClientProps {
  item: ListeningItemDetailDto;
}

export function ListeningItemClient({ item }: ListeningItemClientProps) {
  return (
    <div
      className="rounded-xl border border-border bg-muted/40 p-8 text-center"
      data-content-id={item.id}
    >
      <p className="text-sm text-muted-foreground">
        Audio player and exercises coming in Plan 06.
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        {item.questions.length} exercise{item.questions.length !== 1 ? "s" : ""}{" "}
        available for this item.
      </p>
    </div>
  );
}
