/**
 * /vocabulary/[category]/practice — Practice session page
 *
 * Server component:
 * - auth() check → redirect to /login if unauthenticated
 * - Fetches the category's words via the words relay (Plan 04)
 * - Passes words to PracticeSession client component
 *
 * D-11: "Practice this set" button on category word list navigates here.
 * VOCAB-03: mixed 10-word session with 6 exercise types.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { PracticeSession } from "@/components/vocabulary/practice-session";
import type { PaginatedWordsDto } from "@repo/shared";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

function getSessionToken(): string | null {
  const store = cookies();
  const name =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
  return store.get(name)?.value ?? null;
}

const CATEGORY_NAMES: Record<string, string> = {
  business: "Business",
  travel: "Travel",
  technology: "Technology",
  education: "Education",
  health: "Health",
  "daily-life": "Daily Life",
  "social-topics": "Social Topics",
  "academic-english": "Academic English",
};

async function fetchAllWords(category: string) {
  try {
    const token = getSessionToken();
    const firstRes = await fetch(
      `${API_URL}/api/vocabulary/${category}/words?page=1&limit=50`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!firstRes.ok) return [];
    const data = (await firstRes.json()) as PaginatedWordsDto;
    return data.words;
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ category: string }>;
}

export default async function PracticePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { category } = await params;
  const words = await fetchAllWords(category);
  const categoryName = CATEGORY_NAMES[category] ?? category;

  if (words.length < 1) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href={`/vocabulary/${category}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to {categoryName}
          </Link>
        </div>
        <div role="status" className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-lg font-semibold text-foreground">No words available</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This category has no words yet. Check back after the content pipeline runs.
          </p>
          <Link
            href="/vocabulary"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse Vocabulary
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/vocabulary/${category}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to {categoryName}
        </Link>
        <p className="text-sm text-muted-foreground">
          {Math.min(words.length, 10)} word{Math.min(words.length, 10) !== 1 ? "s" : ""} session
        </p>
      </div>

      {/* Practice session client component */}
      <PracticeSession words={words} categorySlug={category} />
    </div>
  );
}
