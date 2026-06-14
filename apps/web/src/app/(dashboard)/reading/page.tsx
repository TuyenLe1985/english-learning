/**
 * /reading — Reading Passages browse page.
 *
 * READ-01 / READ-06: Displays a filterable grid of reading passages.
 * Filters: CEFR level (All/B1/B2/C1 Tabs), topic (Select), content type (Select).
 * Filter state round-trips via URL search params — browser Back works correctly.
 *
 * Server Component: fetches passages from NestJS via fetchWithAuth with
 * forwarded JWE cookie against INTERNAL_API_URL. Auth-gated: redirects to
 * /login if no session.
 *
 * UI-SPEC Screen 1: passage card grid (responsive 1/2/3 cols), filter bar,
 * empty state, pagination.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { CefrBadge } from "@/components/cefr-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import type { ReadingPassageDto } from "@repo/shared";
import { ReadingFilters } from "./reading-filters";
import { ReadingPagination } from "./reading-pagination";

const PAGE_SIZE = 20;

interface FetchPassagesResult {
  passages: ReadingPassageDto[];
  total: number;
  page: number;
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
): Promise<FetchPassagesResult> {
  try {
    const url = new URL(`${INTERNAL_API_URL}/api/reading/passages`);
    if (params.cefrLevel) url.searchParams.set("cefrLevel", params.cefrLevel);
    if (params.topic) url.searchParams.set("topic", params.topic);
    if (params.contentType)
      url.searchParams.set("contentType", params.contentType);
    if (params.page) url.searchParams.set("page", params.page);
    url.searchParams.set("limit", String(PAGE_SIZE));

    const res = await fetchWithAuth(cookieHeader, url.toString());
    if (!res.ok) return { passages: [], total: 0, page: 1, totalPages: 0 };
    return res.json() as Promise<FetchPassagesResult>;
  } catch {
    return { passages: [], total: 0, page: 1, totalPages: 0 };
  }
}

/** Map DB content type enum to display label (UI-SPEC Copywriting Contract) */
function contentTypeLabel(ct: ReadingPassageDto["contentType"]): string {
  const map: Record<ReadingPassageDto["contentType"], string> = {
    ARTICLE: "Article",
    NEWS: "News",
    BLOG_POST: "Blog Post",
    ACADEMIC: "Academic",
    STORY: "Story",
    OPINION: "Opinion",
  };
  return map[ct] ?? ct;
}

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

  const sp = await searchParams;
  const cefrLevel = sp.level?.toUpperCase();
  const topic = sp.topic;
  const contentType = sp.type?.toUpperCase();
  const page = sp.page ?? "1";

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const { passages, total, totalPages } = await fetchPassages(cookieHeader, {
    cefrLevel,
    topic,
    contentType,
    page,
  });

  const currentPage = Number(page) || 1;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-foreground">
          Reading Passages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse passages at your CEFR level
        </p>
      </div>

      {/* Filter bar — client component for interactivity */}
      <div className="mb-6 rounded-lg bg-muted p-3">
        <ReadingFilters
          currentLevel={sp.level}
          currentTopic={sp.topic}
          currentType={sp.type}
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
                className="block"
              >
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    {/* Top row: CefrBadge + Bookmark icon */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <CefrBadge level={passage.cefrLevel} />
                      {passage.isBookmarked && (
                        <Bookmark className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                    </div>

                    {/* Title */}
                    <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">
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
                        {contentTypeLabel(passage.contentType)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <ReadingPagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={total}
                searchParams={sp}
              />
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
            Try adjusting your filters, or check back after the content pipeline
            has run.
          </p>
        </div>
      )}
    </div>
  );
}
