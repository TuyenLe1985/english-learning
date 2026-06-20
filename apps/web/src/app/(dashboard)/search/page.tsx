/**
 * /search — Search results page (Server Component).
 *
 * SRCH-01/03/04: Displays search results grouped by content type with
 * CEFR badge, topic, content-type label, and highlighted snippet.
 * Supports filtering by CEFR level (?level=), topic (?topic=), skill (?skill=).
 *
 * Server Component: reads URL searchParams, fetches from NestJS via INTERNAL_API_URL
 * with forwarded JWE cookie. Auth-gated: redirects to /login if no session.
 * Only fetches when ?q= is non-empty.
 *
 * UI-SPEC: Screen 4 — search results layout, grouped result anatomy.
 * Copywriting Contract: "Search results for..." heading, "{n} results across {m} categories".
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResultGroup } from "@/components/search/search-result-group";
import type { SearchResponseDto } from "@repo/shared";

export const metadata: Metadata = {
  title: "Search — English Learning",
};

// Fixed display order per SRCH-04 / D-10
const GROUP_ORDER = ["vocabulary", "grammar", "reading", "listening", "quiz"];

interface Props {
  searchParams: Promise<{
    q?: string;
    level?: string;
    topic?: string;
    skill?: string;
  }>;
}

async function fetchSearchResults(
  cookieHeader: string,
  params: { q: string; level?: string; topic?: string; skill?: string },
): Promise<SearchResponseDto | null> {
  try {
    const url = new URL(`${INTERNAL_API_URL}/api/search`);
    url.searchParams.set("q", params.q);
    if (params.level) url.searchParams.set("level", params.level);
    if (params.topic) url.searchParams.set("topic", params.topic);
    if (params.skill) url.searchParams.set("skill", params.skill);

    const res = await fetchWithAuth(cookieHeader, url.toString());
    if (!res.ok) return null;
    return res.json() as Promise<SearchResponseDto>;
  } catch {
    return null;
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { q, level, topic, skill } = await searchParams;
  const query = q?.trim() ?? "";

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Skip fetch on empty query — show prompt state instead
  let results: SearchResponseDto | null = null;
  let fetchError = false;

  if (query) {
    results = await fetchSearchResults(cookieHeader, {
      q: query,
      level,
      topic,
      skill,
    });
    if (results === null) fetchError = true;
  }

  // Sort groups by fixed order
  const orderedGroups = results
    ? GROUP_ORDER.map((type) =>
        results!.groups.find((g) => g.type === type),
      ).filter(Boolean)
    : [];

  const groupCount = orderedGroups.length;

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        {query ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">
              Search results for &ldquo;{query}&rdquo;
            </h1>
            {results && (
              <p className="mt-1 text-sm text-muted-foreground">
                {results.total} result{results.total !== 1 ? "s" : ""} across{" "}
                {groupCount} {groupCount !== 1 ? "categories" : "category"}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-foreground">Search</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search lessons, vocabulary, passages, and more.
            </p>
          </>
        )}
      </div>

      {/* Filter bar */}
      {query && (
        <div className="mb-6 rounded-lg bg-muted p-3">
          <SearchFilters
            currentLevel={level ?? ""}
            currentTopic={topic ?? ""}
            currentSkill={skill ?? ""}
          />
        </div>
      )}

      {/* Results */}
      {!query && (
        <div role="status" className="py-16 text-center">
          <p className="text-base font-semibold text-foreground">
            Start typing to search
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Search across vocabulary, grammar lessons, reading passages, and
            listening content.
          </p>
        </div>
      )}

      {query && fetchError && (
        <div role="alert" className="py-16 text-center">
          <p className="text-base font-semibold text-destructive">
            Something went wrong
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t complete your search. Please try again in a moment.
          </p>
        </div>
      )}

      {query && !fetchError && results && results.total === 0 && (
        <div role="status" className="py-16 text-center">
          <p className="text-base font-semibold text-foreground">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search or filters. Results improve as more
            content is indexed.
          </p>
        </div>
      )}

      {query && !fetchError && results && results.total > 0 && (
        <div>
          {orderedGroups.map((group) => (
            <SearchResultGroup
              key={group!.type}
              group={group!}
              query={query}
            />
          ))}
        </div>
      )}
    </div>
  );
}
