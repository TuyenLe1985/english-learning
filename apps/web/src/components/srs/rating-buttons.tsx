/**
 * RatingButtons — Again / Hard / Good / Easy rating buttons for SRS review.
 *
 * UI-SPEC Rating Buttons:
 *   - 4 equal-width outline buttons in a row
 *   - Again: text-red-600, Hard: text-orange-500, Good: text-green-600, Easy: text-blue-600
 *   - variant="outline", min-height 44px (WCAG 2.5.5 touch target)
 *   - aria-label "Rate as {rating}" for screen reader accessibility
 *   - Appear with Framer Motion opacity/y animation after card is revealed
 *
 * VOCAB-06: After flipping, user rates the card to reschedule via FSRS.
 */

"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type Rating = "Again" | "Hard" | "Good" | "Easy";

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

const RATINGS: { value: Rating; colorClass: string }[] = [
  { value: "Again", colorClass: "text-red-600" },
  { value: "Hard", colorClass: "text-orange-500" },
  { value: "Good", colorClass: "text-green-600" },
  { value: "Easy", colorClass: "text-blue-600" },
];

export function RatingButtons({ onRate, disabled = false }: RatingButtonsProps) {
  return (
    <motion.div
      className="flex gap-2 w-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {RATINGS.map(({ value, colorClass }) => (
        <Button
          key={value}
          variant="outline"
          className={`flex-1 min-h-[44px] font-medium ${colorClass}`}
          aria-label={`Rate as ${value}`}
          onClick={() => onRate(value)}
          disabled={disabled}
        >
          {value}
        </Button>
      ))}
    </motion.div>
  );
}
