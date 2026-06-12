/**
 * CategoryCard — vocabulary category card component.
 *
 * VOCAB-01 (D-09): Displays a vocabulary category with its Lucide icon, name,
 * and word count. Links to /vocabulary/[slug] for the category word list.
 *
 * UI-SPEC: flex-col, card border, icon (aria-hidden), heading (20px/600), word count (14px/400 muted).
 */

"use client";

import Link from "next/link";
import {
  Briefcase,
  Plane,
  Cpu,
  GraduationCap,
  Heart,
  Home,
  Users,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Category slug → Lucide icon map (D-09 category icons from UI-SPEC)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  business: Briefcase,
  travel: Plane,
  technology: Cpu,
  education: GraduationCap,
  health: Heart,
  "daily-life": Home,
  "social-topics": Users,
  "academic-english": BookOpen,
};

interface CategoryCardProps {
  slug: string;
  name: string;
  wordCount: number;
  /** Additional CSS classes */
  className?: string;
}

export function CategoryCard({
  slug,
  name,
  wordCount,
  className,
}: CategoryCardProps) {
  const Icon = CATEGORY_ICONS[slug] ?? BookOpen;

  return (
    <Link
      href={`/vocabulary/${slug}`}
      data-testid="category-card"
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Icon — aria-hidden, purely decorative */}
      <span aria-hidden="true" className="text-foreground">
        <Icon className="h-8 w-8" />
      </span>

      {/* Category name — Heading 20px/600 */}
      <span className="text-center text-sm font-semibold text-foreground">
        {name}
      </span>

      {/* Word count — Label 14px/400 muted */}
      <span className="text-xs text-muted-foreground">{wordCount} words</span>
    </Link>
  );
}
