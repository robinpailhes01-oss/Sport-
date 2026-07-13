// Types du jeu — source de vérité partagée entre l'engine, la data layer et l'UI.
// Quand Supabase arrivera, ces types resteront identiques : seule l'implémentation
// de DataSource (lib/data) changera.

export type StatKey = "force" | "engine" | "skill" | "discipline" | "mental";

export const STAT_KEYS: StatKey[] = [
  "force",
  "engine",
  "skill",
  "discipline",
  "mental",
];

export interface StatMeta {
  key: StatKey;
  label: string;
  glyph: string;
  blurb: string;
}

export const STATS: Record<StatKey, StatMeta> = {
  force: {
    key: "force",
    label: "Force",
    glyph: "💪",
    blurb: "Charges, volume, intensité",
  },
  engine: {
    key: "engine",
    label: "Moteur",
    glyph: "🫀",
    blurb: "Zone 2, seuil, VO2max",
  },
  skill: {
    key: "skill",
    label: "Skill",
    glyph: "🤸",
    blurb: "Gymnastique, contrôle du corps",
  },
  discipline: {
    key: "discipline",
    label: "Discipline",
    glyph: "🧘",
    blurb: "Nutrition, sommeil, régularité",
  },
  mental: {
    key: "mental",
    label: "Mental",
    glyph: "🧠",
    blurb: "Tolérance à l'inconfort, focus",
  },
};

export type WorkoutType =
  | "force"
  | "hypertrophie"
  | "fonctionnel"
  | "zone2"
  | "hyrox"
  | "lactate"
  | "vo2max"
  | "crossfit"
  | "recovery";

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  force: "Force",
  hypertrophie: "Hypertrophie",
  fonctionnel: "Fonctionnel",
  zone2: "Zone 2",
  hyrox: "Hyrox",
  lactate: "Seuil",
  vo2max: "VO2max",
  crossfit: "CrossFit",
  recovery: "Recovery",
};

export interface WorkoutBlock {
  name: string;
  detail: string;
}

export interface WorkoutTemplate {
  id: string;
  slug: string;
  title: string;
  type: WorkoutType;
  durationMin: number;
  primaryStat: StatKey;
  /** Répartition de l'XP par stat — somme = 1 */
  statWeights: Partial<Record<StatKey, number>>;
  baseXp: number;
  blocks: WorkoutBlock[];
}

export type ModifierRarity = "common" | "rare" | "epic";

export interface Modifier {
  id: string;
  name: string;
  description: string;
  rarity: ModifierRarity;
  xpMult: number;
}

export interface RiskTier {
  tier: number;
  name: string;
  mult: number;
  /** Malus appliqué au run si complétion < 100% à ce tier */
  failPenalty: number;
  blurb: string;
}

export type RunStatus = "rolled" | "active" | "completed" | "abandoned";

export interface RunPerformance {
  blocksDone: boolean[];
  modifiersHonored: boolean[];
  rpe: number;
}

export interface LevelUp {
  stat: StatKey;
  from: number;
  to: number;
}

export interface RunOutcome {
  /** 0..1 — qualité globale du run */
  score: number;
  totalXp: number;
  xpByStat: Partial<Record<StatKey, number>>;
  multiplier: number;
  levelUps: LevelUp[];
  flawless: boolean;
}

export interface Run {
  id: string;
  templateId: string;
  status: RunStatus;
  /** Snapshot des modifiers tirés — un vieux run reste lisible si le catalogue change */
  modifiers: Modifier[];
  riskTier: number;
  rolledAt: string;
  startedAt?: string;
  completedAt?: string;
  performance?: RunPerformance;
  outcome?: RunOutcome;
}

export type XpSource = "run" | "checkin" | "bonus" | "record";

export interface PersonalRecord {
  id: number;
  movementKey: string;
  /** kg, secondes, reps ou mètres selon le mouvement */
  value: number;
  /** Date du test (ISO yyyy-mm-dd) */
  date: string;
  /** true si meilleur que tous les essais précédents au moment de la saisie */
  isPr: boolean;
}

export interface XpEvent {
  id: number;
  stat: StatKey;
  amount: number;
  source: XpSource;
  reason: string;
  runId?: string;
  createdAt: string;
}

export interface StatProgress {
  level: number;
  /** XP accumulée dans le niveau courant */
  current: number;
  /** XP nécessaire pour passer au niveau suivant */
  needed: number;
  /** current / needed */
  pct: number;
}

export interface StatState {
  xp: number;
  level: number;
  progress: StatProgress;
}

export interface AvatarState {
  callsign: string;
  /** Jour depuis le début du protocole */
  dayIndex: number;
  streakDays: number;
  stats: Record<StatKey, StatState>;
  totalLevel: number;
  recentEvents: XpEvent[];
}
