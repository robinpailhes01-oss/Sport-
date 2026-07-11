"use client";

import { STATS, type StatKey, type StatState } from "@/lib/engine/types";
import { formatXp } from "@/lib/utils";
import { XPBar } from "./xp-bar";

/** Ligne de stat : glyphe, label, niveau, barre de progression vers le niveau suivant. */
export function StatRow({
  statKey,
  state,
  delay = 0,
}: {
  statKey: StatKey;
  state: StatState;
  delay?: number;
}) {
  const meta = STATS[statKey];
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="w-8 text-center text-xl" aria-hidden>
        {meta.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="font-display text-sm font-semibold uppercase tracking-wider">
            {meta.label}
          </span>
          <span className="font-mono text-[11px] text-ink-mute tabular">
            {formatXp(state.progress.current)} / {formatXp(state.progress.needed)}
          </span>
        </div>
        <XPBar pct={state.progress.pct} delay={delay} glow={false} />
      </div>
      <div className="w-12 text-right">
        <span className="hud-label block">LV</span>
        <span className="font-display text-2xl font-bold leading-none text-volt">
          {state.level}
        </span>
      </div>
    </div>
  );
}
