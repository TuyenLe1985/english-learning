"use client";

/**
 * QuizTypeSelector — Quiz browse card grid (Screen 1, UI-SPEC).
 *
 * Renders 6 quiz type cards (Mixed Skill + 5 topics).
 * On card click: POST to /api/quiz/sessions/start with { type },
 * then router.push to /quiz/[sessionId].
 *
 * Session data (QuizStartResponseDto) is stored in sessionStorage keyed by
 * sessionId so the session page can access questions without a re-fetch.
 *
 * Accessibility: full card is a button (keyboard/click), loading state shown
 * on clicked card only.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shuffle,
  Monitor,
  Plane,
  Briefcase,
  MessageCircle,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CefrBadge } from "@/components/cefr-badge";
import type { CefrLevel } from "@/components/cefr-badge";
import type { QuizStartResponseDto } from "@repo/shared";

// ─── Quiz type config ─────────────────────────────────────────────────────────

type QuizType =
  | "MIXED"
  | "technology"
  | "travel"
  | "business"
  | "daily-communication"
  | "education";

interface QuizTypeConfig {
  type: QuizType;
  name: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const QUIZ_TYPES: QuizTypeConfig[] = [
  {
    type: "MIXED",
    name: "Mixed Skill",
    subtitle: "Grammar, Vocabulary, Reading + Listening",
    Icon: Shuffle,
  },
  {
    type: "technology",
    name: "Technology",
    subtitle: "Tech topics and digital life",
    Icon: Monitor,
  },
  {
    type: "travel",
    name: "Travel",
    subtitle: "Travel, tourism and exploration",
    Icon: Plane,
  },
  {
    type: "business",
    name: "Business",
    subtitle: "Professional and workplace English",
    Icon: Briefcase,
  },
  {
    type: "daily-communication",
    name: "Daily Communication",
    subtitle: "Everyday conversations and social English",
    Icon: MessageCircle,
  },
  {
    type: "education",
    name: "Education",
    subtitle: "Academic English and learning contexts",
    Icon: GraduationCap,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuizTypeSelectorProps {
  cefrLevel?: CefrLevel;
}

// ─── QuizTypeSelector ─────────────────────────────────────────────────────────

export function QuizTypeSelector({ cefrLevel = "B2" }: QuizTypeSelectorProps) {
  const router = useRouter();
  const [loadingType, setLoadingType] = useState<QuizType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (type: QuizType) => {
    if (loadingType !== null) return;
    setLoadingType(type);
    setError(null);

    try {
      const res = await fetch("/api/quiz/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(
          err.error ?? "Not enough questions available for this topic. Try a different quiz type.",
        );
      }

      const data = (await res.json()) as QuizStartResponseDto;

      // Store session data in sessionStorage for QuizSession to read on mount
      sessionStorage.setItem(`quiz-session-${data.sessionId}`, JSON.stringify(data));

      router.push(`/quiz/${data.sessionId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Not enough questions available for this topic. Try a different quiz type.";
      setError(message);
      setLoadingType(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Card grid: 2 cols on md+, 1 col on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUIZ_TYPES.map(({ type, name, subtitle, Icon }) => {
          const isLoading = loadingType === type;
          const isDisabled = loadingType !== null && !isLoading;

          return (
            <button
              key={type}
              type="button"
              onClick={() => void handleStart(type)}
              disabled={isDisabled}
              aria-busy={isLoading}
              className={cn(
                "group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all",
                "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isLoading && "opacity-80",
                isDisabled && "cursor-not-allowed opacity-50",
              )}
            >
              {/* Icon */}
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                {isLoading ? (
                  <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                ) : (
                  <Icon className="size-6 text-foreground" />
                )}
              </div>

              {/* Name + subtitle */}
              <div>
                <p className="text-sm font-semibold text-foreground">{name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              </div>

              {/* Footer row: badge + question count + CTA text */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CefrBadge level={cefrLevel} />
                  <span className="text-xs text-muted-foreground">10 questions</span>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium text-primary transition-transform",
                    "group-hover:translate-x-0.5",
                  )}
                >
                  {isLoading ? "Starting..." : "Start Quiz →"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
