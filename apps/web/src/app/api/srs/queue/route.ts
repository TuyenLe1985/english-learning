/**
 * GET /api/srs/queue — Next.js relay route for the SRS due-card queue.
 *
 * Proxies to NestJS GET /api/srs/queue — returns SrsCard[] with word,
 * ordered by due ASC, capped at 20 cards (D-01, D-04).
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security (T-03-16):
 *   - auth() called before proxying — unauthenticated requests blocked
 *   - NestJS scopes all queries to req.user.userId (JWT payload)
 *   - User only sees their own due cards
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/srs/queue`);

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch review queue" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
