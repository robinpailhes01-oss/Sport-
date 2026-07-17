import type { StatKey, StatProgress, StatState } from "./types";

// Courbe de niveau : XP cumulée requise pour ATTEINDRE le niveau n.
// 100 × n^1.6 → lvl 1 = 100 XP, lvl 5 ≈ 1 313, lvl 10 ≈ 3 981.
// Tunable sans migration : l'XP vit dans un ledger, le niveau est toujours dérivé.
export function xpThreshold(level: number): number {
  if (level <= 0) return 0;
  return Math.round(100 * Math.pow(level, 1.6));
}

export function levelFromXp(xp: number): number {
  let level = 0;
  while (xp >= xpThreshold(level + 1)) level++;
  return level;
}

export function progressFromXp(xp: number): StatProgress {
  const level = levelFromXp(xp);
  const floor = xpThreshold(level);
  const ceil = xpThreshold(level + 1);
  const current = xp - floor;
  const needed = ceil - floor;
  return { level, current, needed, pct: Math.min(1, current / needed) };
}

export function statStateFromXp(xp: number): StatState {
  const progress = progressFromXp(xp);
  return { xp, level: progress.level, progress };
}

// Score global /100 — chaque stat plafonne sa contribution à 20 (5 stats × 20 = 100),
// pour que le score reste un vrai "/100" même quand les niveaux dépassent 20 avec les mois.
const SCORE_STAT_CAP = 20;

export function totalScore(xpByStat: Record<StatKey, number>): number {
  return Object.values(xpByStat).reduce(
    (sum, xp) => sum + Math.min(levelFromXp(xp), SCORE_STAT_CAP),
    0,
  );
}
