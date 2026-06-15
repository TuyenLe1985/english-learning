/**
 * ListeningItemCard — Browse card for a listening content item.
 *
 * LIST-01: Displays title, CEFR level badge, content type badge,
 * duration, and exercise count. Clicking navigates to the item detail page.
 *
 * Used in the /listening browse page grid.
 */

"use client";

import Link from "next/link";
import { CefrBadge } from "@/components/cefr-badge";
import { Badge } from "@/components/ui/badge";
import type { ListeningItemDto } from "@repo/shared";

// ─── Content type display label map (UI-SPEC) ─────────────────────────────────

const CONTENT_TYPE_LABELS: Record<ListeningItemDto["contentType"], string> = {
  CONVERSATION: "Conversation",
  INTERVIEW: "Interview",
  PODCAST: "Podcast",
  LECTURE: "Lecture",
  NEWS_REPORT: "News Report",
};

function contentTypeLabel(type: ListeningItemDto["contentType"]): string {
  return CONTENT_TYPE_LABELS[type] ?? type;
}

// ─── Duration formatter ───────────────────────────────────────────────────────

function formatDuration(durationSec: number): string {
  const m = Math.floor(durationSec / 60);
  const s = durationSec % 60;
  return `${m}m ${s}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ListeningItemCardProps {
  item: ListeningItemDto;
}

export function ListeningItemCard({ item }: ListeningItemCardProps) {
  return (
    <Link href={`/listening/${item.id}`} className="block">
      <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
        {/* Top row: CEFR badge + content type badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <CefrBadge level={item.cefrLevel} />
          <Badge variant="secondary">{contentTypeLabel(item.contentType)}</Badge>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-foreground line-clamp-2 mt-2">
          {item.title}
        </p>

        {/* Metadata row: duration + separator + exercise count */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.durationSec != null && (
            <>
              <span>{formatDuration(item.durationSec)}</span>
              <span>·</span>
            </>
          )}
          <span>{item.questionCount} exercises</span>
        </div>
      </div>
    </Link>
  );
}
