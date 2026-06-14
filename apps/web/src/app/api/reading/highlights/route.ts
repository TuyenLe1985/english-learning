/**
 * POST /api/reading/highlights — Next.js relay for saving text highlights.
 *
 * Proxies to NestJS POST /api/reading/highlights.
 * Accepts { passageId, startOffset, endOffset, text } per HighlightCreateSchema.
 *
 * Authentication: auth() gates the route — unauthenticated requests return 401.
 * Security (T-05-07-03): offset integers are non-sensitive; userId is derived
 * from JWT by NestJS (never injected here).
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

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/reading/highlights`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Highlight save failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
