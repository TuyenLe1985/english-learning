/**
 * SearchFilters — URL-driven filter bar for the search results page.
 *
 * Adapted from reading-filters.tsx. Handles URL-driven filter navigation.
 * User interactions push updated search params via router.push() so the
 * Server Component re-runs with the new filter values.
 *
 * Filters:
 * - CEFR level: All / B1 / B2 / C1 → ?level=
 * - Topic → ?topic=
 * - Skill (content type) → ?skill=
 *
 * Always preserves the ?q= param when navigating.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const CEFR_LEVELS = ["B1", "B2", "C1"] as const;

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

const SKILLS = [
  { value: "grammar", label: "Grammar" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
];

interface SearchFiltersProps {
  currentLevel: string;
  currentTopic: string;
  currentSkill: string;
}

export function SearchFilters({
  currentLevel,
  currentTopic,
  currentSkill,
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "__all__") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      return `/search?${params.toString()}`;
    },
    [searchParams],
  );

  const handleLevelChange = (level: string) => {
    router.push(buildUrl({ level }));
  };

  const handleTopicChange = (topic: string) => {
    router.push(buildUrl({ topic }));
  };

  const handleSkillChange = (skill: string) => {
    router.push(buildUrl({ skill }));
  };

  const clearAll = () => {
    const q = searchParams.get("q") ?? "";
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const hasActiveFilters = currentLevel || currentTopic || currentSkill;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* CEFR level Select */}
      <Select
        value={currentLevel || "__all__"}
        onValueChange={handleLevelChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All levels</SelectItem>
          {CEFR_LEVELS.map((level) => (
            <SelectItem key={level} value={level}>
              {level}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Topic Select */}
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

      {/* Skill (content type) Select */}
      <Select
        value={currentSkill || "__all__"}
        onValueChange={handleSkillChange}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All skills" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All skills</SelectItem>
          {SKILLS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active filter chips */}
      {currentLevel && (
        <Badge
          variant="secondary"
          className="flex cursor-pointer items-center gap-1"
          onClick={() => handleLevelChange("__all__")}
        >
          {currentLevel}
          <X className="h-3 w-3" />
        </Badge>
      )}
      {currentTopic && (
        <Badge
          variant="secondary"
          className="flex cursor-pointer items-center gap-1"
          onClick={() => handleTopicChange("__all__")}
        >
          {currentTopic}
          <X className="h-3 w-3" />
        </Badge>
      )}
      {currentSkill && (
        <Badge
          variant="secondary"
          className="flex cursor-pointer items-center gap-1"
          onClick={() => handleSkillChange("__all__")}
        >
          {SKILLS.find((s) => s.value === currentSkill)?.label ?? currentSkill}
          <X className="h-3 w-3" />
        </Badge>
      )}

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
