/**
 * ReadingFilters — client component for the reading browse page filter bar.
 *
 * Handles CEFR level Tabs, topic Select, and content type Select.
 * All filter state is persisted in URL search params (router.push) so that
 * the Server Component re-fetches filtered data and browser Back works.
 *
 * UI-SPEC Screen 1: filter bar with Tabs (All/B1/B2/C1) and two Select dropdowns.
 */

"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CEFR_TABS = [
  { label: "All levels", value: "" },
  { label: "B1", value: "B1" },
  { label: "B2", value: "B2" },
  { label: "C1", value: "C1" },
];

const TOPIC_OPTIONS = [
  { label: "Technology", value: "Technology" },
  { label: "Business", value: "Business" },
  { label: "Travel", value: "Travel" },
  { label: "Education", value: "Education" },
  { label: "Health", value: "Health" },
  { label: "Daily Life", value: "Daily Life" },
  { label: "Social Topics", value: "Social Topics" },
  { label: "Academic", value: "Academic" },
];

const TYPE_OPTIONS = [
  { label: "Article", value: "ARTICLE" },
  { label: "News", value: "NEWS" },
  { label: "Blog Post", value: "BLOG_POST" },
  { label: "Academic", value: "ACADEMIC" },
  { label: "Story", value: "STORY" },
  { label: "Opinion", value: "OPINION" },
];

interface ReadingFiltersProps {
  currentLevel?: string;
  currentTopic?: string;
  currentType?: string;
}

export function ReadingFilters({
  currentLevel,
  currentTopic,
  currentType,
}: ReadingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const buildUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const current = {
        level: currentLevel,
        topic: currentTopic,
        type: currentType,
        ...updates,
      };
      if (current.level) params.set("level", current.level);
      if (current.topic) params.set("topic", current.topic);
      if (current.type) params.set("type", current.type);
      // Reset page to 1 on filter change
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, currentLevel, currentTopic, currentType],
  );

  const handleLevelChange = (value: string) => {
    router.push(buildUrl({ level: value || undefined }));
  };

  const handleTopicChange = (value: string) => {
    router.push(buildUrl({ topic: value === "__all__" ? undefined : value }));
  };

  const handleTypeChange = (value: string) => {
    router.push(buildUrl({ type: value === "__all__" ? undefined : value }));
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* CEFR level tabs */}
      <Tabs
        value={currentLevel?.toUpperCase() ?? ""}
        onValueChange={handleLevelChange}
      >
        <TabsList>
          {CEFR_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Topic select */}
      <Select
        value={currentTopic ?? "__all__"}
        onValueChange={handleTopicChange}
      >
        <SelectTrigger className="w-[160px]" aria-label="Filter by topic">
          <SelectValue placeholder="All topics" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All topics</SelectItem>
          {TOPIC_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Content type select */}
      <Select
        value={currentType?.toUpperCase() ?? "__all__"}
        onValueChange={handleTypeChange}
      >
        <SelectTrigger className="w-[160px]" aria-label="Filter by content type">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All types</SelectItem>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
