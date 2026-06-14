/**
 * GET /api/vocabulary/lookup?word={word} — Next.js relay for vocabulary word lookup.
 *
 * Proxies to NestJS GET /api/vocabulary/lookup?word={word}.
 * Returns VocabularyWordDto if found, or null (200) if not found (D-13 graceful no-match).
 *
 * Authentication: auth() gates the route — unauthenticated requests return 401.
 * Security (T-05-08-02): VocabularyWord data is non-sensitive educational content;
 * JwtAuthGuard protects the NestJS endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const word = req.nextUrl.searchParams.get("word");
  if (!word) {
    return NextResponse.json({ error: "word param required" }, { status: 400 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${INTERNAL_API_URL}/api/vocabulary/lookup?word=${encodeURIComponent(word)}`,
  );

  // D-13: NestJS returns 200 + null body when word is not found
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Lookup failed" },
      { status: res.status },
    );
  }

  const data: unknown = await res.json();
  return NextResponse.json(data);
}
