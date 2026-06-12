/**
 * Authenticated API client helpers — used by Next.js relay routes.
 *
 * REFACTOR(02-06): Extracted from profile relay routes so all later phases
 * can fetch from NestJS without duplicating getToken() extraction logic.
 *
 * Usage (in Next.js Route Handler):
 *   import { fetchWithAuth } from "@/lib/api-client";
 *   const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/users/me`);
 *
 * The token is extracted from the Auth.js session cookie using getToken() with
 * the shared NEXTAUTH_SECRET, then forwarded as a Bearer header to NestJS.
 * NestJS JwtAuthGuard (Plan 01) validates the token using the same secret.
 */

import { getToken } from "next-auth/jwt";

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

/**
 * Extract the Auth.js JWT from the request's cookie header.
 * Returns null if no valid session token is found.
 */
export async function extractToken(
  cookieHeader: string,
): Promise<object | null> {
  const token = await getToken({
    req: {
      headers: { cookie: cookieHeader },
    } as Parameters<typeof getToken>[0]["req"],
    secret: process.env["NEXTAUTH_SECRET"] ?? "",
  });
  return token;
}

/**
 * Fetch from NestJS with the Auth.js JWT as a Bearer token.
 * Uses the raw JWT object serialized to JSON as the Bearer value —
 * NestJS JwtAuthGuard decodes it using @auth/core/jwt decode().
 *
 * @param cookieHeader - The raw cookie string from the incoming request headers
 * @param url          - Full NestJS API URL (e.g. `${API_URL}/api/users/me`)
 * @param init         - Standard fetch init options (method, body, etc.)
 */
export async function fetchWithAuth(
  cookieHeader: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await extractToken(cookieHeader);

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${JSON.stringify(token)}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

export { API_URL };
