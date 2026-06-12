/**
 * /vocabulary/my-words — Personal Vocabulary List (Client Component, React Query)
 *
 * UI-SPEC /vocabulary/my-words layout:
 *   - Page heading "My Vocabulary" (Display 28px/600)
 *   - StatusFilter tabs (All / New / Learning / Review / Mastered)
 *   - Word list: word, 1-line definition, CefrBadge, SRS status badge, next review date
 *   - Loading state: Skeleton rows
 *   - Empty state: "Your vocabulary list is empty" (no words yet)
 *                  "No words with this status" (filter returns nothing)
 *   - Pagination: 20 words/page, Prev/Next
 *
 * VOCAB-07: Full vocabulary list filtered by status with next review date.
 * React Query cache: ["my-words", status, page] staleTime 30s, gcTime 2m
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { CefrBadge } from "@/components/cefr-badge";
import {
  StatusFilter,
  type StatusFilterValue,
} from "@/components/vocabulary/status-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import type { MyWordDto } from "@repo/shared";

// SRS Status Badge colors per UI-SPEC
const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  new: { label: "New", classes: "bg-zinc-100 text-zinc-600" },
  learning: { label: "Learning", classes: "bg-amber-100 text-amber-700" },
  reviewing: { label: "Review", classes: "bg-blue-100 text-blue-700" },
  mastered: { label: "Mastered", classes: "bg-green-100 text-green-700" },
};

function SrsStatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE_CONFIG[status] ?? {
    label: status,
    classes: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span
      aria-label={`Status: ${config.label}`}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

function formatNextReview(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `Due: ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

interface MyWordsResponse {
  words: MyWordDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function MyWordsPage() {
  const [status, setStatus] = useState<StatusFilterValue>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery<MyWordsResponse>({
    queryKey: ["my-words", status, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      params.set("page", String(page));
      return fetch(`/api/vocabulary/my-words?${params.toString()}`).then((r) =>
        r.json(),
      );
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 120_000, // 2 minutes
  });

  function handleStatusChange(newStatus: StatusFilterValue) {
    setStatus(newStatus);
    setPage(1); // reset pagination on filter change
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-screen-xl">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">
          My Vocabulary
        </h1>
        <Skeleton className="mb-6 h-10 w-full max-w-md" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-screen-xl">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">
          My Vocabulary
        </h1>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-foreground font-medium">
            Couldn&apos;t load your vocabulary list
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const { words, totalPages } = data;

  return (
    <div className="mx-auto max-w-screen-xl">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        My Vocabulary
      </h1>

      {/* Status filter tabs */}
      <div className="mb-6">
        <StatusFilter value={status} onChange={handleStatusChange} />
      </div>

      {/* Empty state — no words at all */}
      {words.length === 0 && status === "all" && (
        <div
          role="status"
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <p className="text-lg font-semibold text-foreground">
            Your vocabulary list is empty
          </p>
          <p className="text-base text-muted-foreground text-center max-w-xs">
            Mark words as learned while browsing to start building your personal
            list.
          </p>
          <Link href="/vocabulary" className={buttonVariants({ variant: "outline" })}>
            Browse Vocabulary
          </Link>
        </div>
      )}

      {/* Empty state — filter returns nothing */}
      {words.length === 0 && status !== "all" && (
        <div
          role="status"
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <p className="text-lg font-semibold text-foreground">
            No words with this status
          </p>
          <p className="text-base text-muted-foreground text-center max-w-xs">
            Words move between stages as you review them.
          </p>
          <Button
            variant="ghost"
            onClick={() => handleStatusChange("all")}
          >
            See all words
          </Button>
        </div>
      )}

      {/* Word list */}
      {words.length > 0 && (
        <>
          <div className="space-y-2">
            {words.map((item) => (
              <div
                key={item.wordId}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {item.word}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {item.definition}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CefrBadge level={item.cefrLevel} />
                  <SrsStatusBadge status={item.status} />
                  {item.nextReviewDate && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatNextReview(item.nextReviewDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
