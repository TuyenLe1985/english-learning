/**
 * LevelUpModal — shadcn Dialog overlay for level-up celebration.
 *
 * D-11: Opens ~1s after XP toast appears. Auto-closes ~5s after opening.
 * Copywriting Contract:
 *   Title: "Level {n}!"
 *   Body: "You've reached Level {n}. Keep learning to unlock more!"
 *
 * Shows LevelBadge (size lg) with ring-2 ring-primary accent.
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LevelBadge } from "@/components/gamification/level-badge";

interface LevelUpModalProps {
  newLevel: number;
  onClose?: () => void;
}

export function LevelUpModal({ newLevel, onClose }: LevelUpModalProps) {
  const [open, setOpen] = useState(false);

  // D-11: show 1 second after XP toast (stagger); auto-close at 5s after open
  useEffect(() => {
    const openTimer = setTimeout(() => setOpen(true), 1000);
    const closeTimer = setTimeout(() => {
      setOpen(false);
      onClose?.();
    }, 6000); // 1s delay + 5s display
    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onClose?.();
      }}
    >
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader className="flex flex-col items-center gap-4">
          <DialogTitle className="text-2xl font-semibold">
            Level {newLevel}!
          </DialogTitle>
          <DialogDescription>
            You&apos;ve reached Level {newLevel}. Keep learning to unlock more!
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <LevelBadge
            level={newLevel}
            size="lg"
            className="ring-2 ring-primary ring-offset-2"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
