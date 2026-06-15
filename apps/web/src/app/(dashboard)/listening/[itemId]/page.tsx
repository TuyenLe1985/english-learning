/**
 * /listening/[itemId] — Listening item detail page.
 *
 * LIST-06: Renders item header (back link, title, metadata) and the
 * ListeningItemClient orchestrator (audio player + transcript + exercises).
 *
 * Server Component: fetches ListeningItemDetailDto from NestJS via fetchWithAuth
 * with forwarded JWE cookie against INTERNAL_API_URL. Auth-gated: redirects to
 * /login if no session.
 *
 * UI-SPEC: Back link with ChevronLeft, 20px title, CEFR badge + content type badge
 * + duration + exercise count metadata row, then ListeningItemClient sticky layout.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import { CefrBadge } from "@/components/cefr-badge";
import { Badge } from "@/components/ui/badge";
import { ListeningItemClient } from "@/components/listening/listening-item-client";
import type { ListeningItemDetailDto } from "@repo/shared";

// ─── Content type display label map ───────────────────────────────────────────

type ContentType = ListeningItemDetailDto["contentType"];

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  CONVERSATION: "Conversation",
  INTERVIEW: "Interview",
  PODCAST: "Podcast",
  LECTURE: "Lecture",
  NEWS_REPORT: "News Report",
};

function contentTypeLabel(type: ContentType): string {
  return CONTENT_TYPE_LABELS[type] ?? type;
}

// ─── Duration formatter ───────────────────────────────────────────────────────

function formatDuration(durationSec: number): string {
  const m = Math.floor(durationSec / 60);
  const s = durationSec % 60;
  return `${m}m ${s}s`;
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function fetchItemDetail(
  cookieHeader: string,
  itemId: string,
): Promise<ListeningItemDetailDto | null> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/listening/items/${itemId}`,
    );
    if (!res.ok) return null;
    return res.json() as Promise<ListeningItemDetailDto>;
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ itemId: string }>;
}

export default async function ListeningItemPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { itemId } = await params;

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const item = await fetchItemDetail(cookieHeader, itemId);

  // Error state: item not found or fetch failed
  if (!item) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8">
        <Link
          href="/listening"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          Back to Listening
        </Link>
        <p
          role="status"
          className="py-16 text-center text-base text-muted-foreground"
        >
          Could not load this item. Try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/listening"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Back to Listening
      </Link>

      {/* Item title */}
      <h1 className="text-[20px] font-semibold text-foreground mb-1">
        {item.title}
      </h1>

      {/* Metadata row */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
        <CefrBadge level={item.cefrLevel} />
        <Badge variant="secondary">{contentTypeLabel(item.contentType)}</Badge>
        {item.durationSec != null && (
          <span>{formatDuration(item.durationSec)}</span>
        )}
        <span>·</span>
        <span>{item.questions.length} exercises</span>
      </div>

      {/* Client orchestrator: AudioPlayer + TranscriptPanel + exercises */}
      <ListeningItemClient item={item} />
    </div>
  );
}
