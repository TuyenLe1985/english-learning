/**
 * GET /api/search — Next.js relay route.
 *
 * Forwards all query params (?q=, ?level=, ?topic=, ?skill=) to
 * NestJS GET /api/search. Requires a valid Auth.js session.
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security: T-08-14 — auth() returns 401 before any NestJS call (spoofing mitigation).
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Forward ALL query params to NestJS (q, level, topic, skill)
  const { searchParams } = new URL(req.url);
  const nestUrl = new URL(`${API_URL}/api/search`);
  searchParams.forEach((v, k) => nestUrl.searchParams.set(k, v));

  const res = await fetchWithAuth(cookieHeader, nestUrl.toString());

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Search failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
