/**
 * Type declaration for dom-anchor-text-position.
 * Rule 3 auto-fix: no @types package on npm; missing declaration causes build failure.
 * Source: https://github.com/nicowillis/dom-anchor-text-position
 */
declare module "dom-anchor-text-position" {
  export interface TextPositionAnchor {
    start: number;
    end: number;
  }

  export function fromRange(root: Node, range: Range): TextPositionAnchor;
  export function toRange(root: Node, anchor: TextPositionAnchor): Range;
}
