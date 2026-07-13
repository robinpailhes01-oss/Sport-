"use client";

import { ANALYST } from "@/lib/engine/analyst";

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

/** Insigne de l'Analyste — volt : il est la voix des données de progression. */
export function AnalystInsignia({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={{ filter: "drop-shadow(0 0 7px rgba(200,255,0,0.4))" }}
      aria-label={ANALYST.name}
    >
      <polygon
        points={hexPoints(24, 24, 22)}
        fill="rgba(200,255,0,0.08)"
        stroke="#C8FF00"
        strokeWidth={1.5}
      />
      <polygon
        points={hexPoints(24, 24, 17)}
        fill="none"
        stroke="#C8FF00"
        strokeWidth={0.5}
        opacity={0.5}
      />
      <text
        x={24}
        y={26}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#C8FF00"
        fontSize={16}
        fontWeight={700}
        fontFamily="var(--font-display)"
      >
        {ANALYST.monogram}
      </text>
    </svg>
  );
}
