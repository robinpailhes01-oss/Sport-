import type { Modifier, StatKey, WorkoutTemplate, XpEvent } from "@/lib/engine/types";

// PROGRAMMATION HYBRIDE — athlète < 70 kg, objectif : courir / Hyrox / CrossFit.
// Principes appliqués (concurrent training) :
// - 2 séances de force lourdes à faible volume (maintenir/monter la force sans
//   interférer avec le volume de course)
// - 3 courses polarisées : 1 base Zone 2, 1 VO2max (4×4), 1 seuil
// - 1 séance "engine" spécifique (Hyrox compromis / WOD CrossFit en alternance)
// - 1 protocole de récupération OBLIGATOIRE — la récup est une séance, pas une absence
// Les % sont relatifs au 1RM, les allures en RPE tant que les baselines
// ne sont pas calibrées (voir lib/engine/targets.ts).

export const TEMPLATES: WorkoutTemplate[] = [
  {
    id: "tpl-force-a",
    slug: "force-a-lower",
    title: "Force A — Lower",
    type: "force",
    durationMin: 60,
    primaryStat: "force",
    statWeights: { force: 0.8, mental: 0.2 },
    baseXp: 120,
    blocks: [
      { name: "A. Back Squat", detail: "5 × 3 @ 80–85% — repos 3 min, barre explosive" },
      { name: "B. Romanian Deadlift", detail: "3 × 6 @ RPE 8 — hanches, pas de dos rond" },
      { name: "C. Bulgarian Split Squat", detail: "3 × 8 / jambe — tempo 2-0-1" },
      { name: "D. Farmer Carry", detail: "4 × 40 m lourd — grip et gainage" },
      { name: "E. Core", detail: "3 tours : Pallof press 12 + ab wheel 10" },
    ],
  },
  {
    id: "tpl-force-b",
    slug: "force-b-upper",
    title: "Force B — Upper",
    type: "force",
    durationMin: 55,
    primaryStat: "force",
    statWeights: { force: 0.75, skill: 0.1, mental: 0.15 },
    baseXp: 120,
    blocks: [
      { name: "A. Strict Press", detail: "5 × 3 @ 80–85% — gainage total, zéro chandelle" },
      { name: "B. Tractions lestées", detail: "4 × 5 — full ROM, contrôle en descente" },
      { name: "C. Dips lestés", detail: "3 × 8" },
      { name: "D. Rowing unilatéral", detail: "3 × 10 / bras — coude au corps" },
      { name: "E. Hollow / Arch", detail: "3 × (30s + 30s) — transfert gymnastique" },
    ],
  },
  {
    id: "tpl-zone2-75",
    slug: "zone2-75",
    title: "Base Aérobie 75′",
    type: "zone2",
    durationMin: 75,
    primaryStat: "engine",
    statWeights: { engine: 0.85, mental: 0.15 },
    baseXp: 100,
    blocks: [
      { name: "Bloc unique", detail: "75 min @ 65–75% FCmax — conversation possible" },
      { name: "Contrôle respiration", detail: "Respiration nasale aussi longtemps que possible" },
      { name: "Contrôle dérive", detail: "Dérive cardiaque < 5% entre 1re et 2e moitié" },
      { name: "Option chaleur", detail: "Tôt le matin, sinon tapis/air bike en salle — même durée" },
    ],
  },
  {
    id: "tpl-vo2-4x4",
    slug: "vo2max-4x4",
    title: "VO2max — 4×4 Norvégien",
    type: "vo2max",
    durationMin: 50,
    primaryStat: "engine",
    statWeights: { engine: 0.7, mental: 0.3 },
    baseXp: 140,
    blocks: [
      { name: "Warm-up", detail: "15 min progressif + 3 lignes droites" },
      { name: "Interval 1", detail: "4 min @ 90–95% FCmax — récup 3 min trot" },
      { name: "Interval 2", detail: "4 min @ 90–95% FCmax — récup 3 min trot" },
      { name: "Interval 3", detail: "4 min @ 90–95% FCmax — récup 3 min trot" },
      { name: "Interval 4", detail: "4 min @ 90–95% FCmax — cooldown 10 min" },
      { name: "Option chaleur", detail: "Air bike ou rameur en salle — mêmes intervalles 4×4" },
    ],
  },
  {
    id: "tpl-seuil-30",
    slug: "seuil-3x10",
    title: "Seuil — 3×10′",
    type: "lactate",
    durationMin: 55,
    primaryStat: "engine",
    statWeights: { engine: 0.65, mental: 0.35 },
    baseXp: 130,
    blocks: [
      { name: "Warm-up", detail: "12 min + gammes + 2 accélérations" },
      { name: "Bloc 1", detail: "10 min @ allure seuil (RPE 7–8) — récup 2 min" },
      { name: "Bloc 2", detail: "10 min @ allure seuil — récup 2 min" },
      { name: "Bloc 3", detail: "10 min @ allure seuil — négative split si possible" },
      { name: "Cooldown", detail: "8 min footing léger" },
      { name: "Option chaleur", detail: "Tapis inclinaison 1% ou rameur 3×10′ — même RPE" },
    ],
  },
  {
    id: "tpl-hyrox-engine",
    slug: "hyrox-engine",
    title: "Hyrox Engine",
    type: "hyrox",
    durationMin: 60,
    primaryStat: "engine",
    statWeights: { engine: 0.5, force: 0.3, mental: 0.2 },
    baseXp: 150,
    blocks: [
      { name: "Round 1–4", detail: "4 × (800 m run + 20 m sled push + 20 m sled pull)" },
      { name: "Sled", detail: "Push lourd (~1.5×BW chargé), pull en marche arrière contrôlée" },
      { name: "Compromis", detail: "Chaque run DOIT rester sous contrôle — pacing Hyrox" },
      { name: "Finisher", detail: "60 wall balls — fractionnement imposé max 15" },
    ],
  },
  {
    id: "tpl-wod-crossfit",
    slug: "wod-crossfit",
    title: "WOD CrossFit",
    type: "crossfit",
    durationMin: 45,
    primaryStat: "engine",
    statWeights: { engine: 0.4, force: 0.3, skill: 0.2, mental: 0.1 },
    baseXp: 130,
    blocks: [
      { name: "Skill EMOM 10′", detail: "Alterné : 3–5 muscle-ups / 5–8 HSPU" },
      { name: "Metcon 15′ AMRAP", detail: "15 cal row + 10 toes-to-bar + 10 thrusters 40 kg" },
      { name: "Cash-out", detail: "3 × 10 GHD ou V-ups" },
    ],
  },
  {
    id: "tpl-skill-gym",
    slug: "skill-gym",
    title: "Skill — Gymnastique",
    type: "fonctionnel",
    durationMin: 40,
    primaryStat: "skill",
    statWeights: { skill: 0.8, force: 0.1, mental: 0.1 },
    baseXp: 110,
    blocks: [
      { name: "A. Handstand", detail: "8 × 30s face au mur + tentatives freestanding" },
      { name: "B. Muscle-up strict", detail: "5 × 2–3 ou négatives 5s" },
      { name: "C. Handstand walk", detail: "10 × 3–5 m — qualité avant distance" },
      { name: "D. L-sit", detail: "Accumuler 60s total" },
    ],
  },
  {
    id: "tpl-recovery",
    slug: "recovery-protocol",
    title: "Recovery Protocol",
    type: "recovery",
    durationMin: 30,
    primaryStat: "discipline",
    statWeights: { discipline: 0.6, mental: 0.4 },
    baseXp: 60,
    blocks: [
      { name: "A. Flush", detail: "20 min marche rapide ou vélo Z1" },
      { name: "B. Mobilité", detail: "15 min hanches + épaules + thoracique" },
      { name: "C. Hammam", detail: "15–20 min — hydrate avant/après" },
      { name: "D. Bain froid", detail: "3–5 min @ 10–12°C — sortie calme, pas de sprint" },
      { name: "E. Compression", detail: "Bottes 20–30 min, jambes surélevées" },
      { name: "F. Protocole soir", detail: "Écrans off 22h30 — 7h30+ de sommeil" },
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

// Niveaux de départ — Force 8 · Moteur 7 · Skill 3 · Discipline 5 · Mental 4.
// À recalibrer avec les vraies baselines (targets.ts) dès qu'elles sont mesurées.
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
    reason: "Force A — Perfect Run ×1.5",
    createdAt: daysAgo(1),
  },
  {
    stat: "mental",
    amount: 42,
    source: "run",
    reason: "Force A — REDLINE tenu",
    createdAt: daysAgo(1),
  },
  {
    stat: "engine",
    amount: 96,
    source: "run",
    reason: "VO2max 4×4 — Pacing Parfait ×1.15",
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
    reason: "Base Aérobie 75′ — dérive 3.1%",
    createdAt: daysAgo(4),
  },
  {
    stat: "skill",
    amount: 74,
    source: "run",
    reason: "Skill Gym — Silence Radio ×1.15",
    createdAt: daysAgo(5),
  },
];

// Historique hebdomadaire plausible (10 semaines) pour nourrir l'écran
// Progression — déterministe, avec une tendance montante et de la texture.
// Sera remplacé par le vrai ledger dès que les runs réels s'accumulent.
export function seedWeeklyHistory(): Omit<XpEvent, "id">[] {
  const base: Record<StatKey, [number, number]> = {
    force: [90, 6],
    engine: [110, 8],
    skill: [30, 4],
    discipline: [60, 2],
    mental: [40, 5],
  };
  const events: Omit<XpEvent, "id">[] = [];
  for (let w = 0; w < 10; w++) {
    for (const [stat, [start, slope]] of Object.entries(base) as [
      StatKey,
      [number, number],
    ][]) {
      const amount = start + w * slope + (w % 3) * 7;
      events.push({
        stat,
        amount,
        source: "run",
        reason: `Volume hebdo — S-${10 - w}`,
        createdAt: weeksAgo(10 - w),
      });
    }
  }
  return events;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();
}

function weeksAgo(n: number): string {
  // milieu de semaine pour éviter les effets de bord de bucket
  return new Date(Date.now() - (n * 7 - 3) * 24 * 3600 * 1000).toISOString();
}

export const SEED_PROFILE = {
  callsign: "OPERATOR-01",
  // dayIndex est désormais calculé depuis le début du protocole 90 jours
  // (lib/engine/season.ts) — conservé ici uniquement pour dater l'antériorité.
  dayIndex: 132,
  streakDays: 9,
};

// Historique de PR MOCK — valeurs plausibles à ÉCRASER par tes vrais tests.
// Chaque entrée : [movementKey, valeur (kg/s/reps/m), il y a N jours].
export const SEED_RECORDS: [string, number, number][] = [
  ["back-squat", 100, 75],
  ["back-squat", 105, 40],
  ["back-squat", 110, 8],
  ["deadlift", 130, 70],
  ["deadlift", 140, 15],
  ["strict-press", 50, 60],
  ["strict-press", 52.5, 20],
  ["five-k", 21 * 60 + 30, 80],
  ["five-k", 20 * 60 + 41, 12],
  ["row-2k", 7 * 60 + 42, 50],
  ["muscle-ups", 2, 45],
  ["muscle-ups", 3, 10],
];
