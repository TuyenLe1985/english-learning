/**
 * GET /api/vocabulary/my-words — Next.js relay route for the personal vocabulary list.
 *
 * Forwards status and page query params to NestJS GET /api/vocabulary/my-words.
 * Returns the user's vocabulary list filtered by SRS status with next review dates.
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security (T-03-16, T-03-17):
 *   - auth() called before proxying — unauthenticated requests blocked
 *   - NestJS scopes all queries to req.user.userId (JWT payload)
 *   - userId is NEVER forwarded — NestJS derives it from the JWT
 */

import { NextRequest, NextResponse } from "next/server";
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

  // Forward status + page query params to NestJS
  const { searchParams } = req.nextUrl;
  const url = new URL(`${API_URL}/api/vocabulary/my-words`);
  const status = searchParams.get("status");
  const page = searchParams.get("page");
  if (status) url.searchParams.set("status", status);
  if (page) url.searchParams.set("page", page);

  const res = await fetchWithAuth(cookieHeader, url.toString());

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch vocabulary list" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
