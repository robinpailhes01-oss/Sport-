import { levelFromXp } from "./xp";
import { RISK_TIERS } from "./run-generator";
import type {
  LevelUp,
  Run,
  RunOutcome,
  RunPerformance,
  StatKey,
  WorkoutTemplate,
} from "./types";

// Transforme la performance loggée en verdict : score, XP par stat, level ups.
// Pur et déterministe — ce qui permettra de le tester et de re-tuner les courbes.
export function computeOutcome(
  template: WorkoutTemplate,
  run: Run,
  performance: RunPerformance,
  xpBefore: Record<StatKey, number>,
): RunOutcome {
  const tier = RISK_TIERS[run.riskTier] ?? RISK_TIERS[0];

  const blocksTotal = template.blocks.length;
  const blocksDone = performance.blocksDone.filter(Boolean).length;
  const completion = blocksTotal === 0 ? 1 : blocksDone / blocksTotal;
  const flawless = completion >= 1;

  // Seuls les modifiers HONORÉS multiplient l'XP — la variance vit dans le scoring,
  // jamais dans le contenu de la séance.
  const honoredMult = run.modifiers.reduce(
    (mult, mod, i) => (performance.modifiersHonored[i] ? mult * mod.xpMult : mult),
    1,
  );

  // Le risk tier paie plein pot sur un run complet ; sinon le malus s'applique.
  const riskMult = flawless ? tier.mult : Math.max(0.4, 1 - tier.failPenalty);

  const honoredRatio =
    run.modifiers.length === 0
      ? 1
      : performance.modifiersHonored.filter(Boolean).length / run.modifiers.length;
  const score = completion * (0.7 + 0.3 * honoredRatio);

  const multiplier = honoredMult * riskMult;
  const totalXp = Math.round(template.baseXp * completion * multiplier);

  const xpByStat: Partial<Record<StatKey, number>> = {};
  for (const [stat, weight] of Object.entries(template.statWeights) as [
    StatKey,
    number,
  ][]) {
    xpByStat[stat] = Math.round(totalXp * weight);
  }

  // Tenir un run complet en tier élevé forge le mental.
  if (flawless && run.riskTier >= 2) {
    xpByStat.mental = (xpByStat.mental ?? 0) + run.riskTier * 15;
  }

  const levelUps: LevelUp[] = [];
  for (const [stat, gained] of Object.entries(xpByStat) as [StatKey, number][]) {
    const from = levelFromXp(xpBefore[stat]);
    const to = levelFromXp(xpBefore[stat] + gained);
    if (to > from) levelUps.push({ stat, from, to });
  }

  return { score, totalXp, xpByStat, multiplier, levelUps, flawless };
}
