/**
 * /reading/[passageId] — Passage reader page.
 *
 * READ-06: Server Component that fetches the full passage detail from NestJS,
 * renders the passage header, and provides the HTML content + questions via
 * placeholder implementations until PassageRenderer and QuestionsSection
 * client components are wired in plan 05-07.
 *
 * Server Component: fetches from NestJS via fetchWithAuth. Auth-gated.
 *
 * UI-SPEC: Screen 2 — passage header anatomy (back link, title, metadata, action row),
 * passage body (dangerouslySetInnerHTML temporary fallback), questions section placeholder.
 * Copywriting: "Back to Reading" link, "Comprehension Questions" heading.
 *
 * SECURITY (T-05-06-01): Content was sanitized by isomorphic-dompurify in SeedService
 * before DB storage. PassageRenderer (plan 05-07) will add a second client-side DOMPurify
 * pass. The temporary dangerouslySetInnerHTML here is therefore safe for the transition period.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronLeft, Clock, Bookmark, BookmarkCheck, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

const CONTENT_TYPE_LABELS: Record<string, string> = {
  ARTICLE: "Article",
  NEWS: "News",
  BLOG_POST: "Blog Post",
  ACADEMIC: "Academic",
  STORY: "Story",
  OPINION: "Opinion",
};

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

  const contentTypeLabel =
    CONTENT_TYPE_LABELS[data.contentType] ?? data.contentType;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 2a: Passage header */}

      {/* Back link */}
      <Link
        href="/reading"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Reading
      </Link>

      {/* Passage title */}
      <h1 className="mb-3 text-xl font-semibold text-foreground">
        {data.title}
      </h1>

      {/* Metadata row: CefrBadge + topic badge + word count + content type */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <CefrBadge level={data.cefrLevel} />
        {data.topic && (
          <Badge variant="secondary" className="text-xs">
            {data.topic}
          </Badge>
        )}
        <span>~{data.wordCount} words</span>
        <span aria-hidden="true">·</span>
        <span>{contentTypeLabel}</span>
      </div>

      {/* Action row: reading timer, bookmark toggle, notes toggle */}
      <div className="mb-6 flex items-center gap-4 text-sm">
        {/* Reading timer — starts client-side in PassageRenderer (05-07 plan) */}
        <div
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-live="polite"
          aria-label="Reading time"
        >
          <Clock className="h-4 w-4" />
          <span>0m 0s</span>
        </div>

        {/* Bookmark toggle — client interaction wired in 05-07 */}
        <button
          type="button"
          aria-label={data.isBookmarked ? "Remove bookmark" : "Bookmark passage"}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          {data.isBookmarked ? (
            <>
              <BookmarkCheck className="h-4 w-4 text-amber-400" />
              <span>Bookmarked</span>
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              <span>Bookmark</span>
            </>
          )}
        </button>

        {/* Notes toggle — client interaction wired in 05-07 */}
        <button
          type="button"
          aria-label="Toggle notes panel"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <StickyNote className="h-4 w-4" />
          <span>Notes</span>
        </button>
      </div>

      {/* 2b: Passage body area
          Temporary fallback — PassageRenderer client component (plan 05-07) will
          replace this with DOMPurify sanitization + word-span wrapping.
          Content was sanitized by isomorphic-dompurify in SeedService at storage time
          (T-05-06-01 mitigation). */}
      <div
        className="max-w-[65ch] text-[18px] leading-[1.75] text-foreground"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: data.content }}
      />

      <Separator className="my-8" />

      {/* 2c: Questions section placeholder
          QuestionsSection client component (plan 05-07) will replace this static heading
          with interactive per-question cards, answer state, and inline feedback. */}
      <section aria-label="Comprehension questions">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Comprehension Questions
        </h2>
        <p className="text-sm text-muted-foreground">
          {data.questions.length} question
          {data.questions.length !== 1 ? "s" : ""}
        </p>
      </section>
    </div>
  );
}
