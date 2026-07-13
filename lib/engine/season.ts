// PROTOCOLE 90 JOURS — la "saison" en cours. Le boss n'est pas une course
// datée mais le JOUR 90 : retest complet des PRs, chiffres contre chiffres.
// Périodisation en 4 phases, deload intégré à la phase TEST.

export const PROTOCOL_START = "2026-07-13";
export const PROTOCOL_DAYS = 90;

export interface Phase {
  name: string;
  from: number;
  to: number;
  focus: string;
}

export const PHASES: Phase[] = [
  { name: "BASE", from: 1, to: 28, focus: "Volume aérobie, technique, régularité" },
  { name: "BUILD", from: 29, to: 56, focus: "Intensité + spécifique Hyrox" },
  { name: "PEAK", from: 57, to: 83, focus: "Affûtage, allures de course" },
  { name: "TEST", from: 84, to: 90, focus: "Deload puis retest complet des PRs" },
];

/** Jour courant du protocole, borné à [1, 90]. */
export function dayOfProtocol(date: Date): number {
  const start = new Date(`${PROTOCOL_START}T00:00:00`);
  const day = Math.floor((date.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1;
  return Math.max(1, Math.min(PROTOCOL_DAYS, day));
}

export function phaseForDay(day: number): Phase {
  return PHASES.find((p) => day >= p.from && day <= p.to) ?? PHASES[0];
}
