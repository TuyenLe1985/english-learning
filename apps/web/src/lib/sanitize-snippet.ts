/**
 * sanitizeSnippet — XSS-safe HTML sanitizer for FTS snippets.
 *
 * Security: T-08-15 — strips ALL HTML tags except <mark>/<\/mark> from
 * ts_headline() output before passing to dangerouslySetInnerHTML.
 *
 * The PostgreSQL ts_headline() function wraps matched terms in <mark> tags.
 * Any injected markup (e.g. <script>, <img onerror="">, <a href="javascript:">)
 * in the original content would also appear in the snippet — this function
 * removes all such tags while preserving the <mark> highlights.
 *
 * @example
 * sanitizeSnippet('Hello <mark>world</mark> <script>alert(1)</script>')
 * // => 'Hello <mark>world</mark> alert(1)'
 *
 * @param html - Raw snippet string from NestJS SearchResultDto.snippet
 * @returns Sanitized string containing only text and <mark>/<\/mark> tags
 */
export function sanitizeSnippet(html: string): string {
  // Strip all HTML tags EXCEPT <mark> and </mark>
  // The negative lookahead (?!\/?mark...) preserves <mark> and </mark> only
  return html.replace(/<(?!\/?(?:mark)(?=>|\s.*?>))[^>]*>/gi, "");
}
