/**
 * GET /api/vocabulary/lookup?word={word} — Next.js relay for word definition lookup.
 *
 * Proxies to NestJS GET /api/vocabulary/lookup?word={word}.
 * Returns VocabularyWordDto if found, or 204 No Content if not found (D-13 graceful no-match).
 *
 * Used by the WordPopover component (VOCAB-08 / D-14) to fetch a word's definition
 * when a user taps a <span data-word> in the passage reader.
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 * Security (T-05-08-02): VocabularyWord data is non-sensitive; JwtAuthGuard protects endpoint.
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

  const word = req.nextUrl.searchParams.get("word");
  if (!word || !word.trim()) {
    return NextResponse.json({ error: "word parameter is required" }, { status: 400 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const url = new URL(`${API_URL}/api/vocabulary/lookup`);
  url.searchParams.set("word", word.trim().toLowerCase());

  const res = await fetchWithAuth(cookieHeader, url.toString());

  // NestJS returns null body when word is not found (D-13 graceful no-match)
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Vocabulary lookup failed" },
      { status: res.status },
    );
  }

  const data: unknown = await res.json();

  // lookupByWord returns null (not a 404) when word not found per D-13
  if (data === null) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(data);
}
