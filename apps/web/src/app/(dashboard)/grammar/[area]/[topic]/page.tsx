/**
 * /grammar/[area]/[topic] — Grammar topic detail page with lesson list and mastery bar.
 *
 * GRAM-01 + GRAM-06 (Screen 3): Shows topic overview, mastery progress bar,
 * "Review weak exercises" CTA (linked to the first lesson with ?review=weak),
 * and the list of lessons for the topic.
 *
 * Server Component: fetches GrammarTopicDetailDto from NestJS via getSessionToken().
 * Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC: max-w-3xl, topic heading + inline CefrBadge, mastery section (when masteryPct != null),
 *          "Review weak exercises" Button when masteryPct < 100 and lessons exist,
 *          lesson cards linking to /grammar/[area]/[topic]/[lesson.slug].
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CefrBadge } from "@/components/cefr-badge";
import { Progress } from "@/components/ui/progress";
import { getSessionToken } from "@/lib/get-session-token";
import type { GrammarTopicDetailDto } from "@repo/shared";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

async function fetchTopicDetail(
  topicSlug: string,
): Promise<GrammarTopicDetailDto | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(
      `${API_URL}/api/grammar/topics/${topicSlug}/lessons`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<GrammarTopicDetailDto>;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ area: string; topic: string }>;
}

export default async function GrammarTopicPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { area, topic: topicSlug } = await params;
  const data = await fetchTopicDetail(topicSlug);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/grammar/${area}`}
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back
        </Link>
        <p
          role="status"
          className="py-16 text-center text-base text-muted-foreground"
        >
          Could not load this topic. Try refreshing the page.
        </p>
      </div>
    );
  }

  const { topic, lessons } = data;

  // Derive area display name for back link label
  const areaName = area
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const hasMastery = topic.masteryPct != null;
  const isIncomplete =
    hasMastery && topic.masteryPct != null && topic.masteryPct < 100;
  const firstLessonSlug = lessons[0]?.slug ?? null;
  const showWeakCta = isIncomplete && lessons.length > 0 && firstLessonSlug;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link to area */}
      <Link
        href={`/grammar/${area}`}
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; {areaName}
      </Link>

      {/* Page heading + inline CEFR badge */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <h1 className="text-[28px] font-semibold leading-tight text-foreground">
          {topic.title}
        </h1>
        <CefrBadge level={topic.cefrLevel} />
      </div>

      {/* Mastery section — shown when user has prior attempts */}
      {hasMastery && topic.masteryPct != null && (
        <div className="mt-4 flex flex-col gap-1 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your mastery</span>
            <span className="text-sm font-semibold text-foreground">
              {Math.round(topic.masteryPct)}%
            </span>
          </div>
          <Progress
            value={topic.masteryPct}
            className="h-2 max-w-xs"
            aria-label="Topic mastery"
          />

          {/* Review weak exercises CTA — only when incomplete and first lesson exists */}
          {showWeakCta && (
            <Link
              href={`/grammar/${area}/${topicSlug}/${firstLessonSlug}?review=weak`}
              className="mt-4 inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors self-start"
            >
              Review weak exercises
            </Link>
          )}
        </div>
      )}

      {/* Lessons section */}
      <h2 className="text-base font-semibold text-foreground mt-8 mb-3">
        Lessons
      </h2>

      {lessons.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {lessons.map((lesson) => (
            <li key={lesson.slug}>
              <Link
                href={`/grammar/${area}/${topicSlug}/${lesson.slug}`}
                className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow"
              >
                {/* Left: lesson title + question count */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {lesson.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lesson.questionCount} questions
                  </p>
                </div>

                {/* Right: chevron */}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-16 text-center text-base text-muted-foreground">
          No lessons available for this topic yet.
        </p>
      )}
    </div>
  );
}
