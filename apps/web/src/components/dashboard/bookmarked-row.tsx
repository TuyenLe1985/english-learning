/**
 * BookmarkedRow — horizontal ScrollArea row of up to 4 bookmarked items.
 *
 * UI-SPEC D-04:
 *   - "Bookmarked" heading + "View all →" link
 *   - ScrollArea with horizontal scrolling, pb-4, cards w-[200px] flex-shrink-0
 *   - Empty state: "Bookmark lessons and passages to find them here quickly."
 */

"use client";

import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ContentScrollCard } from "@/components/dashboard/content-scroll-card";
import type { ContentItemDto } from "@repo/shared";

interface BookmarkedRowProps {
  items: ContentItemDto[];
}

export function BookmarkedRow({ items }: BookmarkedRowProps) {
  return (
    <div>
      {/* Row header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">Bookmarked</h2>
        <Link
          href="/reading"
          className="text-sm text-primary hover:underline"
          aria-label="View all bookmarked content"
        >
          View all →
        </Link>
      </div>

      {/* Content */}
      {items.length > 0 ? (
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {items.map((item) => (
              <ContentScrollCard
                key={item.id}
                id={item.id}
                title={item.title}
                type={item.type}
                cefrLevel={item.cefrLevel}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <p className="text-sm text-muted-foreground">
          Bookmark lessons and passages to find them here quickly.
        </p>
      )}
    </div>
  );
}
