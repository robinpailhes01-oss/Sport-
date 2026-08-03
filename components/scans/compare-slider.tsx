"use client";

import { useState } from "react";

/** Slider avant/après — deux photos superposées, découpe pilotée par un input range invisible. */
export function CompareSlider({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
}: {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  const [pct, setPct] = useState(50);

  return (
    <div className="relative aspect-[3/4] w-full select-none overflow-hidden border border-line bg-void">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-volt shadow-glow-volt-sm"
        style={{ left: `${pct}%` }}
      />
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        aria-label="Position du comparateur"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />

      <span className="pointer-events-none absolute left-2 top-2 border border-line-bright bg-void/80 px-1.5 py-0.5 font-mono text-[9px] tracking-micro text-ink-dim">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-2 top-2 border border-volt/50 bg-void/80 px-1.5 py-0.5 font-mono text-[9px] tracking-micro text-volt">
        {afterLabel}
      </span>
    </div>
  );
}
