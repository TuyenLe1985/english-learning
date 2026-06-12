/**
 * POST /api/srs/review — Next.js relay route for submitting an SRS rating.
 *
 * Forwards { cardId, rating } to NestJS POST /api/srs/review which applies
 * FSRS rescheduling and writes the new due date to DB (D-02).
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security (T-03-16, T-03-18):
 *   - auth() called before proxying — unauthenticated requests blocked
 *   - NestJS validates cardId against userId-scoped findFirst (prevents cross-user tampering)
 *   - NestJS ReviewSubmitSchema (Zod) restricts rating to Again/Hard/Good/Easy
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

  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/srs/review`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Review submission failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
