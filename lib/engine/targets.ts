import type { StatKey } from "./types";

// OBJECTIFS DE SAISON — athlète hybride < 70 kg.
// Cibles ambitieuses mais atteignables pour un profil qui court, fait du
// Hyrox et du CrossFit. `current` reste null tant que la baseline n'est pas
// mesurée en conditions réelles (test 1RM, time trial 5K, course Hyrox).

export interface Target {
  stat: StatKey;
  label: string;
  target: string;
  current: string | null;
}

export const TARGETS: Target[] = [
  // 💪 FORCE — ratios au poids de corps (~70 kg), le standard hybride
  { stat: "force", label: "Back Squat", target: "120 kg · 1.75×BW", current: null },
  { stat: "force", label: "Deadlift", target: "150 kg · 2.2×BW", current: null },
  { stat: "force", label: "Strict Press", target: "60 kg · 0.85×BW", current: null },
  // 🫀 MOTEUR
  { stat: "engine", label: "5K", target: "< 20:00", current: null },
  { stat: "engine", label: "Hyrox", target: "< 75:00", current: null },
  { stat: "engine", label: "Row 2K", target: "< 7:10", current: null },
  // 🤸 SKILL
  { stat: "skill", label: "Muscle-ups strict", target: "5 unbroken", current: null },
  { stat: "skill", label: "Handstand walk", target: "10 m", current: null },
  { stat: "skill", label: "HSPU", target: "10 unbroken", current: null },
  // 🧘 DISCIPLINE
  { stat: "discipline", label: "Sommeil", target: "7h30 moy. / 30 j", current: null },
  { stat: "discipline", label: "Protéines", target: "140 g/j · 2 g/kg", current: null },
  // 🧠 MENTAL
  { stat: "mental", label: "REDLINE tenu", target: "1 / semaine", current: null },
  { stat: "mental", label: "Streak", target: "30 jours", current: null },
];
