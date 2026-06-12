/**
 * WordListItem — word entry in the vocabulary category word list.
 *
 * VOCAB-01 (D-12): Displays a word with its part of speech, CEFR badge,
 * and optional SRS status badge. Links to /vocabulary/[category]/[wordId].
 *
 * UI-SPEC: Body 16px/400 for word, SRS status badge colors per UI-SPEC §Color.
 */

"use client";

import Link from "next/link";
import { CefrBadge, type CefrLevel } from "@/components/cefr-badge";
import { cn } from "@/lib/utils";

// SRS status badge colors per UI-SPEC §Color §SRS Status Badge
const SRS_STATUS_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  new: { label: "New", classes: "bg-zinc-100 text-zinc-600" },
  learning: { label: "Learning", classes: "bg-amber-100 text-amber-700" },
  reviewing: { label: "Review", classes: "bg-blue-100 text-blue-700" },
  mastered: { label: "Mastered", classes: "bg-green-100 text-green-700" },
};

interface WordListItemProps {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string | null;
  cefrLevel: CefrLevel;
  category: string;
  srsStatus?: string | null;
  className?: string;
}

export function WordListItem({
  id,
  word,
  definition,
  partOfSpeech,
  cefrLevel,
  category,
  srsStatus,
  className,
}: WordListItemProps) {
  const statusConfig = srsStatus ? SRS_STATUS_CONFIG[srsStatus] : null;

  return (
    <Link
      href={`/vocabulary/${category}/${id}`}
      data-testid="word-list-item"
      className={cn(
        "flex items-center justify-between border-b border-border py-3 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        {/* Word — Body 16px/400 */}
        <span className="text-base font-medium text-foreground">{word}</span>
        {/* Definition snippet + part of speech */}
        <span className="line-clamp-1 text-sm text-muted-foreground">
          {partOfSpeech && (
            <span className="mr-1 italic">{partOfSpeech}</span>
          )}
          {definition}
        </span>
      </div>

      {/* Badges — right side */}
      <div className="ml-3 flex flex-shrink-0 items-center gap-2">
        <CefrBadge level={cefrLevel} />
        {statusConfig && (
          <span
            aria-label={`Status: ${statusConfig.label}`}
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              statusConfig.classes,
            )}
          >
            {statusConfig.label}
          </span>
        )}
      </div>
    </Link>
  );
}
