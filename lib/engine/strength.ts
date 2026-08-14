// Le moteur d'analyse de force — pur, zéro I/O. Transforme des séries brutes
// en signaux exploitables : e1RM, tonnage par muscle, stagnation, et la
// charge à proposer à la prochaine séance.
//
// Principe : tout ce qui s'affiche dans l'atlas ou sort de la bouche d'un
// agent doit se calculer ICI, à partir de séries réellement saisies. Jamais
// d'estimation présentée comme une mesure.

import {
  EXERCISES,
  MUSCLE_KEYS,
  exerciseByKey,
  involvement,
  type MuscleKey,
} from "./exercises";
import type { SetLog } from "./types";

const DAY_MS = 24 * 3600 * 1000;

function daysAgo(date: string): number {
  return Math.floor((Date.now() - Date.parse(`${date}T00:00:00`)) / DAY_MS);
}

/**
 * 1RM estimé par la formule d'Epley : poids × (1 + reps/30).
 * Au-delà de 12 reps la formule dérive — on la borne pour rester honnête.
 */
export function epley(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, 12) / 30);
}

export interface ExerciseStrength {
  exerciseKey: string;
  /** e1RM courant — moyenne des 3 meilleures séries des 30 derniers jours */
  e1rm: number;
  /** e1RM de la période 30–60 jours, pour la tendance */
  previousE1rm: number | null;
  /** Variation en % vs période précédente, null si pas d'historique */
  trendPct: number | null;
  /** Aucun progrès mesurable (±2%) depuis 4 semaines sur au moins 2 séances */
  stagnating: boolean;
  sessionCount: number;
  lastDate: string | null;
  bestSet: { weightKg: number; reps: number } | null;
}

/** Analyse un exercice à partir de toutes ses séries. */
export function analyzeExercise(
  exerciseKey: string,
  logs: SetLog[],
): ExerciseStrength {
  const mine = logs
    .filter((l) => l.exerciseKey === exerciseKey)
    .sort((a, b) => b.date.localeCompare(a.date));

  const recent = mine.filter((l) => daysAgo(l.date) <= 30);
  const previous = mine.filter(
    (l) => daysAgo(l.date) > 30 && daysAgo(l.date) <= 60,
  );

  const topThree = (set: SetLog[]) =>
    set
      .map((l) => epley(l.weightKg, l.reps))
      .sort((a, b) => b - a)
      .slice(0, 3);

  const avg = (values: number[]) =>
    values.length === 0
      ? 0
      : values.reduce((s, v) => s + v, 0) / values.length;

  const e1rm = avg(topThree(recent));
  const prevValues = topThree(previous);
  const previousE1rm = prevValues.length > 0 ? avg(prevValues) : null;
  const trendPct =
    previousE1rm && previousE1rm > 0
      ? ((e1rm - previousE1rm) / previousE1rm) * 100
      : null;

  const sessionDates = new Set(recent.map((l) => l.date));
  const best = recent.reduce<SetLog | null>(
    (acc, l) => (acc === null || epley(l.weightKg, l.reps) > epley(acc.weightKg, acc.reps) ? l : acc),
    null,
  );

  return {
    exerciseKey,
    e1rm,
    previousE1rm,
    trendPct,
    // Stagnation = assez de données ET progrès quasi nul. Sans historique
    // suffisant on ne conclut rien plutôt que d'alarmer à tort.
    stagnating:
      previousE1rm !== null &&
      sessionDates.size >= 2 &&
      trendPct !== null &&
      Math.abs(trendPct) < 2,
    sessionCount: sessionDates.size,
    lastDate: mine[0]?.date ?? null,
    bestSet: best ? { weightKg: best.weightKg, reps: best.reps } : null,
  };
}

/** Tonnage (kg soulevés, pondérés par implication) par muscle sur N jours. */
export function tonnageByMuscle(
  logs: SetLog[],
  days = 28,
): Record<MuscleKey, number> {
  const totals = Object.fromEntries(
    MUSCLE_KEYS.map((k) => [k, 0]),
  ) as Record<MuscleKey, number>;

  for (const log of logs) {
    if (daysAgo(log.date) > days) continue;
    const exercise = exerciseByKey(log.exerciseKey);
    if (!exercise) continue;
    const volume = log.weightKg * log.reps;
    for (const muscle of MUSCLE_KEYS) {
      const part = involvement(exercise, muscle);
      if (part > 0) totals[muscle] += volume * part;
    }
  }
  return totals;
}

export type ZoneStatus = "surchargee" | "solide" | "entretenue" | "negligee";

export interface MuscleZone {
  muscle: MuscleKey;
  tonnage: number;
  /** Part du tonnage total, 0..1 — c'est le relatif qui informe, pas l'absolu */
  share: number;
  status: ZoneStatus;
}

/**
 * Statut de chaque zone, calculé en RELATIF au reste du corps : un muscle
 * n'est "négligé" que comparé à ce que tu travailles par ailleurs. Sans
 * aucune donnée, tout est "entretenue" — l'app ne prétend rien savoir.
 */
export function muscleZones(logs: SetLog[], days = 28): MuscleZone[] {
  const tonnage = tonnageByMuscle(logs, days);
  const values = MUSCLE_KEYS.map((k) => tonnage[k]);
  const total = values.reduce((s, v) => s + v, 0);

  if (total === 0) {
    return MUSCLE_KEYS.map((muscle) => ({
      muscle,
      tonnage: 0,
      share: 0,
      status: "entretenue" as ZoneStatus,
    }));
  }

  const worked = values.filter((v) => v > 0);
  const median = worked.sort((a, b) => a - b)[Math.floor(worked.length / 2)] ?? 0;

  return MUSCLE_KEYS.map((muscle) => {
    const value = tonnage[muscle];
    let status: ZoneStatus;
    if (value === 0) status = "negligee";
    else if (value >= median * 1.6) status = "surchargee";
    else if (value >= median * 0.75) status = "solide";
    else status = "entretenue";
    return { muscle, tonnage: value, share: value / total, status };
  });
}

export interface SetSuggestion {
  weightKg: number;
  reps: number;
  /** Pourquoi cette proposition — affiché à l'opérateur, jamais de magie noire */
  reason: string;
}

/**
 * Progression double : on remplit d'abord les reps cibles à charge constante,
 * puis on monte la charge d'un cran et on repart en bas de fourchette.
 * Plafonné à +5%/séance — l'IA et l'auto-progression ne peuvent pas
 * t'envoyer dans le mur.
 */
export function suggestNextSet(
  exerciseKey: string,
  repsTarget: number,
  logs: SetLog[],
): SetSuggestion | null {
  const mine = logs
    .filter((l) => l.exerciseKey === exerciseKey)
    .sort((a, b) => b.date.localeCompare(a.date) || b.setIndex - a.setIndex);
  if (mine.length === 0) return null;

  const lastDate = mine[0].date;
  const lastSession = mine.filter((l) => l.date === lastDate);
  const topWeight = Math.max(...lastSession.map((l) => l.weightKg));
  const atTop = lastSession.filter((l) => l.weightKg === topWeight);
  const allHitTarget = atTop.every((l) => l.reps >= repsTarget);

  if (allHitTarget) {
    const step = topWeight >= 60 ? 5 : 2.5;
    const capped = Math.min(topWeight + step, topWeight * 1.05);
    // arrondi au pas de 2.5 kg le plus proche, borné à au moins +2.5
    const next = Math.max(
      topWeight + 2.5,
      Math.round((capped / 2.5)) * 2.5,
    );
    return {
      weightKg: next,
      reps: repsTarget,
      reason: `${repsTarget} reps tenues partout la dernière fois — +${(next - topWeight).toFixed(1)} kg`,
    };
  }

  return {
    weightKg: topWeight,
    reps: repsTarget,
    reason: `Même charge — objectif ${repsTarget} reps sur toutes les séries`,
  };
}

/** Force relative au poids de corps, pour les 3 mouvements de référence. */
export interface StrengthRatio {
  exerciseKey: string;
  label: string;
  e1rm: number;
  ratio: number;
  targetRatio: number;
}

const RATIO_TARGETS: { key: string; label: string; target: number }[] = [
  { key: "back-squat", label: "Squat", target: 1.75 },
  { key: "deadlift", label: "Deadlift", target: 2.2 },
  { key: "strict-press", label: "Strict Press", target: 0.85 },
];

export function strengthRatios(
  logs: SetLog[],
  bodyweightKg: number | null,
): StrengthRatio[] {
  if (!bodyweightKg || bodyweightKg <= 0) return [];
  return RATIO_TARGETS.map(({ key, label, target }) => {
    const { e1rm } = analyzeExercise(key, logs);
    return {
      exerciseKey: key,
      label,
      e1rm,
      ratio: e1rm / bodyweightKg,
      targetRatio: target,
    };
  }).filter((r) => r.e1rm > 0);
}

/** Tous les exercices déjà chargés au moins une fois, du plus récent au plus ancien. */
export function trackedExercises(logs: SetLog[]): ExerciseStrength[] {
  const keys = Array.from(new Set(logs.map((l) => l.exerciseKey)));
  return keys
    .map((k) => analyzeExercise(k, logs))
    .filter((a) => a.e1rm > 0)
    .sort((a, b) => (b.lastDate ?? "").localeCompare(a.lastDate ?? ""));
}

/** Exercices du référentiel jamais chargés — angles morts du programme. */
export function untrackedExercises(logs: SetLog[]): string[] {
  const seen = new Set(logs.map((l) => l.exerciseKey));
  return EXERCISES.filter((e) => !seen.has(e.key)).map((e) => e.key);
}
