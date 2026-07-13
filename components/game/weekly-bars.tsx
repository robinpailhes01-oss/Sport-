"use client";

import { motion } from "motion/react";
import { HUD_EASE } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

/** Barres d'XP hebdo — la dernière semaine glow, le reste est en retrait. */
export function WeeklyBars({
  values,
  delay = 0,
}: {
  values: number[];
  delay?: number;
}) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-12 items-end gap-1">
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        const pct = Math.max(0.06, v / max);
        return (
          <motion.div
            key={i}
            className={cn(
              "flex-1",
              isLast ? "bg-volt shadow-glow-volt-sm" : "bg-volt/30",
            )}
            initial={{ height: 0 }}
            animate={{ height: `${pct * 100}%` }}
            transition={{
              duration: 0.6,
              delay: delay + i * 0.04,
              ease: HUD_EASE,
            }}
          />
        );
      })}
    </div>
  );
}
