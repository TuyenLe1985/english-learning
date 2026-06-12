/**
 * ReviewCard — SRS flashcard with flip mechanic for the /review queue.
 *
 * UI-SPEC:
 *   - Shows word (Display 28px/600) on the front face
 *   - "Show answer" button reveals definition + example sentence
 *   - Framer Motion rotateY flip (same mechanic as flashcard-exercise.tsx)
 *   - aria-pressed on card container indicates flip state
 *
 * VOCAB-06: Flip mechanic is the "reveal" step before rating.
 */

"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ReviewCardProps {
  word: string;
  definition: string;
  example?: string;
  isFlipped: boolean;
  onFlip: () => void;
}

export function ReviewCard({
  word,
  definition,
  example,
  isFlipped,
  onFlip,
}: ReviewCardProps) {
  return (
    <div className="w-full max-w-[480px] mx-auto">
      {/* Perspective wrapper */}
      <div style={{ perspective: "1000px" }}>
        <motion.div
          className="relative cursor-pointer"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
          aria-pressed={isFlipped}
        >
          {/* Front face — word */}
          <div
            className="rounded-xl border border-border bg-card p-8 text-center min-h-[200px] flex flex-col items-center justify-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-2xl font-semibold text-foreground">{word}</p>
            {!isFlipped && (
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip();
                }}
              >
                Show answer
              </Button>
            )}
          </div>

          {/* Back face — definition + example */}
          <div
            className="absolute inset-0 rounded-xl border border-border bg-card p-8 text-center min-h-[200px] flex flex-col items-center justify-center gap-3"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-base text-foreground">{definition}</p>
            {example && (
              <p className="text-sm text-muted-foreground italic">&ldquo;{example}&rdquo;</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
