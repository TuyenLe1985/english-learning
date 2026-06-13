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
 * The raw JWE session cookie value is extracted from the cookie header and
 * forwarded as a Bearer header to NestJS. NestJS JwtAuthGuard validates the
 * compact JWE token string using the shared NEXTAUTH_SECRET.
 *
 * CR-01 fix: Forward the raw JWE cookie string — not a JSON-stringified
 * decoded object — because NestJS @auth/core/jwt decode() expects the
 * compact token string, not a serialized JS object.
 */

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

/**
 * Extract the raw JWE session token string from the cookie header.
 * Auth.js stores the session as a compact JWE in:
 *   - `authjs.session-token`          (development / http)
 *   - `__Secure-authjs.session-token` (production / https)
 *
 * Returns null if the cookie is absent.
 */
export function extractRawToken(cookieHeader: string): string | null {
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`));

  if (!match) return null;
  return match.slice(cookieName.length + 1);
}

/**
 * Fetch from NestJS with the Auth.js JWE session token as a Bearer header.
 * The raw compact JWE string is extracted directly from the cookie — this is
 * what NestJS JwtAuthGuard's @auth/core/jwt decode() expects.
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
  const rawToken = extractRawToken(cookieHeader);

  if (!rawToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hasBody = init?.body !== undefined && init?.body !== null;
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${rawToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
}

export { API_URL };
