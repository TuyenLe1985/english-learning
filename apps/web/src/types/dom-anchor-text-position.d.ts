/**
 * Type declarations for dom-anchor-text-position@5.0.0
 *
 * The package ships without bundled TypeScript types.
 * API: fromRange(root, range) → { start, end }
 *      toRange(root, { start, end }) → Range
 *
 * Used in PassageRenderer for text highlight save/restore (READ-04, D-06).
 * Browser-only — only used inside "use client" components in useEffect/event handlers.
 */

declare module "dom-anchor-text-position" {
  export interface TextPosition {
    start: number;
    end: number;
  }

  /**
   * Compute text position offsets for a DOM Range relative to a root element.
   * The offsets are character indices into root.textContent.
   *
   * @param root  - Container element to compute offsets relative to
   * @param range - DOM Range representing the selected text
   */
  export function fromRange(root: Element, range: Range): TextPosition;

  /**
   * Reconstruct a DOM Range from stored text position offsets.
   *
   * @param root     - Container element the offsets were computed relative to
   * @param position - { start, end } character indices
   */
  export function toRange(root: Element, position: TextPosition): Range;
}
