"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { HUD_EASE } from "@/components/motion/primitives";

/** Barre d'XP — le glow volt n'existe que là où il y a de la progression. */
export function XPBar({
  pct,
  delay = 0,
  className,
  glow = true,
}: {
  /** 0..1 */
  pct: number;
  delay?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden bg-line/60", className)}>
      <motion.div
        className={cn(
          "h-full bg-gradient-to-r from-volt-dim to-volt",
          glow && "shadow-glow-volt-sm",
        )}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
        transition={{ duration: 1.1, delay, ease: HUD_EASE }}
      />
    </div>
  );
}
