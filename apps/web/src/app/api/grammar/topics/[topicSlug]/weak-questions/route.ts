/**
 * GET /api/grammar/topics/[topicSlug]/weak-questions — Next.js relay route.
 *
 * Proxies to NestJS GET /api/grammar/topics/:topicSlug/weak-questions.
 * Returns the set of GrammarQuestionDto[] the user has previously answered
 * incorrectly for this topic (scoped to req.user.userId in NestJS).
 *
 * Authentication (T-04-14): auth() gates the route — unauthenticated requests
 * return 401 before proxying. NestJS scopes results to the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

interface RouteParams {
  params: Promise<{ topicSlug: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicSlug } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/grammar/topics/${topicSlug}/weak-questions`,
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch weak questions" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
