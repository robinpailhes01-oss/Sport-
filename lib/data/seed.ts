import type { Modifier, WorkoutTemplate, XpEvent } from "@/lib/engine/types";

// ⚠️ DONNÉES MOCK — Phase "interface d'abord".
// Les templates seront remplacés par l'ingestion de la vraie lib de programmation,
// et les events par le ledger Supabase. Les formats, eux, sont définitifs.

export const TEMPLATES: WorkoutTemplate[] = [
  {
    id: "tpl-force-lower",
    slug: "force-lower-heavy",
    title: "Lower Heavy",
    type: "force",
    durationMin: 60,
    primaryStat: "force",
    statWeights: { force: 0.8, mental: 0.2 },
    baseXp: 120,
    blocks: [
      { name: "A. Back Squat", detail: "5 × 3 @ 82% — repos 3 min" },
      { name: "B. Romanian Deadlift", detail: "4 × 6 @ RPE 8" },
      { name: "C. Split Squat", detail: "3 × 8 / jambe — tempo 3-1-1" },
      { name: "D. Core anti-extension", detail: "3 × 45s ab wheel" },
    ],
  },
  {
    id: "tpl-hyper-upper",
    slug: "hypertrophie-upper",
    title: "Upper Volume",
    type: "hypertrophie",
    durationMin: 55,
    primaryStat: "force",
    statWeights: { force: 0.8, mental: 0.2 },
    baseXp: 110,
    blocks: [
      { name: "A. Développé incliné", detail: "4 × 8 @ RPE 8" },
      { name: "B. Tractions lestées", detail: "4 × 6" },
      { name: "C1. Élévations latérales", detail: "3 × 15" },
      { name: "C2. Rowing unilatéral", detail: "3 × 10 / bras" },
      { name: "D. Superset biceps/triceps", detail: "3 × 12 + 12" },
    ],
  },
  {
    id: "tpl-zone2-70",
    slug: "zone2-70",
    title: "Base Aérobie 70′",
    type: "zone2",
    durationMin: 70,
    primaryStat: "engine",
    statWeights: { engine: 0.85, mental: 0.15 },
    baseXp: 100,
    blocks: [
      { name: "Bloc unique", detail: "70 min @ 132–142 bpm — respiration nasale" },
      { name: "Contrôle dérive", detail: "Dérive cardiaque < 5% entre 1re et 2e moitié" },
    ],
  },
  {
    id: "tpl-vo2-4x4",
    slug: "vo2max-4x4",
    title: "4×4 Norvégien",
    type: "vo2max",
    durationMin: 50,
    primaryStat: "engine",
    statWeights: { engine: 0.7, mental: 0.3 },
    baseXp: 140,
    blocks: [
      { name: "Warm-up", detail: "15 min progressif + 3 accélérations" },
      { name: "Interval 1", detail: "4 min @ 90–95% FCmax — récup 3 min" },
      { name: "Interval 2", detail: "4 min @ 90–95% FCmax — récup 3 min" },
      { name: "Interval 3", detail: "4 min @ 90–95% FCmax — récup 3 min" },
      { name: "Interval 4", detail: "4 min @ 90–95% FCmax — cooldown 10 min" },
    ],
  },
  {
    id: "tpl-hyrox-sim",
    slug: "hyrox-compromis",
    title: "Compromis Run/Sled",
    type: "hyrox",
    durationMin: 45,
    primaryStat: "engine",
    statWeights: { engine: 0.5, force: 0.3, mental: 0.2 },
    baseXp: 150,
    blocks: [
      { name: "Round 1–4", detail: "4 × (800m run + 25m sled push + 25m sled pull)" },
      { name: "Finisher", detail: "100 wall balls — cadence imposée" },
    ],
  },
  {
    id: "tpl-lactate-8x400",
    slug: "lactate-8x400",
    title: "Intervalles Lactate 8×400",
    type: "lactate",
    durationMin: 45,
    primaryStat: "engine",
    statWeights: { engine: 0.6, mental: 0.4 },
    baseXp: 130,
    blocks: [
      { name: "Warm-up", detail: "12 min + gammes" },
      { name: "Série", detail: "8 × 400m @ allure 3k — récup 60s" },
      { name: "Cooldown", detail: "10 min footing léger" },
    ],
  },
  {
    id: "tpl-skill-gym",
    slug: "skill-handstand-mu",
    title: "Handstand & Muscle-Up",
    type: "fonctionnel",
    durationMin: 40,
    primaryStat: "skill",
    statWeights: { skill: 0.8, force: 0.1, mental: 0.1 },
    baseXp: 110,
    blocks: [
      { name: "A. Handstand hold", detail: "8 × 30s face au mur — accumulation" },
      { name: "B. Négatives muscle-up", detail: "5 × 3 — 5s de descente" },
      { name: "C. Skin the cat", detail: "3 × 5 contrôlés" },
      { name: "D. Hollow / Arch", detail: "3 × (30s + 30s)" },
    ],
  },
];

export const MODIFIER_CATALOG: Modifier[] = [
  // COMMON — la friction du quotidien
  {
    id: "focus-total",
    name: "Focus Total",
    description: "Zéro téléphone entre les séries. Le monde attend.",
    rarity: "common",
    xpMult: 1.1,
  },
  {
    id: "tempo-strict",
    name: "Tempo Strict",
    description: "Chaque tempo respecté à la seconde près.",
    rarity: "common",
    xpMult: 1.1,
  },
  {
    id: "pacing-parfait",
    name: "Pacing Parfait",
    description: "Negative split — la 2e moitié plus rapide que la 1re.",
    rarity: "common",
    xpMult: 1.15,
  },
  {
    id: "silence-radio",
    name: "Silence Radio",
    description: "Pas de musique. Toi et l'effort, rien d'autre.",
    rarity: "common",
    xpMult: 1.15,
  },
  {
    id: "protocole-hydratation",
    name: "Protocole Hydratation",
    description: "500ml avant, 500ml pendant. Machine bien huilée.",
    rarity: "common",
    xpMult: 1.05,
  },
  // RARE — l'inconfort choisi
  {
    id: "chrono-verrouille",
    name: "Chrono Verrouillé",
    description: "Repos chronométrés à la seconde. Aucune extension.",
    rarity: "rare",
    xpMult: 1.25,
  },
  {
    id: "derniere-rep-propre",
    name: "Dernière Rep Propre",
    description: "La dernière rep de chaque série doit être la plus propre.",
    rarity: "rare",
    xpMult: 1.2,
  },
  {
    id: "froid-assume",
    name: "Froid Assumé",
    description: "Douche froide 2 min après le run. Sans hésiter.",
    rarity: "rare",
    xpMult: 1.25,
  },
  {
    id: "premier-arrive",
    name: "Premier Arrivé",
    description: "Échauffement commencé dans les 5 min après l'arrivée.",
    rarity: "rare",
    xpMult: 1.2,
  },
  // EPIC — les runs dont on se souvient
  {
    id: "ghost-protocol",
    name: "Ghost Protocol",
    description: "Téléphone au vestiaire. Toute la séance hors réseau.",
    rarity: "epic",
    xpMult: 1.4,
  },
  {
    id: "mode-spartiate",
    name: "Mode Spartiate",
    description: "Aucune plainte, aucun soupir, aucune grimace. Stoïque.",
    rarity: "epic",
    xpMult: 1.35,
  },
  {
    id: "perfect-run",
    name: "Perfect Run",
    description: "Chaque bloc complété, chaque cible atteinte. Sans compromis.",
    rarity: "epic",
    xpMult: 1.5,
  },
];

// Historique de départ : un opérateur déjà en route, pas un compte vide.
// Niveaux induits — Force 8 · Moteur 7 · Skill 3 · Discipline 5 · Mental 4
export const SEED_XP: Record<string, number> = {
  force: 2930,
  engine: 2410,
  skill: 905,
  discipline: 1540,
  mental: 1180,
};

export const SEED_EVENTS: Omit<XpEvent, "id">[] = [
  {
    stat: "force",
    amount: 138,
    source: "run",
    reason: "Lower Heavy — Perfect Run ×1.5",
    createdAt: daysAgo(1),
  },
  {
    stat: "mental",
    amount: 42,
    source: "run",
    reason: "Lower Heavy — REDLINE tenu",
    createdAt: daysAgo(1),
  },
  {
    stat: "engine",
    amount: 96,
    source: "run",
    reason: "4×4 Norvégien — Pacing Parfait ×1.15",
    createdAt: daysAgo(2),
  },
  {
    stat: "discipline",
    amount: 20,
    source: "checkin",
    reason: "Check-in — sommeil 8h12, nutrition on point",
    createdAt: daysAgo(2),
  },
  {
    stat: "engine",
    amount: 88,
    source: "run",
    reason: "Base Aérobie 70′ — dérive 3.1%",
    createdAt: daysAgo(4),
  },
  {
    stat: "skill",
    amount: 74,
    source: "run",
    reason: "Handstand & Muscle-Up — Silence Radio ×1.15",
    createdAt: daysAgo(5),
  },
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();
}

export const SEED_PROFILE = {
  callsign: "OPERATOR-01",
  dayIndex: 132,
  streakDays: 9,
};
