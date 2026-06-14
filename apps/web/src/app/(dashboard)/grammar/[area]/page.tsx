/**
 * /grammar/[area] — Grammar topic list page.
 *
 * GRAM-01 (Screen 2): Displays topics for a grammar area in a stacked list.
 * Each row shows topic title, CEFR badge, mastery percentage (if > 0), and a chevron.
 *
 * Server Component: fetches topics from NestJS via fetchWithAuth with forwarded
 * JWE cookie against INTERNAL_API_URL. Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC: max-w-3xl, area name heading (28px/600), "{N} topics" subtitle, back link to /grammar.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CefrBadge } from "@/components/cefr-badge";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import type { GrammarTopicDto } from "@repo/shared";

async function fetchTopics(
  cookieHeader: string,
  area: string,
): Promise<GrammarTopicDto[]> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/grammar/areas/${area}/topics`,
    );
    if (!res.ok) return [];
    return res.json() as Promise<GrammarTopicDto[]>;
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ area: string }>;
}

export default async function GrammarAreaPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { area } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";
  const topics = await fetchTopics(cookieHeader, area);

  // Derive a display name from the slug (capitalize each word)
  const areaName = area
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <Link
        href="/grammar"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; Grammar
      </Link>

      {/* Page heading — Display 28px/600 per UI-SPEC */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight text-foreground">
          {areaName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {topics.length} topics
        </p>
      </div>

      {/* Topic list */}
      {topics.length > 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <ul className="flex flex-col divide-y divide-border">
            {topics.map((topic) => (
              <li key={topic.slug}>
                <Link
                  href={`/grammar/${area}/${topic.slug}`}
                  className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {/* Left: title + CEFR badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {topic.title}
                    </span>
                    <CefrBadge level={topic.cefrLevel} />
                  </div>

                  {/* Right: mastery % + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {topic.masteryPct != null && topic.masteryPct > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {Math.round(topic.masteryPct)}% mastered
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="py-16 text-center text-base text-muted-foreground">
          No topics in this area yet.
        </p>
      )}
    </div>
  );
}
