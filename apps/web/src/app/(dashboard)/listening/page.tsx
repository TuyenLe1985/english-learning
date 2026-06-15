/**
 * /listening — Listening comprehension browse page.
 *
 * LIST-01: Displays browsable listening items filtered by CEFR level, topic,
 * and content type. Renders a grid of ListeningItemCards.
 *
 * Server Component: fetches items from NestJS via fetchWithAuth with forwarded
 * JWE cookie against INTERNAL_API_URL. Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC: "Listening" heading (28px/600), filter bar with CEFR tabs + selects,
 * responsive grid (1→2→3 columns), empty state.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import { ListeningItemCard } from "@/components/listening/listening-item-card";
import { ListeningFilters } from "@/components/listening/listening-filters";
import type { ListeningItemDto, PaginatedListeningItemsDto } from "@repo/shared";
import { cn } from "@/lib/utils";

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function fetchListeningItems(
  cookieHeader: string,
  params: URLSearchParams,
): Promise<PaginatedListeningItemsDto> {
  const empty: PaginatedListeningItemsDto = {
    items: [],
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
  };
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/listening/items?${params.toString()}`,
    );
    if (!res.ok) return empty;
    return res.json() as Promise<PaginatedListeningItemsDto>;
  } catch {
    return empty;
  }
}

// ─── CEFR tab config ──────────────────────────────────────────────────────────

const CEFR_TABS = [
  { label: "All", value: "" },
  { label: "B1", value: "B1" },
  { label: "B2", value: "B2" },
  { label: "C1", value: "C1" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{
    level?: string;
    topic?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function ListeningPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { level, topic, type, page } = await searchParams;

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Build query params: map UI keys → API field names
  const apiParams = new URLSearchParams();
  if (level) apiParams.set("cefrLevel", level);
  if (topic) apiParams.set("topic", topic);
  if (type) apiParams.set("contentType", type);
  if (page) apiParams.set("page", page);
  apiParams.set("limit", "12");

  const data = await fetchListeningItems(cookieHeader, apiParams);

  const { items, total, page: currentPage, limit, totalPages } = data;

  // Deduplicate topics from current results for the filter select
  const topicSet = new Set<string>();
  items.forEach((item: ListeningItemDto) => {
    if (item.topic) topicSet.add(item.topic);
  });
  const topics = Array.from(topicSet).sort();

  const currentPageNum = currentPage ?? 1;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-foreground">Listening</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practice your listening comprehension
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-muted rounded-lg p-3 mb-6 flex flex-wrap gap-4 items-center">
        {/* CEFR level tabs (Link-based — server-side navigation) */}
        <div className="flex items-center gap-1">
          {CEFR_TABS.map((tab) => {
            const isActive = (level ?? "") === tab.value;
            const href = tab.value
              ? `/listening?level=${tab.value}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}${type ? `&type=${encodeURIComponent(type)}` : ""}`
              : `/listening${topic ? `?topic=${encodeURIComponent(topic)}` : ""}${type ? `${topic ? "&" : "?"}type=${encodeURIComponent(type)}` : ""}`;

            return (
              <Link
                key={tab.value}
                href={href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Topic + type selects (client component — need useState for dropdowns) */}
        <ListeningFilters
          currentTopic={topic}
          currentType={type}
          topics={topics}
        />
      </div>

      {/* Results count */}
      {total > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          {total} item{total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Item grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item: ListeningItemDto) => (
            <ListeningItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div role="status" className="py-16 text-center">
          <p className="text-base font-medium text-foreground">
            No listening items match your filters
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your filters, or check back after the content pipeline
            has run.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {currentPageNum > 1 && (
            <Link
              href={`/listening?${new URLSearchParams({
                ...(level ? { level } : {}),
                ...(topic ? { topic } : {}),
                ...(type ? { type } : {}),
                page: String(currentPageNum - 1),
              }).toString()}`}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              &larr; Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {currentPageNum} of {totalPages}
          </span>
          {currentPageNum < totalPages && (
            <Link
              href={`/listening?${new URLSearchParams({
                ...(level ? { level } : {}),
                ...(topic ? { topic } : {}),
                ...(type ? { type } : {}),
                page: String(currentPageNum + 1),
              }).toString()}`}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              Next &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
