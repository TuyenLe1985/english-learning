/**
 * GET /api/vocabulary/categories — Next.js relay for vocabulary category list.
 *
 * Returns the 8 fixed categories with live word counts from NestJS.
 * Auth-gated: unauthenticated requests return 401 before proxying.
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

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/vocabulary/categories`,
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
