/**
 * AdminStatCard — single KPI stat display for the admin dashboard.
 *
 * UI-SPEC Screen 6: label 12px muted (<dt>), value 28px semibold Display (<dd>),
 * delta badge green if positive / text-destructive if negative.
 * Uses <dl><dt><dd> for a11y (screen reader stat announcement).
 *
 * Animation: framer-motion opacity + scale stagger (Animation Contract).
 */

"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  delta?: number; // percentage change vs prior period; undefined = no delta badge
  index?: number; // stagger index for animation
}

export function AdminStatCard({
  label,
  value,
  delta,
  index = 0,
}: AdminStatCardProps) {
  const deltaPositive = delta !== undefined && delta >= 0;
  const deltaDisplay =
    delta !== undefined
      ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
    >
      <Card>
        <CardContent className="p-4">
          <dl className="space-y-1">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-[28px] font-semibold leading-none tracking-tight">
              {typeof value === "number" ? value.toLocaleString() : value}
            </dd>
            {deltaDisplay !== null && (
              <dd className="text-xs">
                <span
                  className={
                    deltaPositive ? "text-emerald-600" : "text-destructive"
                  }
                >
                  {deltaDisplay} vs. prior period
                </span>
              </dd>
            )}
          </dl>
        </CardContent>
      </Card>
    </motion.div>
  );
}
