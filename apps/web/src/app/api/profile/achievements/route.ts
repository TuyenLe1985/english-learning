/**
 * GET /api/profile/achievements — Next.js relay for user achievements.
 *
 * Proxies to NestJS GET /api/gamification/achievements.
 * Returns all 8 achievement definitions merged with the user's earned state
 * (earnedAt: Date | null for each).
 *
 * Authentication (T-07-17): auth() gates the route — unauthenticated requests
 * return 401 before proxying. NestJS JwtAuthGuard re-validates the JWT (double-check).
 * IDOR (T-07-16): NestJS scopes achievements by userId from JWT — never accepts a userId param.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${INTERNAL_API_URL}/api/gamification/achievements`,
    {
      method: "GET",
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Failed to fetch achievements" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
