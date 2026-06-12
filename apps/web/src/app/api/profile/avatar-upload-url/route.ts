/**
 * POST /api/profile/avatar-upload-url — Next.js relay for presigned URL generation.
 *
 * Proxies to NestJS POST /api/profile/avatar/upload-url with session Bearer token.
 * Accepts { filename, contentType, sizeBytes } per AvatarUploadUrlRequestSchema.
 * Returns { uploadUrl, key } from NestJS for browser direct-upload to MinIO/R2.
 *
 * Authentication: auth() validates the session; unauthenticated requests return 401.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

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
    `${API_URL}/api/profile/avatar/upload-url`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Upload URL generation failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
