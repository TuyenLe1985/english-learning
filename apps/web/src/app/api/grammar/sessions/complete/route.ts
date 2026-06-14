/**
 * POST /api/grammar/sessions/complete — Next.js relay for grammar session results.
 *
 * Proxies to NestJS POST /api/grammar/sessions/complete.
 * Accepts { lessonId, attempts: [{questionId, isCorrect, userAnswer?}], timeTakenMs? }
 * per GrammarSessionCompleteSchema.
 *
 * All session state is held client-side; one batch POST at session end.
 *
 * Authentication (T-04-13): auth() gates the route — unauthenticated requests
 * return 401 before proxying. userId is NEVER injected here — NestJS derives it
 * from the JWT payload.
 *
 * Security (T-04-15): req.json() wrapped in try/catch to handle malformed bodies,
 * returning 400 before proxying.
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
    `${API_URL}/api/grammar/sessions/complete`,
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
