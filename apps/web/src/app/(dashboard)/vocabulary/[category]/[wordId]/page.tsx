import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { WordDetail } from "@/components/vocabulary/word-detail";
import type { VocabularyWordDto } from "@repo/shared";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

function getSessionToken(): string | null {
  const store = cookies();
  const name =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
  return store.get(name)?.value ?? null;
}

async function fetchWordDetail(
  category: string,
  wordId: string,
): Promise<VocabularyWordDto | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(
      `${API_URL}/api/vocabulary/${category}/${wordId}`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<VocabularyWordDto>;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ category: string; wordId: string }>;
}

export default async function WordDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { category, wordId } = await params;
  const word = await fetchWordDetail(category, wordId);

  if (!word) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-lg font-semibold text-foreground">
          Couldn&apos;t load this word
        </p>
        <a
          href={`/vocabulary/${category}`}
          className="mt-4 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Back to {category}
        </a>
      </div>
    );
  }

  return <WordDetail word={word} />;
}
