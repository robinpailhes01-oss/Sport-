"use client";

import { motion } from "motion/react";
import { HUD_EASE } from "@/components/motion/primitives";
import { MUSCLES, type MuscleKey } from "@/lib/engine/exercises";
import type { ZoneStatus } from "@/lib/engine/strength";
import { cn } from "@/lib/utils";

// La silhouette HUD — chaque groupe musculaire est un tracé cliquable.
// Volontairement schématique : c'est un instrument de lecture, pas une
// planche d'anatomie. Ce qui compte, c'est de repérer une zone froide
// d'un coup d'œil.

export const ZONE_FILL: Record<ZoneStatus, string> = {
  surchargee: "rgba(200,255,0,0.85)",
  solide: "rgba(200,255,0,0.45)",
  entretenue: "rgba(154,163,178,0.18)",
  negligee: "rgba(255,77,77,0.30)",
};

export const ZONE_LABELS: Record<ZoneStatus, string> = {
  surchargee: "Surchargée",
  solide: "Solide",
  entretenue: "Entretenue",
  negligee: "Négligée",
};

/** Tracés de la vue de FACE — viewBox 100 × 200. */
const FRONT_PATHS: Partial<Record<MuscleKey, string>> = {
  epaules:
    "M31 52 q-8 2 -10 10 q-1 6 1 11 l9 -3 q0 -10 4 -16 Z M69 52 q8 2 10 10 q1 6 -1 11 l-9 -3 q0 -10 -4 -16 Z",
  pectoraux:
    "M36 53 q14 -4 28 0 q1 12 -2 20 q-12 4 -24 0 q-3 -8 -2 -20 Z",
  core: "M39 75 q11 3 22 0 q1 16 -2 30 q-9 3 -18 0 q-3 -14 -2 -30 Z",
  biceps:
    "M22 65 q-4 8 -3 18 q1 6 4 9 l6 -3 q-2 -12 0 -22 Z M78 65 q4 8 3 18 q-1 6 -4 9 l-6 -3 q2 -12 0 -22 Z",
  "avant-bras":
    "M23 93 q-3 10 -1 20 q1 5 4 6 l5 -2 q-1 -13 1 -23 Z M77 93 q3 10 1 20 q-1 5 -4 6 l-5 -2 q1 -13 -1 -23 Z",
  quadriceps:
    "M40 108 q-3 20 -2 38 q1 8 3 12 l8 -1 q1 -25 0 -49 Z M60 108 q3 20 2 38 q-1 8 -3 12 l-8 -1 q-1 -25 0 -49 Z",
};

/** Tracés de la vue de DOS — viewBox 100 × 200. */
const BACK_PATHS: Partial<Record<MuscleKey, string>> = {
  trapezes:
    "M38 46 q12 -3 24 0 q3 10 0 18 q-12 3 -24 0 q-3 -8 0 -18 Z",
  epaules:
    "M31 52 q-8 2 -10 10 q-1 6 1 11 l9 -3 q0 -10 4 -16 Z M69 52 q8 2 10 10 q1 6 -1 11 l-9 -3 q0 -10 -4 -16 Z",
  dorsaux:
    "M35 66 q15 -3 30 0 q2 14 -3 24 q-12 4 -24 0 q-5 -10 -3 -24 Z",
  triceps:
    "M22 65 q-4 8 -3 18 q1 6 4 9 l6 -3 q-2 -12 0 -22 Z M78 65 q4 8 3 18 q-1 6 -4 9 l-6 -3 q2 -12 0 -22 Z",
  lombaires:
    "M40 91 q10 3 20 0 q1 8 0 15 q-10 3 -20 0 q-1 -7 0 -15 Z",
  fessiers:
    "M38 107 q12 -3 24 0 q2 12 -2 18 q-10 4 -20 0 q-4 -6 -2 -18 Z",
  ischios:
    "M40 127 q-2 16 -1 30 q1 6 3 9 l8 -1 q0 -20 -1 -38 Z M60 127 q2 16 1 30 q-1 6 -3 9 l-8 -1 q0 -20 1 -38 Z",
  mollets:
    "M42 168 q-2 12 0 20 q1 4 3 5 l5 -1 q0 -14 -1 -24 Z M58 168 q2 12 0 20 q-1 4 -3 5 l-5 -1 q0 -14 1 -24 Z",
  "avant-bras":
    "M23 93 q-3 10 -1 20 q1 5 4 6 l5 -2 q-1 -13 1 -23 Z M77 93 q3 10 1 20 q-1 5 -4 6 l-5 -2 q1 -13 -1 -23 Z",
};

// Contour du corps — décomposé en pièces simples plutôt qu'un seul tracé
// tortueux : chaque pièce englobe franchement les zones musculaires qu'elle
// contient, ce qui évite qu'un muscle déborde de la silhouette.
const OUTLINE_PIECES = [
  // tête + cou
  "M50 16 a10 11 0 0 1 0 22 a10 11 0 0 1 0 -22 Z",
  "M46 36 h8 v12 h-8 Z",
  // tronc : épaules larges, taille marquée, bassin
  "M33 48 q17 -5 34 0 q2 14 1 28 q-1 16 -3 30 q1 10 1 20 q-16 5 -32 0 q0 -10 1 -20 q-2 -14 -3 -30 q-1 -14 1 -28 Z",
  // bras gauche / droit (épaule → main)
  "M33 50 q-11 3 -14 14 q-2 13 -1 26 q0 16 2 30 h11 q-2 -15 -2 -30 q-1 -13 1 -24 q1 -11 3 -16 Z",
  "M67 50 q11 3 14 14 q2 13 1 26 q0 16 -2 30 h-11 q2 -15 2 -30 q1 -13 -1 -24 q-1 -11 -3 -16 Z",
  // jambes (bassin → pieds), assez longues pour contenir les mollets
  "M37 124 q7 2 12 0 q2 20 1 40 q-1 18 -2 32 q-6 2 -11 0 q-1 -16 -1 -32 q0 -22 1 -40 Z",
  "M63 124 q-7 2 -12 0 q-2 20 -1 40 q1 18 2 32 q6 2 11 0 q1 -16 1 -32 q0 -22 -1 -40 Z",
];

export function BodyMap({
  view,
  statusByMuscle,
  selected,
  onSelect,
  className,
  animate = true,
}: {
  view: "front" | "back";
  statusByMuscle: Record<MuscleKey, ZoneStatus>;
  selected?: MuscleKey | null;
  onSelect?: (muscle: MuscleKey) => void;
  className?: string;
  animate?: boolean;
}) {
  const paths = view === "front" ? FRONT_PATHS : BACK_PATHS;
  const entries = Object.entries(paths) as [MuscleKey, string][];

  return (
    <svg
      viewBox="0 0 100 200"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={`Carte musculaire — vue de ${view === "front" ? "face" : "dos"}`}
    >
      {OUTLINE_PIECES.map((d, i) => (
        <path key={i} d={d} fill="#111318" stroke="#23262E" strokeWidth={0.8} />
      ))}

      {entries.map(([muscle, d], i) => {
        const status = statusByMuscle[muscle] ?? "entretenue";
        const isSelected = selected === muscle;
        return (
          <motion.path
            key={muscle}
            d={d}
            fill={ZONE_FILL[status]}
            stroke={isSelected ? "#C8FF00" : "#23262E"}
            strokeWidth={isSelected ? 1.2 : 0.5}
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.04, ease: HUD_EASE }}
            onClick={() => onSelect?.(muscle)}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            <title>{MUSCLES[muscle].label}</title>
          </motion.path>
        );
      })}
    </svg>
  );
}

export function ZoneLegend() {
  const order: ZoneStatus[] = ["surchargee", "solide", "entretenue", "negligee"];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {order.map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 border border-line"
            style={{ background: ZONE_FILL[status] }}
          />
          <span className="font-mono text-[9px] tracking-micro text-ink-mute">
            {ZONE_LABELS[status].toUpperCase()}
          </span>
        </span>
      ))}
    </div>
  );
}
