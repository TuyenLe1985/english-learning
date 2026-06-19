/**
 * POST /api/quiz/sessions/[sessionId]/complete — Next.js relay for quiz session completion.
 *
 * Proxies to NestJS POST /api/quiz/sessions/:id/complete.
 * Accepts { timeTakenSec, answers } per QuizCompleteSchema.
 *
 * Authentication (T-07-13): auth() gates the route — unauthenticated requests
 * return 401 before proxying. userId is NEVER injected here — NestJS derives it
 * from the JWT payload.
 *
 * Security (T-07-15): NestJS recomputes accuracy/score server-side; client-supplied
 * values are advisory only. Relay forwards raw JSON without modification.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
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

  const { sessionId } = await params;

  // Defence-in-depth: validate sessionId format before interpolating into internal URL (CR-04)
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${INTERNAL_API_URL}/api/quiz/sessions/${sessionId}/complete`,
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
