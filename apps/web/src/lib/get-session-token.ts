/**
 * Shared helper to read the Auth.js session token from cookies.
 *
 * Centralizes cookie name logic (dev vs. production) and eliminates
 * copy-paste across server pages.
 */
import { cookies } from "next/headers";

export function getSessionToken(): string | null {
  const store = cookies();
  const name =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
  return store.get(name)?.value ?? null;
}
