/**
 * StatusFilter — Tabs component for filtering personal vocabulary by SRS status.
 *
 * UI-SPEC /vocabulary/my-words:
 *   - 5 tabs: All | New | Learning | Review | Mastered
 *   - shadcn Tabs provides role="tablist" / role="tab" / role="tabpanel" automatically
 *
 * VOCAB-07: Personal vocabulary list filtered by SRS status.
 */

"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type StatusFilterValue = "all" | "new" | "learning" | "reviewing" | "mastered";

interface StatusFilterProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

const STATUS_TABS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "reviewing", label: "Review" },
  { value: "mastered", label: "Mastered" },
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as StatusFilterValue)}>
      <TabsList className="flex flex-wrap gap-1 h-auto">
        {STATUS_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
