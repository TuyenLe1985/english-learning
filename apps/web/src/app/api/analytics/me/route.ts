/**
 * GET /api/analytics/me — Next.js relay route.
 *
 * Proxies to NestJS GET /api/analytics/me with the user's Auth.js session token
 * as a Bearer header. The NestJS endpoint reads userId from the JWT (never from
 * the request) to prevent IDOR.
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security: T-08-14 — auth() returns 401 before any NestJS call (spoofing mitigation).
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

  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/analytics/me`);

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch analytics" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
