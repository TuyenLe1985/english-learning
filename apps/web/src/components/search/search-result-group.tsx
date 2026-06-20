/**
 * SearchResultGroup — renders a group of search results for a single content type.
 *
 * SRCH-04: Shows module name (16px semibold), result count Badge, and up to 5 items.
 * When there are more than 5 results, shows a "Show {n} more →" link.
 */

"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SearchResultItem } from "./search-result-item";
import type { SearchResultGroupDto } from "@repo/shared";

const MODULE_LABELS: Record<string, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar Lessons",
  reading: "Reading Passages",
  listening: "Listening",
  quiz: "Quizzes",
};

const PREVIEW_LIMIT = 5;

interface SearchResultGroupProps {
  group: SearchResultGroupDto;
  query: string;
}

export function SearchResultGroup({ group, query }: SearchResultGroupProps) {
  const previewResults = group.results.slice(0, PREVIEW_LIMIT);
  const remaining = group.count - previewResults.length;

  return (
    <div className="mb-6">
      <Separator className="mb-4" />

      {/* Group header: module name + count badge */}
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">
          {MODULE_LABELS[group.type] ?? group.type}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {group.count}
        </Badge>
      </div>

      {/* Result items (up to 5) */}
      <div className="divide-y divide-border">
        {previewResults.map((result) => (
          <SearchResultItem key={result.id} result={result} />
        ))}
      </div>

      {/* "Show N more" link when results exceed preview limit */}
      {remaining > 0 && (
        <div className="mt-3">
          <Link
            href={`/search?q=${encodeURIComponent(query)}&skill=${group.type}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Show {remaining} more &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
