/**
 * GET /api/grammar/lessons/[lessonSlug] — Next.js relay route.
 *
 * Proxies to NestJS GET /api/grammar/lessons/:lessonSlug for full lesson detail
 * including all questions (GrammarLessonDetailDto).
 *
 * Authentication (T-04-14): auth() gates the route — unauthenticated requests
 * return 401 before proxying.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

interface RouteParams {
  params: Promise<{ lessonSlug: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonSlug } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/grammar/lessons/${lessonSlug}`,
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch lesson detail" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
