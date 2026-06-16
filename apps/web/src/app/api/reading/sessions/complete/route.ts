/**
 * POST /api/reading/sessions/complete — Next.js relay for reading session completion.
 *
 * Proxies to NestJS POST /api/reading/sessions/complete.
 * Accepts { passageId, score, accuracy, readingTimeSec, attempts } per ReadingSessionCompleteSchema.
 *
 * READ-03: readingTimeSec stored to track elapsed reading time.
 * READ-07: score + accuracy stored in ReadingProgress.
 *
 * Security: auth() gates the route — unauthenticated requests return 401.
 * userId is derived from JWT on NestJS side — never injected from client.
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
    `${API_URL}/api/reading/sessions/complete`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Session completion failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
