/**
 * GrammarAreaCard — grammar area card component.
 *
 * GRAM-01: Displays a grammar area with its Lucide icon, name, and topic count.
 * Links to /grammar/[slug] for the area's topic list.
 *
 * UI-SPEC: flex-col, card border, icon (aria-hidden), name (sm font-semibold), topic count (xs muted).
 */

"use client";

import Link from "next/link";
import {
  Clock,
  HelpCircle,
  GitBranch,
  RefreshCw,
  Link as LinkIcon,
  MessageSquare,
  AlignCenter,
  Type,
  MapPin,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Grammar area slug → Lucide icon map (UI-SPEC Screen 1 icon map)
const AREA_ICONS: Record<string, LucideIcon> = {
  "verb-tenses": Clock,
  "modal-verbs": HelpCircle,
  conditionals: GitBranch,
  "passive-voice": RefreshCw,
  "relative-clauses": LinkIcon,
  "reported-speech": MessageSquare,
  "gerunds-infinitives": AlignCenter,
  articles: Type,
  prepositions: MapPin,
  "linking-words": Shuffle,
};

interface GrammarAreaCardProps {
  slug: string;
  name: string;
  topicCount: number;
  /** Additional CSS classes */
  className?: string;
}

export function GrammarAreaCard({
  slug,
  name,
  topicCount,
  className,
}: GrammarAreaCardProps) {
  const Icon = AREA_ICONS[slug] ?? Clock;

  return (
    <Link
      href={`/grammar/${slug}`}
      data-testid="grammar-area-card"
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Icon — aria-hidden, purely decorative */}
      <span aria-hidden="true" className="text-foreground">
        <Icon className="h-8 w-8" />
      </span>

      {/* Area name */}
      <span className="text-center text-sm font-semibold text-foreground">
        {name}
      </span>

      {/* Topic count */}
      <span className="text-xs text-muted-foreground">{topicCount} topics</span>
    </Link>
  );
}
