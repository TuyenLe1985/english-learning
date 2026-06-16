/**
 * POST /api/reading/highlights — Next.js relay for highlight creation.
 *
 * Proxies to NestJS POST /api/reading/highlights.
 * Accepts { passageId, startOffset, endOffset, text } per HighlightCreateSchema.
 *
 * Security (T-05-07-01, T-05-07-04):
 * - auth() gates the route — unauthenticated requests return 401 before proxying.
 * - userId is derived from JWT on NestJS side — never injected from client.
 * - Rate limiting handled by @nestjs/throttler on the NestJS side.
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
      { error: err || "Highlight creation failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
