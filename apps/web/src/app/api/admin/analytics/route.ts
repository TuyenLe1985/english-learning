/**
 * GET /api/admin/analytics — Next.js relay route.
 *
 * Proxies to NestJS GET /api/analytics/admin (ADMIN-only endpoint guarded by RolesGuard).
 * Forwards the Auth.js session cookie so NestJS JwtAuthGuard + RolesGuard can validate.
 * Non-admin users receive a 403 from NestJS; this relay surfaces the status as-is.
 *
 * Security: auth() validates session; unauthenticated requests return 401 before NestJS call.
 * T-08-17: Spoofing mitigated — no session → 401; non-ADMIN → 403 from NestJS RolesGuard.
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

  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/analytics/admin`);

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Failed to fetch admin analytics" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
