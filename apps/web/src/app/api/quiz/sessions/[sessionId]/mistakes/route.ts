/**
 * GET /api/quiz/sessions/[sessionId]/mistakes — Next.js relay for quiz mistake review.
 *
 * Proxies to NestJS GET /api/quiz/sessions/:id/mistakes.
 * Returns the incorrect answers from the completed session for review (07-06).
 *
 * Authentication (T-07-13): auth() gates the route — unauthenticated requests
 * return 401 before proxying. IDOR protection: NestJS scopes query by userId from JWT.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  // Defence-in-depth: validate sessionId format before interpolating into internal URL (CR-04)
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${INTERNAL_API_URL}/api/quiz/sessions/${sessionId}/mistakes`,
    {
      method: "GET",
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Failed to fetch mistakes" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
