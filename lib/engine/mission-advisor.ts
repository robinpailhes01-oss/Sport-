import type { WorkoutType } from "./types";

// Le conseil du matin : la mission planifiée passe au filtre du ressenti.
// Signal actuel : le dernier état consigné dans COMMS (< 20h). Demain : Whoop.

export interface MoodSignal {
  mood: number;
  ageHours: number;
}

export interface MissionAdvice {
  slug: string;
  /** Renseigné si la séance a été remplacée — pour pouvoir revenir au plan */
  swappedFromSlug?: string;
  note?: {
    author: "robbins" | "goggins";
    text: string;
  };
}

const INTENSE_TYPES: WorkoutType[] = [
  "vo2max",
  "lactate",
  "hyrox",
  "crossfit",
  "force",
  "hypertrophie",
];

const EASY_SLUG = "zone2-75";

export function adviseMission(
  plannedSlug: string,
  plannedType: WorkoutType,
  signal: MoodSignal | null,
): MissionAdvice {
  if (!signal || signal.ageHours > 20) return { slug: plannedSlug };

  if (signal.mood <= 2) {
    if (INTENSE_TYPES.includes(plannedType) && plannedSlug !== EASY_SLUG) {
      return {
        slug: EASY_SLUG,
        swappedFromSlug: plannedSlug,
        note: {
          author: "robbins",
          text: `État ${signal.mood}/5 consigné — on protège la machine : aérobie facile à la place de la séance prévue. La qualité reviendra quand tu auras rechargé.`,
        },
      };
    }
    return {
      slug: plannedSlug,
      note: {
        author: "robbins",
        text: "Journée légère au programme — exactement ce qu'il te faut. Exécute doucement, recharge.",
      },
    };
  }

  if (signal.mood >= 5) {
    return {
      slug: plannedSlug,
      note: {
        author: "goggins",
        text: "État 5/5 consigné. Les jours comme ça se paient d'avance : monte d'un risk tier aujourd'hui.",
      },
    };
  }

  return { slug: plannedSlug };
}
