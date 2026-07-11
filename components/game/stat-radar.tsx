"use client";

import { motion } from "motion/react";
import { STAT_KEYS, STATS, type StatKey, type StatState } from "@/lib/engine/types";
import { HUD_EASE } from "@/components/motion/primitives";

const WIDTH = 320;
const HEIGHT = 268;
const CX = WIDTH / 2;
const CY = HEIGHT / 2 + 6;
const R = 92;

function point(index: number, radius: number): [number, number] {
  // 5 axes, départ en haut, sens horaire
  const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function polygonPoints(radii: number[]): string {
  return radii
    .map((r, i) => point(i, r))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
}

/** Pentagone radar des 5 stats — la pièce centrale de l'écran avatar. */
export function StatRadar({
  stats,
}: {
  stats: Record<StatKey, StatState>;
}) {
  const levels = STAT_KEYS.map((k) => stats[k].level);
  const maxLevel = Math.max(10, ...levels);
  const radii = levels.map((lvl) => (lvl / maxLevel) * R);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[320px]"
      role="img"
      aria-label="Radar des 5 stats"
    >
      {/* anneaux de grille */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={polygonPoints(Array(5).fill(R * f))}
          fill="none"
          stroke="#23262E"
          strokeWidth={1}
        />
      ))}
      {/* axes */}
      {STAT_KEYS.map((_, i) => {
        const [x, y] = point(i, R);
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="#23262E"
            strokeWidth={1}
          />
        );
      })}
      {/* surface des stats */}
      <motion.polygon
        points={polygonPoints(radii)}
        fill="rgba(200,255,0,0.10)"
        stroke="#C8FF00"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0 0 8px rgba(200,255,0,0.45))" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: HUD_EASE, delay: 0.2 }}
      />
      {/* sommets */}
      {radii.map((r, i) => {
        const [x, y] = point(i, r);
        return (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={2.5}
            fill="#C8FF00"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.06 }}
          />
        );
      })}
      {/* labels */}
      {STAT_KEYS.map((key, i) => {
        const [x, y] = point(i, R + 24);
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ink-dim font-mono"
            fontSize={10}
            letterSpacing={1.5}
          >
            {STATS[key].label.toUpperCase()}
            <tspan x={x} dy={13} className="fill-volt" fontSize={10}>
              {stats[key].level}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
