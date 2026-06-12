/**
 * POST /api/vocabulary/session/complete — Next.js relay for practice session results.
 *
 * Proxies to NestJS POST /api/vocabulary/session/complete.
 * Accepts { categorySlug, answers: [{wordId, exerciseType, isCorrect}], timeTakenMs? }
 * per SessionCompleteSchema.
 *
 * All session state is held client-side; one batch POST at session end.
 *
 * Authentication (T-03-13): auth() gates the route — unauthenticated requests
 * return 401 before proxying. userId always derived from JWT in NestJS.
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
    `${API_URL}/api/vocabulary/session/complete`,
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
