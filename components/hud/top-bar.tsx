"use client";

import Link from "next/link";
import { PROTOCOL_DAYS } from "@/lib/engine/season";

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
      <div className="flex items-center gap-4 font-mono text-[10px] tracking-micro text-ink-mute">
        {dayIndex !== undefined && (
          <>
            <span>
              DAY <span className="text-ink">{dayIndex}</span>
              <span className="text-ink-mute">/{PROTOCOL_DAYS}</span>
            </span>
            <span>
              STREAK <span className="text-volt">{streakDays}</span>
            </span>
          </>
        )}
        <Link
          href="/profil"
          className="transition-colors hover:text-ink-dim"
          aria-label="Profil opérateur"
        >
          ◈
        </Link>
        <Link href="/reglages" className="transition-colors hover:text-ink-dim" aria-label="Réglages">
          ⚙
        </Link>
      </div>
    </header>
  );
}
