/**
 * /reading/[passageId] — Passage reader page.
 *
 * Plan 05-07: Replaces the dangerouslySetInnerHTML placeholder from 05-06 with:
 * - PassageRenderer (dynamic import, ssr:false): DOMPurify sanitize + word-span + highlight restore
 * - QuestionsSection: inline questions with per-question state + session submit
 * - NotesPanel: auto-save on blur, Sheet on mobile, sidebar on desktop
 *
 * Server Component: fetches from NestJS via fetchWithAuth. Auth-gated.
 * Client interaction is delegated to child Client Components.
 *
 * SECURITY (T-05-07-01): PassageRenderer runs DOMPurify client-side with a strict
 * allowlist — no script/style/iframe elements can survive into the DOM.
 */

import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CefrBadge } from "@/components/cefr-badge";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import { ReadingPassageClient } from "./reading-passage-client";
import type { ReadingPassageDetailDto } from "@repo/shared";

// Dynamic imports — both components use browser-only APIs (DOMPurify, dom-anchor-text-position)
const PassageRenderer = dynamic(
  () =>
    import("@/components/reading/passage-renderer").then((m) => ({
      default: m.PassageRenderer,
    })),
  { ssr: false },
);

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

      {/*
        ReadingPassageClient handles all client-side interactivity:
        - Reading timer (action row)
        - Bookmark toggle
        - Notes panel toggle
        - PassageRenderer with highlight state
        - QuestionsSection with timer coordination
        - NotesPanel
      */}
      <ReadingPassageClient
        data={data}
        passageId={passageId}
        PassageRendererComponent={PassageRenderer}
      />

      <Separator className="my-8" />
    </div>
  );
}
