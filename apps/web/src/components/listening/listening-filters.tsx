/**
 * ListeningFilters — Client component for topic and content type filter selects.
 *
 * Handles URL-based filter state via router.push for Next.js App Router
 * server-side filtering. Topic and content type are select dropdowns
 * that update the search params and cause the Server Component to re-fetch.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface ListeningFiltersProps {
  currentTopic?: string;
  currentType?: string;
  topics: string[];
}

const CONTENT_TYPES = [
  { value: "", label: "All Types" },
  { value: "CONVERSATION", label: "Conversation" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "PODCAST", label: "Podcast" },
  { value: "LECTURE", label: "Lecture" },
  { value: "NEWS_REPORT", label: "News Report" },
];

export function ListeningFilters({
  currentTopic,
  currentType,
  topics,
}: ListeningFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      router.push(`/listening?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <>
      {/* Topic select */}
      <div className="flex items-center gap-2">
        <label htmlFor="topic-filter" className="text-sm text-muted-foreground whitespace-nowrap">
          Topic
        </label>
        <select
          id="topic-filter"
          value={currentTopic ?? ""}
          onChange={(e) => updateFilter("topic", e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Content type select */}
      <div className="flex items-center gap-2">
        <label htmlFor="type-filter" className="text-sm text-muted-foreground whitespace-nowrap">
          Type
        </label>
        <select
          id="type-filter"
          value={currentType ?? ""}
          onChange={(e) => updateFilter("type", e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
