import type { Modifier, ModifierRarity, RiskTier } from "./types";

export const RISK_TIERS: RiskTier[] = [
  {
    tier: 0,
    name: "STANDARD",
    mult: 1.0,
    failPenalty: 0,
    blurb: "Exécute la séance. Pas de bonus, pas de malus.",
  },
  {
    tier: 1,
    name: "ENGAGED",
    mult: 1.15,
    failPenalty: 0.1,
    blurb: "+15% XP si le run est complet.",
  },
  {
    tier: 2,
    name: "OVERDRIVE",
    mult: 1.35,
    failPenalty: 0.25,
    blurb: "+35% XP — mais un run incomplet coûte cher.",
  },
  {
    tier: 3,
    name: "REDLINE",
    mult: 1.6,
    failPenalty: 0.45,
    blurb: "+60% XP. Tout ou presque rien.",
  },
];

// Nombre de modifiers tirés et poids de rareté selon le risk tier :
// plus tu montes, plus le tirage est riche.
const ROLL_TABLE: Record<number, { count: number; weights: Record<ModifierRarity, number> }> = {
  0: { count: 1, weights: { common: 0.8, rare: 0.2, epic: 0 } },
  1: { count: 2, weights: { common: 0.65, rare: 0.3, epic: 0.05 } },
  2: { count: 2, weights: { common: 0.45, rare: 0.4, epic: 0.15 } },
  3: { count: 3, weights: { common: 0.3, rare: 0.45, epic: 0.25 } },
};

function pickRarity(
  weights: Record<ModifierRarity, number>,
  rng: () => number,
): ModifierRarity {
  const roll = rng();
  if (roll < weights.epic) return "epic";
  if (roll < weights.epic + weights.rare) return "rare";
  return "common";
}

export function rollModifiers(
  catalog: Modifier[],
  riskTier: number,
  rng: () => number = Math.random,
): Modifier[] {
  const { count, weights } = ROLL_TABLE[riskTier] ?? ROLL_TABLE[0];
  const pool = [...catalog];
  const rolled: Modifier[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const rarity = pickRarity(weights, rng);
    // Cherche dans la rareté tirée, sinon dégrade vers le plus proche disponible
    const candidates =
      pool.filter((m) => m.rarity === rarity).length > 0
        ? pool.filter((m) => m.rarity === rarity)
        : pool;
    const pick = candidates[Math.floor(rng() * candidates.length)];
    rolled.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }

  return rolled;
}
