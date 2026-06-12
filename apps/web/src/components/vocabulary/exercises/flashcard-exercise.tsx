"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Props {
  word: string;
  definition: string;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function FlashcardExercise({ word, definition, onCorrect, onIncorrect }: Props) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">Tap the card to reveal the definition</p>

      <div className="w-full max-w-md" style={{ perspective: "1000px" }}>
        <motion.div
          className="relative min-h-[280px] cursor-pointer"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setFlipped((f) => !f);
          }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-card p-8 text-center shadow-sm"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-[28px] font-semibold leading-tight text-foreground">{word}</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-card p-8 text-center shadow-sm"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-base leading-relaxed text-foreground">{definition}</p>
          </div>
        </motion.div>
      </div>

      {flipped && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={onIncorrect} className="min-h-[44px]">
            <span className="text-red-600">Didn&apos;t know it</span>
          </Button>
          <Button onClick={onCorrect} className="min-h-[44px]">
            <span>Got it!</span>
          </Button>
        </div>
      )}
    </div>
  );
}
