/**
 * GET /api/vocabulary/[category]/[wordId] — Next.js relay route.
 *
 * Proxies to NestJS GET /api/vocabulary/:category/:wordId for full word detail.
 * Returns VocabularyWordDto with definition, examples, synonyms, pronunciation, etc.
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security (T-03-10): relay calls auth() before proxying.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

interface RouteParams {
  params: Promise<{ category: string; wordId: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category, wordId } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/vocabulary/${category}/${wordId}`,
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch word detail" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
