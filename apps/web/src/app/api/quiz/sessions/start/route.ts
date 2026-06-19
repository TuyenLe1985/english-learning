/**
 * POST /api/quiz/sessions/start — Next.js relay for quiz session start.
 *
 * Proxies to NestJS POST /api/quiz/sessions/start.
 * Accepts { type } per QuizStartSchema.
 *
 * Authentication (T-07-13): auth() gates the route — unauthenticated requests
 * return 401 before proxying. userId is NEVER injected here — NestJS derives it
 * from the JWT payload.
 *
 * Security: req.json() wrapped in try/catch to handle malformed bodies,
 * returning 400 before proxying.
 *
 * Trust boundary: relay does not inspect or modify the request body — forwards
 * raw JSON to NestJS which validates via class-validator/zod and builds the session.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

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
    `${INTERNAL_API_URL}/api/quiz/sessions/start`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Failed to start quiz session" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
