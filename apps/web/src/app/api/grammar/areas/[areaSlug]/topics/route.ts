/**
 * GET /api/grammar/areas/[areaSlug]/topics — Next.js relay for grammar topic list.
 *
 * Proxies to NestJS GET /api/grammar/areas/:areaSlug/topics.
 * Auth-gated: unauthenticated requests return 401 before proxying.
 *
 * Security (T-04-10): relay calls auth() before any proxy operation.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

interface RouteParams {
  params: Promise<{ areaSlug: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { areaSlug } = await params;

  // CRITICAL: await headers() in Route Handlers (NOT getSessionToken)
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/grammar/areas/${areaSlug}/topics`,
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
