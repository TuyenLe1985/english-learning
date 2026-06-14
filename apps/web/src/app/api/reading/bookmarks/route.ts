/**
 * POST /api/reading/bookmarks — Next.js relay for bookmark toggle.
 * DELETE /api/reading/bookmarks?passageId={id} — unbookmark.
 *
 * Proxies to NestJS POST /api/reading/bookmarks (toggle endpoint).
 * NestJS upserts or deletes the Bookmark record for the authenticated user.
 *
 * Authentication: auth() gates the route — unauthenticated requests return 401.
 * Security: userId is NEVER forwarded in body — NestJS derives userId from JWT payload.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${INTERNAL_API_URL}/api/reading/bookmarks`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Bookmark toggle failed" },
      { status: res.status },
    );
  }

  const data: unknown = await res.json();
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passageId = req.nextUrl.searchParams.get("passageId");
  if (!passageId) {
    return NextResponse.json({ error: "passageId param required" }, { status: 400 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${INTERNAL_API_URL}/api/reading/bookmarks/${passageId}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Bookmark removal failed" },
      { status: res.status },
    );
  }

  return NextResponse.json({ success: true });
}
