// LE RÉFÉRENTIEL — chaque exercice chargé relié aux muscles qu'il sollicite.
// C'est la table de correspondance qui transforme "j'ai squatté 100 kg × 5"
// en "quadriceps +500 kg de tonnage". Sans elle, l'atlas corporel est aveugle.
//
// Seuls les exercices RÉELLEMENT chargés (poids × reps) sont ici : les blocs
// cardio et gymnastiques gardent la coche simple dans le run — la donnée fine
// y vaudrait moins cher que la friction qu'elle coûterait.

export type MuscleKey =
  | "quadriceps"
  | "ischios"
  | "fessiers"
  | "mollets"
  | "lombaires"
  | "core"
  | "pectoraux"
  | "dorsaux"
  | "trapezes"
  | "epaules"
  | "biceps"
  | "triceps"
  | "avant-bras";

export const MUSCLE_KEYS: MuscleKey[] = [
  "quadriceps",
  "ischios",
  "fessiers",
  "mollets",
  "lombaires",
  "core",
  "pectoraux",
  "dorsaux",
  "trapezes",
  "epaules",
  "biceps",
  "triceps",
  "avant-bras",
];

export interface MuscleMeta {
  key: MuscleKey;
  label: string;
  /** Face avant ou arrière du corps — pilote l'affichage dans l'atlas */
  side: "front" | "back" | "both";
}

export const MUSCLES: Record<MuscleKey, MuscleMeta> = {
  quadriceps: { key: "quadriceps", label: "Quadriceps", side: "front" },
  ischios: { key: "ischios", label: "Ischios", side: "back" },
  fessiers: { key: "fessiers", label: "Fessiers", side: "back" },
  mollets: { key: "mollets", label: "Mollets", side: "back" },
  lombaires: { key: "lombaires", label: "Lombaires", side: "back" },
  core: { key: "core", label: "Core", side: "front" },
  pectoraux: { key: "pectoraux", label: "Pectoraux", side: "front" },
  dorsaux: { key: "dorsaux", label: "Dorsaux", side: "back" },
  trapezes: { key: "trapezes", label: "Trapèzes", side: "back" },
  epaules: { key: "epaules", label: "Épaules", side: "both" },
  biceps: { key: "biceps", label: "Biceps", side: "front" },
  triceps: { key: "triceps", label: "Triceps", side: "back" },
  "avant-bras": { key: "avant-bras", label: "Avant-bras", side: "both" },
};

/** Schéma moteur — sert à repérer les déséquilibres (ex : push vs pull). */
export type MovementPattern =
  | "squat"
  | "hinge"
  | "push-v"
  | "push-h"
  | "pull-v"
  | "pull-h"
  | "carry"
  | "core"
  | "mono";

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Charnière de hanche",
  "push-v": "Poussée verticale",
  "push-h": "Poussée horizontale",
  "pull-v": "Tirage vertical",
  "pull-h": "Tirage horizontal",
  carry: "Port de charge",
  core: "Gainage",
  mono: "Unilatéral",
};

export interface Exercise {
  key: string;
  label: string;
  pattern: MovementPattern;
  /** Muscles moteurs — implication 1.0 dans le tonnage */
  primary: MuscleKey[];
  /** Muscles assistants — implication 0.5 */
  secondary: MuscleKey[];
  /** Mouvement de records lié, s'il existe (lib/engine/records.ts) */
  movementKey?: string;
  /** Le poids de corps compte dans la charge (tractions, dips…) */
  bodyweightBased?: boolean;
}

export const EXERCISES: Exercise[] = [
  // ── BAS DU CORPS ──
  {
    key: "back-squat",
    label: "Back Squat",
    pattern: "squat",
    primary: ["quadriceps", "fessiers"],
    secondary: ["ischios", "lombaires", "core"],
    movementKey: "back-squat",
  },
  {
    key: "front-squat",
    label: "Front Squat",
    pattern: "squat",
    primary: ["quadriceps"],
    secondary: ["fessiers", "core", "epaules"],
  },
  {
    key: "deadlift",
    label: "Deadlift",
    pattern: "hinge",
    primary: ["ischios", "fessiers", "lombaires"],
    secondary: ["dorsaux", "trapezes", "avant-bras"],
    movementKey: "deadlift",
  },
  {
    key: "romanian-deadlift",
    label: "Romanian Deadlift",
    pattern: "hinge",
    primary: ["ischios", "fessiers"],
    secondary: ["lombaires", "avant-bras"],
  },
  {
    key: "hip-thrust",
    label: "Hip Thrust",
    pattern: "hinge",
    primary: ["fessiers"],
    secondary: ["ischios", "core"],
  },
  {
    key: "bulgarian-split-squat",
    label: "Bulgarian Split Squat",
    pattern: "mono",
    primary: ["quadriceps", "fessiers"],
    secondary: ["ischios", "core"],
  },
  {
    key: "walking-lunge",
    label: "Fentes marchées",
    pattern: "mono",
    primary: ["quadriceps", "fessiers"],
    secondary: ["ischios", "mollets"],
  },
  {
    key: "calf-raise",
    label: "Mollets debout",
    pattern: "mono",
    primary: ["mollets"],
    secondary: [],
  },

  // ── POUSSÉE ──
  {
    key: "strict-press",
    label: "Strict Press",
    pattern: "push-v",
    primary: ["epaules"],
    secondary: ["triceps", "core", "trapezes"],
    movementKey: "strict-press",
  },
  {
    key: "push-press",
    label: "Push Press",
    pattern: "push-v",
    primary: ["epaules"],
    secondary: ["triceps", "quadriceps", "core"],
  },
  {
    key: "bench-press",
    label: "Développé couché",
    pattern: "push-h",
    primary: ["pectoraux"],
    secondary: ["triceps", "epaules"],
  },
  {
    key: "incline-db-press",
    label: "Développé incliné haltères",
    pattern: "push-h",
    primary: ["pectoraux", "epaules"],
    secondary: ["triceps"],
  },
  {
    key: "dips",
    label: "Dips lestés",
    pattern: "push-v",
    primary: ["pectoraux", "triceps"],
    secondary: ["epaules"],
    bodyweightBased: true,
  },
  {
    key: "push-up",
    label: "Pompes",
    pattern: "push-h",
    primary: ["pectoraux"],
    secondary: ["triceps", "epaules", "core"],
    bodyweightBased: true,
  },

  // ── TIRAGE ──
  {
    key: "pull-up",
    label: "Tractions lestées",
    pattern: "pull-v",
    primary: ["dorsaux"],
    secondary: ["biceps", "avant-bras", "trapezes"],
    bodyweightBased: true,
  },
  {
    key: "chin-up",
    label: "Tractions supination",
    pattern: "pull-v",
    primary: ["dorsaux", "biceps"],
    secondary: ["avant-bras"],
    bodyweightBased: true,
  },
  {
    key: "single-arm-row",
    label: "Rowing unilatéral",
    pattern: "pull-h",
    primary: ["dorsaux"],
    secondary: ["biceps", "trapezes", "core"],
  },
  {
    key: "barbell-row",
    label: "Rowing barre",
    pattern: "pull-h",
    primary: ["dorsaux", "trapezes"],
    secondary: ["biceps", "lombaires"],
  },
  {
    key: "face-pull",
    label: "Face pull",
    pattern: "pull-h",
    primary: ["trapezes", "epaules"],
    secondary: [],
  },
  {
    key: "barbell-curl",
    label: "Curl barre",
    pattern: "pull-h",
    primary: ["biceps"],
    secondary: ["avant-bras"],
  },

  // ── PORT / CORE ──
  {
    key: "farmer-carry",
    label: "Farmer Carry",
    pattern: "carry",
    primary: ["avant-bras", "trapezes"],
    secondary: ["core", "fessiers"],
  },
  {
    key: "pallof-press",
    label: "Pallof Press",
    pattern: "core",
    primary: ["core"],
    secondary: ["epaules"],
  },
  {
    key: "ab-wheel",
    label: "Ab Wheel",
    pattern: "core",
    primary: ["core"],
    secondary: ["dorsaux", "epaules"],
    bodyweightBased: true,
  },
  {
    key: "hollow-arch",
    label: "Hollow / Arch",
    pattern: "core",
    primary: ["core"],
    secondary: [],
    bodyweightBased: true,
  },
  {
    key: "toes-to-bar",
    label: "Toes-to-bar",
    pattern: "core",
    primary: ["core"],
    secondary: ["dorsaux", "avant-bras"],
    bodyweightBased: true,
  },

  // ── HYBRIDE / METCON ──
  {
    key: "thruster",
    label: "Thruster",
    pattern: "squat",
    primary: ["quadriceps", "epaules"],
    secondary: ["fessiers", "triceps", "core"],
  },
  {
    key: "wall-ball",
    label: "Wall Ball",
    pattern: "squat",
    primary: ["quadriceps", "epaules"],
    secondary: ["fessiers", "core"],
  },
  {
    key: "sled-push",
    label: "Sled Push",
    pattern: "carry",
    primary: ["quadriceps", "fessiers"],
    secondary: ["mollets", "core"],
  },
  {
    key: "sled-pull",
    label: "Sled Pull",
    pattern: "carry",
    primary: ["dorsaux", "ischios"],
    secondary: ["biceps", "core"],
  },
];

export function exerciseByKey(key: string): Exercise | null {
  return EXERCISES.find((e) => e.key === key) ?? null;
}

/** Implication d'un exercice sur un muscle : 1 moteur, 0.5 assistant, 0 sinon. */
export function involvement(exercise: Exercise, muscle: MuscleKey): number {
  if (exercise.primary.includes(muscle)) return 1;
  if (exercise.secondary.includes(muscle)) return 0.5;
  return 0;
}
