/**
 * ReadingFilters — "use client" filter bar for the reading browse page.
 *
 * Handles URL-driven filter navigation. User interactions push updated
 * search params via router.push() so the Server Component re-runs with
 * the new filter values. Browser Back works correctly with URL state.
 *
 * Filters:
 * - CEFR level Tabs: All / B1 / B2 / C1 → ?level=
 * - Topic Select → ?topic=
 * - Content type Select → ?type=
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TOPICS = [
  "Technology",
  "Business",
  "Travel",
  "Education",
  "Health",
  "Daily Life",
  "Social Topics",
  "Academic",
];

const CONTENT_TYPES = [
  { value: "ARTICLE", label: "Article" },
  { value: "NEWS", label: "News" },
  { value: "BLOG_POST", label: "Blog Post" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "STORY", label: "Story" },
  { value: "OPINION", label: "Opinion" },
];

interface ReadingFiltersProps {
  currentLevel: string;
  currentTopic: string;
  currentType: string;
}

export function ReadingFilters({
  currentLevel,
  currentTopic,
  currentType,
}: ReadingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset to page 1 on any filter change
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all" && value !== "__all__") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      return `/reading?${params.toString()}`;
    },
    [searchParams],
  );

  const handleLevelChange = (level: string) => {
    router.push(buildUrl({ level }));
  };

  const handleTopicChange = (topic: string) => {
    router.push(buildUrl({ topic }));
  };

  const handleTypeChange = (type: string) => {
    router.push(buildUrl({ type }));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* CEFR level tabs */}
      <Tabs
        value={currentLevel || "all"}
        onValueChange={handleLevelChange}
      >
        <TabsList>
          <TabsTrigger value="all">All levels</TabsTrigger>
          <TabsTrigger value="B1">B1</TabsTrigger>
          <TabsTrigger value="B2">B2</TabsTrigger>
          <TabsTrigger value="C1">C1</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Topic select */}
      <Select
        value={currentTopic || "__all__"}
        onValueChange={handleTopicChange}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All topics" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All topics</SelectItem>
          {TOPICS.map((topic) => (
            <SelectItem key={topic} value={topic}>
              {topic}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Content type select */}
      <Select
        value={currentType || "__all__"}
        onValueChange={handleTypeChange}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All types</SelectItem>
          {CONTENT_TYPES.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
