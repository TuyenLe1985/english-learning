/**
 * POST /api/reading/bookmarks — Next.js relay for bookmark toggle.
 *
 * Proxies to NestJS POST /api/reading/bookmarks.
 * Accepts { passageId } and toggles the bookmark state for the authenticated user.
 * The NestJS service uses upsert/delete pattern — POST creates the bookmark if absent,
 * or deletes it if it exists (toggle behavior per READ-06).
 *
 * Security (T-05-07-04, READ-06):
 * - auth() gates the route — unauthenticated requests return 401 before proxying.
 * - userId is derived from JWT on NestJS side — never injected from client.
 * - passageId is validated by NestJS service.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (JSON.stringify(body).length > 65536) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/reading/bookmarks`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Bookmark toggle failed" },
      { status: res.status },
    );
  }

  const data: unknown = await res.json().catch(() => ({}));
  return NextResponse.json(data);
}
