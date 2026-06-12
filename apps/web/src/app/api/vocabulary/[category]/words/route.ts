/**
 * GET /api/vocabulary/[category]/words — Next.js relay route.
 *
 * Proxies to NestJS GET /api/vocabulary/:category/words with pagination params.
 * Forwards `page` (default 1) and `limit` (fixed 20) query params to NestJS.
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security (T-03-10): relay calls auth() before proxying.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

interface RouteParams {
  params: { category: string };
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Forward page and limit query params to NestJS (D-12: 20 words per page)
  const url = new URL(`${API_URL}/api/vocabulary/${params.category}/words`);
  url.searchParams.set("page", searchParams.get("page") ?? "1");
  url.searchParams.set("limit", "20");

  const res = await fetchWithAuth(cookieHeader, url.toString());

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch words" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
