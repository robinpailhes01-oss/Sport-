import type { StatKey } from "./types";

// LE LIVRE DES RECORDS — chaque mouvement mesurable, sa cible de saison,
// et les règles de comparaison. Un PR validé nourrit la stat du mouvement.

export type RecordUnit = "kg" | "time" | "reps" | "m";

export interface Movement {
  key: string;
  label: string;
  stat: StatKey;
  unit: RecordUnit;
  betterIs: "higher" | "lower";
  /** Cible de saison (kg, secondes, reps ou mètres) */
  target: number;
  targetLabel: string;
}

export const MOVEMENTS: Movement[] = [
  // 💪 FORCE — ratios au poids de corps (~70 kg)
  { key: "back-squat", label: "Back Squat", stat: "force", unit: "kg", betterIs: "higher", target: 120, targetLabel: "120 kg · 1.75×BW" },
  { key: "deadlift", label: "Deadlift", stat: "force", unit: "kg", betterIs: "higher", target: 150, targetLabel: "150 kg · 2.2×BW" },
  { key: "strict-press", label: "Strict Press", stat: "force", unit: "kg", betterIs: "higher", target: 60, targetLabel: "60 kg · 0.85×BW" },
  // 🫀 MOTEUR — chronos (stockés en secondes)
  { key: "five-k", label: "5K", stat: "engine", unit: "time", betterIs: "lower", target: 1200, targetLabel: "< 20:00" },
  { key: "row-2k", label: "Row 2K", stat: "engine", unit: "time", betterIs: "lower", target: 430, targetLabel: "< 7:10" },
  { key: "hyrox", label: "Hyrox", stat: "engine", unit: "time", betterIs: "lower", target: 4500, targetLabel: "< 75:00" },
  // 🤸 SKILL
  { key: "muscle-ups", label: "Muscle-ups strict", stat: "skill", unit: "reps", betterIs: "higher", target: 5, targetLabel: "5 unbroken" },
  { key: "hspu", label: "HSPU", stat: "skill", unit: "reps", betterIs: "higher", target: 10, targetLabel: "10 unbroken" },
  { key: "handstand-walk", label: "Handstand walk", stat: "skill", unit: "m", betterIs: "higher", target: 10, targetLabel: "10 m" },
];

// Objectifs d'habitude (non mesurés en PR) — affichés avec les objectifs de saison.
export interface HabitTarget {
  stat: StatKey;
  label: string;
  target: string;
}

export const HABIT_TARGETS: HabitTarget[] = [
  { stat: "discipline", label: "Sommeil", target: "7h30 moy. / 30 j" },
  { stat: "discipline", label: "Protéines", target: "140 g/j · 2 g/kg" },
  { stat: "mental", label: "REDLINE tenu", target: "1 / semaine" },
  { stat: "mental", label: "Streak", target: "30 jours" },
];

export function movementByKey(key: string): Movement | null {
  return MOVEMENTS.find((m) => m.key === key) ?? null;
}

export function formatRecordValue(unit: RecordUnit, value: number): string {
  switch (unit) {
    case "time": {
      const mm = Math.floor(value / 60);
      const ss = Math.round(value % 60);
      return `${mm}:${String(ss).padStart(2, "0")}`;
    }
    case "kg":
      return `${value % 1 === 0 ? value : value.toFixed(1)} kg`;
    case "reps":
      return `×${value}`;
    case "m":
      return `${value} m`;
  }
}

/** Delta signé entre deux essais, formaté dans le sens du mouvement. */
export function formatDelta(unit: RecordUnit, from: number, to: number): string {
  const d = to - from;
  if (d === 0) return "=";
  const sign = d > 0 ? "+" : "−";
  const abs = Math.abs(d);
  if (unit === "time") {
    const mm = Math.floor(abs / 60);
    const ss = Math.round(abs % 60);
    return `${sign}${mm}:${String(ss).padStart(2, "0")}`;
  }
  const val = abs % 1 === 0 ? String(abs) : abs.toFixed(1);
  return `${sign}${val}${unit === "kg" ? " kg" : unit === "m" ? " m" : ""}`;
}

/** "19:45" → 1185 s ; accepte aussi "75:00". Null si invalide. */
export function parseTimeValue(raw: string): number | null {
  const match = raw.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function isImprovement(
  movement: Movement,
  prevBest: number | null,
  value: number,
): boolean {
  if (prevBest === null) return true;
  return movement.betterIs === "higher" ? value > prevBest : value < prevBest;
}

export function bestOf(movement: Movement, values: number[]): number | null {
  if (values.length === 0) return null;
  return movement.betterIs === "higher"
    ? Math.max(...values)
    : Math.min(...values);
}
