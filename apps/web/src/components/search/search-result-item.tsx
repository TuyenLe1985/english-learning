/**
 * SearchResultItem — renders a single search result with XSS-safe snippet.
 *
 * SRCH-04: Shows title, CEFR badge, topic badge, content-type label, and a
 * highlighted snippet. The snippet is sanitized via sanitizeSnippet() before
 * being passed to dangerouslySetInnerHTML — T-08-15 mitigation.
 *
 * Security: Raw result.snippet is NEVER passed directly to dangerouslySetInnerHTML.
 */

"use client";

import { CefrBadge } from "@/components/cefr-badge";
import type { CefrLevel } from "@/components/cefr-badge";
import { Badge } from "@/components/ui/badge";
import { sanitizeSnippet } from "@/lib/sanitize-snippet";
import type { SearchResultDto } from "@repo/shared";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  reading: "Reading",
  listening: "Listening",
  quiz: "Quiz",
};

interface SearchResultItemProps {
  result: SearchResultDto;
}

export function SearchResultItem({ result }: SearchResultItemProps) {
  // T-08-15: sanitize snippet BEFORE dangerouslySetInnerHTML — strips all tags except <mark>
  const safeSnippet = sanitizeSnippet(result.snippet);

  return (
    <div className="py-3">
      {/* Title row */}
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {result.title}
        </span>
        {result.cefrLevel && (
          <CefrBadge level={result.cefrLevel as CefrLevel} />
        )}
        {result.topic && (
          <Badge variant="outline" className="text-xs">
            {result.topic}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {CONTENT_TYPE_LABELS[result.type] ?? result.type}
        </span>
      </div>

      {/* Snippet with <mark> highlights — XSS-safe via sanitizeSnippet */}
      <p
        className="text-sm text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-yellow-100 [&_mark]:px-0.5 [&_mark]:text-yellow-800"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeSnippet }}
      />
    </div>
  );
}
