"use client";

import { motion } from "motion/react";
import type { Coach } from "@/lib/engine/coaches";
import { cn } from "@/lib/utils";
import { HUD_EASE } from "@/components/motion/primitives";
import { CoachInsignia } from "./coach-badge";

/** Transmission d'un handler — la voix dans l'oreillette. */
export function CoachLine({
  coach,
  line,
  label = "Transmission",
  delay = 0,
  className,
}: {
  coach: Coach;
  line: string;
  label?: string;
  delay?: number;
  className?: string;
}) {
  const isDanger = coach.accent === "danger";
  return (
    <motion.figure
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: HUD_EASE }}
      className={cn(
        "flex items-start gap-3 border-l-2 bg-surface/80 py-3 pl-3 pr-4",
        isDanger ? "border-danger" : "border-zone2",
        className,
      )}
    >
      <div className="shrink-0 pt-0.5">
        <CoachInsignia coach={coach} size={36} />
      </div>
      <div className="min-w-0">
        <figcaption
          className={cn("hud-label mb-1", isDanger ? "text-danger" : "text-zone2")}
        >
          {coach.codename} — {label}
        </figcaption>
        <blockquote className="text-sm italic leading-snug text-ink">
          “{line}”
        </blockquote>
        <p className="mt-1 font-mono text-[10px] tracking-micro text-ink-mute">
          — {coach.name.toUpperCase()}
        </p>
      </div>
    </motion.figure>
  );
}
