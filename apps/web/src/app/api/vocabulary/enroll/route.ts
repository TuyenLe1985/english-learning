/**
 * POST /api/vocabulary/enroll — Next.js relay route for SRS enrollment.
 *
 * Proxies to NestJS POST /api/srs/enroll — the SRS enrollment endpoint.
 * Accepts { wordId, contextSentence? } per EnrollWordSchema.
 *
 * D-11: One of two SRS entry points ("Mark as learned" on word detail page).
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security (T-03-10, T-03-11):
 *   - auth() called before proxying — unauthenticated requests blocked
 *   - userId is NEVER forwarded in body — NestJS derives userId from JWT payload
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

  // Proxy to NestJS SRS enroll endpoint (userId derived from JWT in NestJS — never from body)
  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/srs/enroll`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Enrollment failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
