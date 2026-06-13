/**
 * /vocabulary — Vocabulary category grid page.
 *
 * VOCAB-01 (D-09): Displays all 8 vocabulary categories in a responsive
 * 2-column (mobile) / 4-column (desktop) grid. Each card links to the
 * category word list at /vocabulary/[slug].
 *
 * Server Component: fetches categories from relay route with cache: 'no-store'.
 * Auth-gated: redirects to /login if no session (layout also checks).
 *
 * UI-SPEC: "Vocabulary" heading (Display 28px/600), "Browse by category" subtitle (Body muted).
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CategoryCard } from "@/components/vocabulary/category-card";
import { getSessionToken } from "@/lib/get-session-token";
import type { CategoryDto } from "@repo/shared";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

async function fetchCategories(): Promise<CategoryDto[]> {
  try {
    const token = getSessionToken();
    const res = await fetch(`${API_URL}/api/vocabulary/categories`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return res.json() as Promise<CategoryDto[]>;
  } catch {
    return [];
  }
}

export default async function VocabularyPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const categories = await fetchCategories();

  return (
    <div className="mx-auto max-w-screen-xl">
      {/* Page heading — Display 28px/600 per UI-SPEC */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Vocabulary</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Browse by category
        </p>
      </div>

      {/* Category grid — 2-col mobile / 4-col desktop (D-09, UI-SPEC) */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.slug}
              slug={cat.slug}
              name={cat.name}
              wordCount={cat.wordCount}
            />
          ))}
        </div>
      ) : (
        <div role="status" className="py-16 text-center">
          <p className="text-base text-muted-foreground">
            No categories available.
          </p>
        </div>
      )}
    </div>
  );
}
