/**
 * /reading/[passageId] — Reading Passage detail page.
 *
 * READ-06: Server Component that fetches passage detail from NestJS and
 * renders the passage header, body (temporary dangerouslySetInnerHTML
 * fallback), and questions section placeholder.
 *
 * PassageRenderer and QuestionsSection client components (full interactive
 * implementation) are added in plan 05-07. This plan wires the data
 * fetch and the server-rendered HTML shell.
 *
 * Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC Screen 2, §2a: passage header anatomy.
 * Security: T-05-06-01 — content sanitized by isomorphic-dompurify in
 * SeedService before DB storage; 05-07 adds client-side DOMPurify in
 * PassageRenderer.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronLeft, Clock, Bookmark } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/cefr-badge";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import type { ReadingPassageDetailDto } from "@repo/shared";

async function fetchPassageDetail(
  cookieHeader: string,
  passageId: string,
): Promise<ReadingPassageDetailDto | null> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/reading/passages/${passageId}`,
    );
    if (!res.ok) return null;
    return res.json() as Promise<ReadingPassageDetailDto>;
  } catch {
    return null;
  }
}

/** Map DB content type enum to display label (UI-SPEC Copywriting Contract) */
function contentTypeLabel(ct: ReadingPassageDetailDto["contentType"]): string {
  const map: Record<ReadingPassageDetailDto["contentType"], string> = {
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
  params: Promise<{ passageId: string }>;
}

export default async function ReadingPassagePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { passageId } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const data = await fetchPassageDetail(cookieHeader, passageId);

  // 404 / error state (UI-SPEC Copywriting Contract)
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/reading"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Reading
        </Link>
        <p
          role="status"
          className="py-16 text-center text-base text-muted-foreground"
        >
          Could not load this passage. Try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ── 2a. Passage header ───────────────────────────────────────────── */}

      {/* Back link */}
      <Link
        href="/reading"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Reading
      </Link>

      {/* Passage title */}
      <h1 className="mb-3 text-[20px] font-semibold leading-snug text-foreground">
        {data.title}
      </h1>

      {/* Metadata row: CefrBadge · topic · word count · content type */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <CefrBadge level={data.cefrLevel} />
        {data.topic && (
          <Badge variant="secondary" className="text-xs">
            {data.topic}
          </Badge>
        )}
        <span>~{data.wordCount} words</span>
        <span>·</span>
        <span>{contentTypeLabel(data.contentType)}</span>
      </div>

      {/* Action row: timer (placeholder — starts client-side in PassageRenderer) + Bookmark */}
      <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span aria-live="polite">0m 0s</span>
        </span>
        <button
          aria-label={
            data.isBookmarked ? "Remove bookmark" : "Bookmark passage"
          }
          className="inline-flex min-h-[44px] items-center gap-1 transition-colors"
        >
          <Bookmark
            className={`h-4 w-4 ${
              data.isBookmarked
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
          <span>{data.isBookmarked ? "Bookmarked" : "Bookmark"}</span>
        </button>
      </div>

      {/* ── 2b. Passage body ─────────────────────────────────────────────────
           Temporary dangerouslySetInnerHTML fallback.
           Content was sanitized by isomorphic-dompurify in SeedService before
           DB storage (T-05-06-01). PassageRenderer (05-07) replaces this with
           a "use client" component that runs DOMPurify client-side again and
           wraps each word in interactive <span> elements.
      ──────────────────────────────────────────────────────────────────────── */}
      <div
        className="max-w-[65ch] text-[18px] leading-[1.75] text-foreground"
        /* eslint-disable-next-line react/no-danger */
        dangerouslySetInnerHTML={{ __html: data.content }}
      />

      <Separator className="my-8" />

      {/* ── 2c. Questions section placeholder ────────────────────────────────
           Full interactive QuestionsSection client component added in 05-07.
           Renders static heading with question count as placeholder.
      ──────────────────────────────────────────────────────────────────────── */}
      <section aria-label="Comprehension Questions">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Comprehension Questions
          {data.questions.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">
              ({data.questions.length} questions)
            </span>
          )}
        </h2>

        {data.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questions available for this passage.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Interactive questions will be available in the next update.
          </p>
        )}
      </section>
    </div>
  );
}
