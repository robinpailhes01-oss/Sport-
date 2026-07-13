// Le PROTOCOLE HEBDO — microcycle d'athlète hybride.
// Structure concurrent training : la force encadre la semaine, les courses
// sont polarisées (dur = vraiment dur, facile = vraiment facile), l'engine
// spécifique alterne Hyrox / CrossFit, et dimanche la récup est une séance.

export interface DayPlan {
  /** 0 = lundi … 6 = dimanche */
  day: number;
  dayLabel: string;
  dayShort: string;
  templateSlug: string;
  /** Slug alternatif les semaines paires (alternance Hyrox / WOD) */
  altTemplateSlug?: string;
  intent: string;
}

export const WEEK_PROTOCOL: DayPlan[] = [
  {
    day: 0,
    dayLabel: "Lundi",
    dayShort: "LUN",
    templateSlug: "force-a-lower",
    intent: "Construire la force — frais après le repos",
  },
  {
    day: 1,
    dayLabel: "Mardi",
    dayShort: "MAR",
    templateSlug: "vo2max-4x4",
    intent: "Monter le plafond aérobie",
  },
  {
    day: 2,
    dayLabel: "Mercredi",
    dayShort: "MER",
    templateSlug: "zone2-75",
    intent: "Élargir la base — facile veut dire facile",
  },
  {
    day: 3,
    dayLabel: "Jeudi",
    dayShort: "JEU",
    templateSlug: "force-b-upper",
    intent: "Force haut du corps + transfert gym",
  },
  {
    day: 4,
    dayLabel: "Vendredi",
    dayShort: "VEN",
    templateSlug: "seuil-3x10",
    intent: "Tenir l'allure course — spécifique Hyrox",
  },
  {
    day: 5,
    dayLabel: "Samedi",
    dayShort: "SAM",
    templateSlug: "hyrox-engine",
    altTemplateSlug: "wod-crossfit",
    intent: "Engine spécifique — Hyrox et WOD en alternance",
  },
  {
    day: 6,
    dayLabel: "Dimanche",
    dayShort: "DIM",
    templateSlug: "recovery-protocol",
    intent: "La récup est une séance, pas une absence",
  },
];

function isoWeekIndex(date: Date): number {
  return Math.floor(date.getTime() / (7 * 24 * 3600 * 1000));
}

/** Plan du jour, avec l'alternance hebdo résolue (semaine paire → alt). */
export function planForDate(date: Date): DayPlan & { resolvedSlug: string } {
  const day = (date.getDay() + 6) % 7; // JS: 0 = dimanche → 6
  const plan = WEEK_PROTOCOL[day];
  const useAlt = plan.altTemplateSlug && isoWeekIndex(date) % 2 === 0;
  return { ...plan, resolvedSlug: useAlt ? plan.altTemplateSlug! : plan.templateSlug };
}
