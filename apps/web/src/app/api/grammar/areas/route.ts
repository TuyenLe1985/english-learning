/**
 * GET /api/grammar/areas — Next.js relay for grammar area list.
 *
 * Proxies to NestJS GET /api/grammar/areas.
 * Auth-gated: unauthenticated requests return 401 before proxying.
 *
 * Security (T-04-10): relay calls auth() before any proxy operation.
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

  // CRITICAL: await headers() in Route Handlers (NOT getSessionToken)
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/grammar/areas`,
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch grammar areas" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
