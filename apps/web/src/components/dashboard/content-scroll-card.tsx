/**
 * ContentScrollCard — single card for RecentlyViewedRow and BookmarkedRow.
 *
 * UI-SPEC: w-[200px] flex-shrink-0, title + CefrBadge + module icon + content-type label.
 * Used inside ScrollArea horizontal scroll rows (D-04).
 */

"use client";

import Link from "next/link";
import { BookOpen, Headphones, BookText, Layers, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CefrBadge, type CefrLevel } from "@/components/cefr-badge";

interface ContentScrollCardProps {
  id: string;
  title: string;
  type: string; // 'reading' | 'listening' | 'grammar' | 'vocabulary' | 'quiz'
  cefrLevel: CefrLevel | null;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  reading: BookOpen,
  listening: Headphones,
  grammar: BookText,
  vocabulary: Layers,
  quiz: HelpCircle,
};

const TYPE_LABELS: Record<string, string> = {
  reading: "Reading Passage",
  listening: "Listening",
  grammar: "Grammar Lesson",
  vocabulary: "Vocabulary",
  quiz: "Quiz",
};

const TYPE_ROUTES: Record<string, string> = {
  reading: "/reading",
  listening: "/listening",
  grammar: "/grammar",
  vocabulary: "/vocabulary",
  quiz: "/quiz",
};

export function ContentScrollCard({ id, title, type, cefrLevel }: ContentScrollCardProps) {
  const normalizedType = type.toLowerCase();
  const Icon = TYPE_ICONS[normalizedType] ?? BookOpen;
  const typeLabel = TYPE_LABELS[normalizedType] ?? type;
  const route = `${TYPE_ROUTES[normalizedType] ?? "/reading"}/${id}`;

  return (
    <Link href={route} className="block w-[200px] flex-shrink-0">
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-3 flex flex-col gap-2">
          {/* Module icon + CEFR badge row */}
          <div className="flex items-center justify-between gap-2">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            {cefrLevel && <CefrBadge level={cefrLevel} />}
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {title}
          </p>

          {/* Content type label */}
          <span className="text-xs text-muted-foreground mt-auto">{typeLabel}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
