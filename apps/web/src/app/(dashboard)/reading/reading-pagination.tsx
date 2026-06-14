/**
 * ReadingPagination — client component for browse page pagination.
 *
 * Uses URL search params to navigate pages so browser Back works
 * and page state round-trips via SSR.
 */

"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ReadingPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  searchParams: Record<string, string | undefined>;
}

export function ReadingPagination({
  currentPage,
  totalPages,
  searchParams,
}: ReadingPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.level) params.set("level", searchParams.level);
    if (searchParams.topic) params.set("topic", searchParams.topic);
    if (searchParams.type) params.set("type", searchParams.type);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const handlePrev = () => {
    if (currentPage > 1) router.push(buildPageUrl(currentPage - 1));
  };

  const handleNext = () => {
    if (currentPage < totalPages) router.push(buildPageUrl(currentPage + 1));
  };

  // Show a window of page numbers around current page
  const pageNums: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pageNums.push(i);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={buildPageUrl(currentPage - 1)}
            onClick={(e) => {
              e.preventDefault();
              handlePrev();
            }}
            aria-disabled={currentPage <= 1}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {pageNums.map((n) => (
          <PaginationItem key={n}>
            <PaginationLink
              href={buildPageUrl(n)}
              isActive={n === currentPage}
              onClick={(e) => {
                e.preventDefault();
                router.push(buildPageUrl(n));
              }}
            >
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href={buildPageUrl(currentPage + 1)}
            onClick={(e) => {
              e.preventDefault();
              handleNext();
            }}
            aria-disabled={currentPage >= totalPages}
            className={
              currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
