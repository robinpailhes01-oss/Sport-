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

// Contraintes réelles de l'opérateur : capitaine de bateau — des jours de mer
// sans entraînement possible, et forte chaleur dehors. Le protocole plie,
// il ne casse pas : règles de re-priorisation quand la semaine est coupée.
export const PROTOCOL_NOTES: string[] = [
  "Chaleur : cardio tôt le matin, sinon version salle (tapis, air bike, rameur) — chaque séance a son option.",
  "Jour de mer = jour OFF assumé : zéro culpabilité, la mission du lendemain reprend le protocole là où il est.",
  "Semaine coupée à 4 jours : garder Force A · VO2max · Seuil · Hyrox Engine.",
  "Semaine coupée à 3 jours : Force A · VO2max · Hyrox Engine — la Z2 et le skill sautent en premier, jamais la force ni l'intensité.",
];

function isoWeekIndex(date: Date): number {
  return Math.floor(date.getTime() / (7 * 24 * 3600 * 1000));
}

/** Plan d'un jour du protocole (0 = lundi), alternance hebdo résolue par la date. */
export function planForDayIndex(
  dayIndex: number,
  refDate: Date,
): DayPlan & { resolvedSlug: string } {
  const plan = WEEK_PROTOCOL[Math.max(0, Math.min(6, dayIndex))];
  const useAlt = plan.altTemplateSlug && isoWeekIndex(refDate) % 2 === 0;
  return { ...plan, resolvedSlug: useAlt ? plan.altTemplateSlug! : plan.templateSlug };
}

/** Plan du jour calendaire. */
export function planForDate(date: Date): DayPlan & { resolvedSlug: string } {
  return planForDayIndex(weekdayIndex(date), date);
}

/** 0 = lundi … 6 = dimanche */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}
