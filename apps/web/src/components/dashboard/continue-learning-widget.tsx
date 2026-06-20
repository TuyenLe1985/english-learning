/**
 * ContinueLearningWidget — 3-state Continue Learning section.
 *
 * DASH-02, ADPT-03/05, D-03/07/08:
 * State 1 — pre-threshold (< 5 exercises):
 *   "Begin your journey" / "Start {Module Name} to build..." / "Start {Module Name}" CTA
 * State 2 — weak skill found:
 *   "Work on {Skill Area}" / "Your lowest skill at {accuracy}% — keep practicing..." / "Start {Skill Area} Lesson"
 * State 3 — all healthy (all skills >= 60%):
 *   "You're on track" / "All skills above 60% — try a quiz..." / "Take a Quiz"
 *
 * UI-SPEC: min-h-[120px], CTA primary variant min-h-[44px], framer-motion opacity.
 * Copywriting Contract: exact copy strings per UI-SPEC.
 */

"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { BookOpen, Headphones, BookText, Layers, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ContinueLearningDto } from "@repo/shared";

interface ContinueLearningWidgetProps {
  recommendation: ContinueLearningDto;
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  READING: BookOpen,
  LISTENING: Headphones,
  GRAMMAR: BookText,
  VOCABULARY: Layers,
  MIXED: HelpCircle,
};

const MODULE_LABELS: Record<string, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  GRAMMAR: "Grammar",
  VOCABULARY: "Vocabulary",
  MIXED: "Quiz",
};

const MODULE_ROUTES: Record<string, string> = {
  READING: "/reading",
  LISTENING: "/listening",
  GRAMMAR: "/grammar",
  VOCABULARY: "/vocabulary",
  MIXED: "/quiz",
};

export function ContinueLearningWidget({ recommendation }: ContinueLearningWidgetProps) {
  const router = useRouter();

  const {
    preThreshold,
    weakestSkill,
    accuracy,
    recommendedModule,
  } = recommendation;

  // Determine state and content
  let heading: string;
  let subCopy: string;
  let ctaLabel: string;
  let ctaRoute: string;
  let ctaAriaLabel: string;
  let ModuleIcon: React.ElementType;

  if (preThreshold) {
    // State 1: Pre-threshold
    const module = recommendedModule ?? "READING";
    const moduleLabel = MODULE_LABELS[module] ?? "Reading";
    const IconComponent = MODULE_ICONS[module] ?? BookOpen;
    ModuleIcon = IconComponent;
    heading = "Begin your journey";
    subCopy = `Start ${moduleLabel} to build your first skill score`;
    ctaLabel = `Start ${moduleLabel}`;
    ctaRoute = MODULE_ROUTES[module] ?? "/reading";
    ctaAriaLabel = `Continue learning: ${moduleLabel}`;
  } else if (weakestSkill) {
    // State 2: Weak skill found
    const skillLabel = MODULE_LABELS[weakestSkill] ?? weakestSkill;
    const IconComponent = MODULE_ICONS[weakestSkill] ?? BookOpen;
    ModuleIcon = IconComponent;
    const accuracyPct = accuracy !== undefined ? Math.round(accuracy * 100) : 0;
    heading = `Work on ${skillLabel}`;
    subCopy = `Your lowest skill at ${accuracyPct}% — keep practicing to improve`;
    ctaLabel = `Start ${skillLabel} Lesson`;
    ctaRoute = MODULE_ROUTES[weakestSkill] ?? "/reading";
    ctaAriaLabel = `Continue learning: ${skillLabel}`;
  } else {
    // State 3: All healthy
    ModuleIcon = HelpCircle;
    heading = "You're on track";
    subCopy = "All skills above 60% — try a quiz to push further";
    ctaLabel = "Take a Quiz";
    ctaRoute = "/quiz";
    ctaAriaLabel = "Continue learning: Quiz";
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      <Card className="min-h-[120px]">
        <CardContent className="p-4 flex flex-col gap-3">
          {/* Module icon + heading */}
          <div className="flex items-center gap-3">
            <ModuleIcon className="h-6 w-6 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <h3 className="text-base font-semibold text-foreground">{heading}</h3>
          </div>

          {/* Sub-copy */}
          <p className="text-sm text-muted-foreground">{subCopy}</p>

          {/* CTA button */}
          <Button
            variant="default"
            className="w-full min-h-[44px]"
            aria-label={ctaAriaLabel}
            onClick={() => router.push(ctaRoute)}
          >
            {ctaLabel}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
