"use client";

import Link from "next/link";

/** Barre HUD supérieure — identité + état du protocole, présente sur tous les écrans. */
export function TopBar({
  dayIndex,
  streakDays,
}: {
  dayIndex?: number;
  streakDays?: number;
}) {
  return (
    <header className="mb-6 flex items-center justify-between border-b border-line pb-4">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-display text-lg font-bold tracking-[0.3em]">
          ASCENT
        </span>
        <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-volt shadow-glow-volt-sm" />
      </Link>
      {dayIndex !== undefined && (
        <div className="flex items-center gap-4 font-mono text-[10px] tracking-micro text-ink-mute">
          <span>
            DAY <span className="text-ink">{dayIndex}</span>
          </span>
          <span>
            STREAK <span className="text-volt">{streakDays}</span>
          </span>
        </div>
      )}
    </header>
  );
}
