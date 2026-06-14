/**
 * /reading/[passageId] — Reading Passage detail page.
 *
 * READ-06: Server Component that fetches passage detail from NestJS and
 * renders the passage header. All client-side interactivity (PassageRenderer,
 * QuestionsSection, NotesPanel, timer) is delegated to ReadingPageClient.
 *
 * Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC Screen 2, §2a: passage header anatomy.
 * Security: T-05-06-01 — content sanitized by isomorphic-dompurify in
 * SeedService before DB storage; PassageRenderer adds client-side DOMPurify.
 * T-05-07-01 — PassageRenderer enforces DOMPurify sanitization on render.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/cefr-badge";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import { ReadingPageClient } from "@/components/reading/reading-page-client";
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
      {/* ── 2a. Passage header ───────────────────────────────────────────────── */}

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

      {/* ── Client-side interactive shell ────────────────────────────────────────
           ReadingPageClient coordinates:
           - Action row (timer, bookmark, notes toggle)
           - PassageRenderer (client-only, dynamic import ssr:false)
           - QuestionsSection (inline questions + score card)
           - NotesPanel (Sheet/sidebar)
      ──────────────────────────────────────────────────────────────────────── */}
      <ReadingPageClient data={data} passageId={passageId} />
    </div>
  );
}
