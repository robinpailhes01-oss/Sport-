"use client";

import { motion } from "motion/react";
import type { Modifier, ModifierRarity } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { HUD_EASE } from "@/components/motion/primitives";

const RARITY_STYLES: Record<
  ModifierRarity,
  { label: string; card: string; badge: string }
> = {
  common: {
    label: "COMMON",
    card: "border-line-bright",
    badge: "text-ink-dim border-line-bright",
  },
  rare: {
    label: "RARE",
    card: "border-volt/40 shadow-glow-volt-sm",
    badge: "text-volt border-volt/50",
  },
  epic: {
    label: "EPIC",
    card: "border-arcane/50 shadow-glow-arcane",
    badge: "text-arcane border-arcane/60",
  },
};

/** Carte de modifier — révélée façon tirage de loot, colorée par rareté. */
export function ModifierCard({
  modifier,
  index = 0,
  className,
}: {
  modifier: Modifier;
  index?: number;
  className?: string;
}) {
  const style = RARITY_STYLES[modifier.rarity];
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: 90, y: 10 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ duration: 0.55, delay: 0.15 + index * 0.18, ease: HUD_EASE }}
      style={{ transformPerspective: 600 }}
      className={cn(
        "relative border bg-surface-raised p-4",
        style.card,
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "border px-1.5 py-0.5 font-mono text-[9px] tracking-micro",
            style.badge,
          )}
        >
          {style.label}
        </span>
        <span className="font-mono text-xs font-bold text-volt tabular">
          ×{modifier.xpMult.toFixed(2)}
        </span>
      </div>
      <p className="font-display text-sm font-bold uppercase tracking-wide">
        {modifier.name}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-dim">
        {modifier.description}
      </p>
    </motion.div>
  );
}
