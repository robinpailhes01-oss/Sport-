"use client";

import type { Coach } from "@/lib/engine/coaches";
import { cn } from "@/lib/utils";

const ACCENTS = {
  danger: {
    stroke: "#FF4D4D",
    fill: "rgba(255,77,77,0.10)",
    text: "text-danger",
    glow: "drop-shadow(0 0 6px rgba(255,77,77,0.45))",
  },
  zone2: {
    stroke: "#4DA6FF",
    fill: "rgba(77,166,255,0.10)",
    text: "text-zone2",
    glow: "drop-shadow(0 0 6px rgba(77,166,255,0.45))",
  },
} as const;

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

/** Insigne hexagonal d'un handler — monogramme + couleur d'identité. */
export function CoachInsignia({
  coach,
  size = 48,
}: {
  coach: Coach;
  size?: number;
}) {
  const accent = ACCENTS[coach.accent];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={{ filter: accent.glow }}
      aria-label={coach.name}
    >
      <polygon
        points={hexPoints(24, 24, 22)}
        fill={accent.fill}
        stroke={accent.stroke}
        strokeWidth={1.5}
      />
      <polygon
        points={hexPoints(24, 24, 17)}
        fill="none"
        stroke={accent.stroke}
        strokeWidth={0.5}
        opacity={0.5}
      />
      <text
        x={24}
        y={25}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={accent.stroke}
        fontSize={13}
        fontWeight={700}
        fontFamily="var(--font-display)"
        letterSpacing={1}
      >
        {coach.monogram}
      </text>
    </svg>
  );
}

/** Badge complet : insigne + identité, pour le panneau Handlers du QG. */
export function CoachBadge({ coach }: { coach: Coach }) {
  const accent = ACCENTS[coach.accent];
  return (
    <div className="flex items-center gap-3">
      <CoachInsignia coach={coach} />
      <div className="min-w-0">
        <p className={cn("hud-label mb-0.5", accent.text)}>{coach.codename}</p>
        <p className="truncate font-display text-sm font-bold uppercase tracking-wider">
          {coach.name}
        </p>
        <p className="mt-0.5 font-mono text-[10px] tracking-micro text-ink-mute">
          {coach.domain.toUpperCase()}
        </p>
      </div>
    </div>
  );
}
