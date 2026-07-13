import type { StatKey } from "./types";

// LE JOURNAL — les habitudes essentielles, volontairement peu nombreuses.
// Chaque case cochée nourrit une stat ; l'XP n'est accordée qu'à la première
// coche du jour (décocher/recocher ne farme rien).

export interface Habit {
  key: string;
  label: string;
  glyph: string;
  stat: StatKey;
  xp: number;
  blurb: string;
}

export const HABITS: Habit[] = [
  {
    key: "sans-alcool",
    label: "Sans alcool",
    glyph: "⛔",
    stat: "discipline",
    xp: 10,
    blurb: "Zéro verre aujourd'hui",
  },
  {
    key: "visualisation",
    label: "Visualisation",
    glyph: "👁",
    stat: "mental",
    xp: 10,
    blurb: "5 min — te voir réussir",
  },
  {
    key: "lecture",
    label: "Lecture",
    glyph: "📖",
    stat: "mental",
    xp: 10,
    blurb: "20 min minimum",
  },
  {
    key: "ecrans-off",
    label: "Écrans off 22h30",
    glyph: "📵",
    stat: "discipline",
    xp: 10,
    blurb: "Cutoff strict — le sommeil commence là",
  },
  {
    key: "coucher-regulier",
    label: "Coucher régulier",
    glyph: "🌙",
    stat: "discipline",
    xp: 10,
    blurb: "Même heure ±30 min",
  },
  {
    key: "recup-outils",
    label: "Récup active",
    glyph: "❄️",
    stat: "discipline",
    xp: 10,
    blurb: "Hammam, bain froid ou compression",
  },
];

export function habitByKey(key: string): Habit | null {
  return HABITS.find((h) => h.key === key) ?? null;
}

/** Bonus si tout le journal du jour est coché */
export const FULL_JOURNAL_BONUS = 10;

// ÉPARGNE — l'objectif de vie chiffré : 10 000 € de côté.
// Chaque dépôt loggé rapporte un XP fixe (le montant ne change pas l'XP :
// on récompense le geste, pas la somme).
export const SAVINGS_GOAL = 10_000;
export const SAVINGS_XP = 15;

export function formatEuro(n: number): string {
  return `${n.toLocaleString("fr-FR")} €`;
}
