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
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";
  const token = await getToken({
    req: { headers: { cookie: cookieHeader } } as Parameters<typeof getToken>[0]["req"],
    secret: process.env["NEXTAUTH_SECRET"] ?? "",
  });

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/profile/avatar/upload-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${JSON.stringify(token)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: err || "Upload URL generation failed" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
