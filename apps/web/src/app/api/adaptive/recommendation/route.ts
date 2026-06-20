/**
 * GET /api/adaptive/recommendation — Next.js relay route.
 *
 * Proxies to NestJS GET /api/adaptive/recommendation with the user's Auth.js session token
 * as a Bearer header. Client components call this relay to get the Continue Learning
 * recommendation without re-fetching the full dashboard payload.
 *
 * T-08-12: auth() validates session; unauthenticated requests return 401 before forwarding.
 * Pattern: mirrors apps/web/src/app/api/profile/me/route.ts exactly.
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

  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/adaptive/recommendation`);

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch recommendation" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
