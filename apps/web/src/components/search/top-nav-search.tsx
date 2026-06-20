/**
 * TopNavSearch — search input in the dashboard layout top nav header.
 *
 * UI-SPEC Screen 3:
 *   - <form role="search"> wrapping
 *   - <input type="search"> with aria-label="Search platform content"
 *   - Placeholder: "Search lessons, vocabulary, passages..."
 *   - h-9, max-w-[320px], focus ring per UI-SPEC
 *   - On submit (Enter or Search icon click): navigate to /search?q={encoded value}
 *   - Only navigates if query is non-empty (trim check)
 *   - No inline autocomplete in Phase 8 (D-09)
 */

"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";

export function TopNavSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = inputRef.current?.value?.trim() ?? "";
    if (value.length === 0) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <form
      role="search"
      aria-label="Search platform content"
      onSubmit={handleSubmit}
      className="relative flex w-full max-w-[320px] items-center"
    >
      <input
        ref={inputRef}
        type="search"
        name="q"
        aria-label="Search platform content"
        placeholder="Search lessons, vocabulary, passages..."
        className="h-9 w-full rounded-lg border border-input bg-background pl-3 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-2 flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
