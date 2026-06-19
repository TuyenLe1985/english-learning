/**
 * XpToast — Framer Motion slide-up toast for XP award notifications.
 *
 * GAME-02: Appears on quiz/lesson completion, shows "+{n} XP".
 * D-11: Fixed bottom-right, slides up from y=50, auto-dismisses after 4s.
 * Accessibility: role="status" aria-live="polite" for screen readers.
 *
 * UI-SPEC Animation Contract:
 *   initial: { y: 50, opacity: 0 }
 *   animate: { y: 0, opacity: 1 }
 *   exit: { opacity: 0 }
 *   transition: { duration: 0.3 }
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface XpToastProps {
  xpAmount: number;
  onDismiss?: () => void;
}

export function XpToast({ xpAmount, onDismiss }: XpToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-4 right-4 z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-lg cursor-pointer select-none"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          role="status"
          aria-live="polite"
        >
          <span className="text-sm font-semibold">+{xpAmount} XP</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
