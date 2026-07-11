import type { WorkoutType } from "./types";

// Les HANDLERS — les deux voix dans l'oreillette. Ils signent les programmes,
// briefent avant le run, débriefent au recap. Les punchlines sont de vraies
// citations publiques de chacun (jamais de faux propos attribués).

export type CoachKey = "goggins" | "robbins";

export interface Coach {
  key: CoachKey;
  name: string;
  codename: string;
  monogram: string;
  /** Domaine signé par ce handler */
  domain: string;
  /** Couleur d'identité — le volt reste réservé à la progression */
  accent: "danger" | "zone2";
  philosophy: string;
}

export const COACHES: Record<CoachKey, Coach> = {
  goggins: {
    key: "goggins",
    name: "David Goggins",
    codename: "THE SAVAGE",
    monogram: "DG",
    domain: "Moteur · Mental",
    accent: "danger",
    philosophy: "Endurcir l'esprit par l'inconfort choisi.",
  },
  robbins: {
    key: "robbins",
    name: "Tony Robbins",
    codename: "THE STRATEGIST",
    monogram: "TR",
    domain: "Force · Standards",
    accent: "zone2",
    philosophy: "Élever les standards, passer à l'action massive.",
  },
};

// Qui signe quoi : Goggins possède la souffrance cardio et le mental,
// Robbins possède la construction (force, skill, discipline).
const TYPE_OWNER: Record<WorkoutType, CoachKey> = {
  zone2: "goggins",
  hyrox: "goggins",
  lactate: "goggins",
  vo2max: "goggins",
  force: "robbins",
  hypertrophie: "robbins",
  fonctionnel: "robbins",
};

export function coachForType(type: WorkoutType): Coach {
  return COACHES[TYPE_OWNER[type]];
}

export type CoachMoment =
  | "brief"
  | "recap_flawless"
  | "recap_partial"
  | "abandon";

// Citations réelles et documentées — en anglais, comme le vocabulaire de jeu.
const LINES: Record<CoachKey, Record<CoachMoment, string[]>> = {
  goggins: {
    brief: [
      "Who's gonna carry the boats?",
      "Don't stop when you're tired. Stop when you're done.",
      "Callous your mind.",
      "Suffering is a test. That's all it is.",
    ],
    recap_flawless: [
      "Stay hard.",
      "Be uncommon amongst uncommon people.",
    ],
    recap_partial: [
      "You don't know me, son.",
      "The most important conversations you'll ever have are the ones you'll have with yourself.",
    ],
    abandon: [
      "It's so easy to be great nowadays, because everyone else is weak.",
      "You are in danger of living a life so comfortable that you will die without ever realizing your true potential.",
    ],
  },
  robbins: {
    brief: [
      "Where focus goes, energy flows.",
      "Massive action is the cure to all fear.",
      "Repetition is the mother of skill.",
    ],
    recap_flawless: [
      "Progress equals happiness.",
      "It's not about the goal. It's about who you become.",
    ],
    recap_partial: [
      "Raise your standards.",
      "There are no failures — only results.",
    ],
    abandon: [
      "The only impossible journey is the one you never begin.",
      "In life you need either inspiration or desperation.",
    ],
  },
};

export function coachLine(
  coach: CoachKey,
  moment: CoachMoment,
  rng: () => number = Math.random,
): string {
  const pool = LINES[coach][moment];
  return pool[Math.floor(rng() * pool.length)];
}
