"use client";

import { motion } from "motion/react";
import { RISK_TIERS } from "@/lib/engine/run-generator";
import { cn } from "@/lib/utils";

/** Sélecteur de risk tier — le cœur du risque/récompense roguelike. */
export function RiskSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (tier: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {RISK_TIERS.map((tier) => {
          const selected = tier.tier === value;
          const isRedline = tier.tier === 3;
          return (
            <motion.button
              key={tier.tier}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(tier.tier)}
              className={cn(
                "flex flex-col items-center gap-1 border py-3 transition-colors",
                selected
                  ? isRedline
                    ? "border-danger bg-danger/10 shadow-glow-danger"
                    : "border-volt bg-volt-faint shadow-glow-volt-sm"
                  : "border-line text-ink-mute hover:border-line-bright",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[9px] tracking-micro",
                  selected && (isRedline ? "text-danger" : "text-volt"),
                )}
              >
                T{tier.tier}
              </span>
              <span
                className={cn(
                  "font-display text-[10px] font-bold uppercase tracking-wider",
                  selected ? "text-ink" : "text-ink-mute",
                )}
              >
                {tier.name}
              </span>
              <span
                className={cn(
                  "font-mono text-xs font-bold tabular",
                  selected ? (isRedline ? "text-danger" : "text-volt") : "text-ink-mute",
                )}
              >
                ×{tier.mult.toFixed(2)}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-ink-dim">
        {RISK_TIERS[value].blurb}
        {RISK_TIERS[value].failPenalty > 0 && (
          <span className="text-danger">
            {" "}
            Run incomplet : −{Math.round(RISK_TIERS[value].failPenalty * 100)}% XP.
          </span>
        )}
      </p>
    </div>
  );
}
