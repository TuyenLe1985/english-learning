/**
 * /reading — Reading Passages browse page.
 *
 * READ-01: Displays reading passages in a responsive 3-column grid with
 * CEFR level filter tabs (All/B1/B2/C1), topic Select, and content type Select.
 * Filter state round-trips via URL search params: ?level=B2&topic=technology&type=ARTICLE.
 *
 * Server Component: fetches passages from NestJS via fetchWithAuth with forwarded
 * JWE cookie against INTERNAL_API_URL. Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC: Screen 1 — passage card anatomy, filter bar layout, grid responsive classes.
 * Copywriting Contract: "Reading Passages" h1, "Browse passages at your CEFR level" subtitle.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/cefr-badge";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import type { ReadingPassageDto } from "@repo/shared";
import { ReadingFilters } from "./reading-filters";

interface PassageBrowseResult {
  passages: ReadingPassageDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchPassages(
  cookieHeader: string,
  params: {
    cefrLevel?: string;
    topic?: string;
    contentType?: string;
    page?: string;
  },
): Promise<PassageBrowseResult> {
  try {
    const url = new URL(`${INTERNAL_API_URL}/api/reading/passages`);
    if (params.cefrLevel && params.cefrLevel !== "all")
      url.searchParams.set("cefrLevel", params.cefrLevel);
    if (params.topic) url.searchParams.set("topic", params.topic);
    if (params.contentType) url.searchParams.set("contentType", params.contentType);
    if (params.page) url.searchParams.set("page", params.page);
    const res = await fetchWithAuth(cookieHeader, url.toString());
    if (!res.ok) return { passages: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    return res.json() as Promise<PassageBrowseResult>;
  } catch {
    return { passages: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  ARTICLE: "Article",
  NEWS: "News",
  BLOG_POST: "Blog Post",
  ACADEMIC: "Academic",
  STORY: "Story",
  OPINION: "Opinion",
};

interface Props {
  searchParams: Promise<{
    level?: string;
    topic?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function ReadingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const { level, topic, type, page } = await searchParams;

  const data = await fetchPassages(cookieHeader, {
    cefrLevel: level,
    topic,
    contentType: type,
    page,
  });

  const { passages, totalPages, page: currentPage } = data;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Reading Passages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse passages at your CEFR level
        </p>
      </div>

      {/* Filter bar — ReadingFilters is "use client" for URL-driven interactivity */}
      <div className="mb-6 rounded-lg bg-muted p-3">
        <ReadingFilters
          currentLevel={level ?? "all"}
          currentTopic={topic ?? ""}
          currentType={type ?? ""}
        />
      </div>

      {/* Passage grid */}
      {passages.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {passages.map((passage) => (
              <Link
                key={passage.id}
                href={`/reading/${passage.id}`}
                className="group block"
              >
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    {/* Top row: CEFR badge + bookmark icon */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <CefrBadge level={passage.cefrLevel} />
                      <button
                        type="button"
                        aria-label={
                          passage.isBookmarked
                            ? "Remove bookmark"
                            : "Bookmark passage"
                        }
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-colors hover:bg-accent"
                        onClick={(e) => e.preventDefault()}
                      >
                        {passage.isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 text-amber-400" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Title */}
                    <p className="mb-3 line-clamp-2 text-sm font-semibold text-foreground">
                      {passage.title}
                    </p>

                    {/* Metadata row: topic badge + word count */}
                    <div className="flex flex-wrap items-center gap-2">
                      {passage.topic && (
                        <Badge variant="secondary" className="text-xs">
                          {passage.topic}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ~{passage.wordCount} words
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {CONTENT_TYPE_LABELS[passage.contentType] ??
                          passage.contentType}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => {
                  const params = new URLSearchParams();
                  if (level) params.set("level", level);
                  if (topic) params.set("topic", topic);
                  if (type) params.set("type", type);
                  params.set("page", String(pageNum));
                  return (
                    <Link
                      key={pageNum}
                      href={`/reading?${params.toString()}`}
                      className={[
                        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border text-sm font-medium transition-colors",
                        pageNum === currentPage
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {pageNum}
                    </Link>
                  );
                },
              )}
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div role="status" className="py-16 text-center">
          <p className="text-base font-semibold text-foreground">
            No passages match your filters
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your filters, or check back after the content
            pipeline has run.
          </p>
        </div>
      )}
    </div>
  );
}
