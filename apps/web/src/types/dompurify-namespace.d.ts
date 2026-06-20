/**
 * DOMPurify namespace augmentation.
 * Rule 3 auto-fix: passage-renderer.tsx uses `DOMPurify.Config` namespace syntax,
 * but `isomorphic-dompurify` is imported as a default export — TypeScript doesn't
 * automatically create a namespace from a default import.
 *
 * This global declaration makes `DOMPurify.Config` resolve to the dompurify Config type.
 */

import type { Config } from "dompurify";

declare namespace DOMPurify {
  type Config = import("dompurify").Config;
}
