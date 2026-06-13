import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

async function fetchWords(
  category: string,
  page: number,
): Promise<PaginatedWordsDto> {
  try {
    const token = getSessionToken();
    const res = await fetch(
      `${API_URL}/api/vocabulary/${category}/words?page=${page}&limit=20`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!res.ok) return { words: [], total: 0, page: 1, limit: 20, totalPages: 1 };
    return res.json() as Promise<PaginatedWordsDto>;
  } catch {
    return { words: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }
}

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function CategoryWordListPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { category } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = parseInt(pageParam ?? "1", 10);
  const data = await fetchWords(category, currentPage);
  const categoryName = CATEGORY_NAMES[category] ?? category;
  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < data.totalPages ? currentPage + 1 : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            {categoryName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total} words
          </p>
        </div>
        <Link
          href={`/vocabulary/${category}/practice`}
          className="inline-flex shrink-0 items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Practice this set
        </Link>
      </div>

      {data.words.length > 0 ? (
        <div className="divide-y divide-border">
          {data.words.map((word) => (
            <WordListItem
              key={word.id}
              id={word.id}
              word={word.word}
              definition={word.definition}
              partOfSpeech={word.partOfSpeech}
              cefrLevel={word.cefrLevel}
              category={category}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-muted-foreground">
          No words found in this category.
        </p>
      )}

      {data.totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              {prevPage ? (
                <PaginationPrevious href={`/vocabulary/${category}?page=${prevPage}`} />
              ) : (
                <PaginationPrevious
                  href="#"
                  aria-disabled="true"
                  className="pointer-events-none opacity-50"
                />
              )}
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 py-2 text-sm text-muted-foreground">
                {currentPage} / {data.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              {nextPage ? (
                <PaginationNext href={`/vocabulary/${category}?page=${nextPage}`} />
              ) : (
                <PaginationNext
                  href="#"
                  aria-disabled="true"
                  className="pointer-events-none opacity-50"
                />
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
