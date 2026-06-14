/**
 * /grammar — Grammar area grid page.
 *
 * GRAM-01: Displays all 10 grammar areas in a responsive 2-column (mobile) /
 * 4-column (desktop) grid. Each card links to the area topic list at /grammar/[slug].
 *
 * Server Component: fetches areas from NestJS with getSessionToken() and cache: 'no-store'.
 * Auth-gated: redirects to /login if no session.
 *
 * UI-SPEC: "Grammar" heading (28px/600), "Browse by area" subtitle (base muted).
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GrammarAreaCard } from "@/components/grammar/grammar-area-card";
import { getSessionToken } from "@/lib/get-session-token";
import type { GrammarAreaDto } from "@repo/shared";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

async function fetchAreas(): Promise<GrammarAreaDto[]> {
  try {
    const token = getSessionToken();
    const res = await fetch(`${API_URL}/api/grammar/areas`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return res.json() as Promise<GrammarAreaDto[]>;
  } catch {
    return [];
  }
}

export default async function GrammarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const areas = await fetchAreas();

  return (
    <div className="mx-auto max-w-screen-xl">
      {/* Page heading — Display 28px/600 per UI-SPEC */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">Grammar</h1>
        <p className="mt-1 text-base text-muted-foreground">Browse by area</p>
      </div>

      {/* Area grid — 2-col mobile / 4-col desktop (UI-SPEC Screen 1) */}
      {areas.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {areas.map((area) => (
            <GrammarAreaCard
              key={area.slug}
              slug={area.slug}
              name={area.name}
              topicCount={area.topicCount}
            />
          ))}
        </div>
      ) : (
        <div role="status" className="py-16 text-center">
          <p className="text-base text-muted-foreground">
            No grammar areas available.
          </p>
        </div>
      )}
    </div>
  );
}
