import { HABITS, SAVINGS_GOAL, formatEuro } from "./habits";
import { MOVEMENTS, bestOf, formatRecordValue } from "./records";
import { PROTOCOL_DAYS, type Phase } from "./season";
import {
  STAT_KEYS,
  STATS,
  type PersonalRecord,
  type SavingsEntry,
  type StatKey,
} from "./types";

// ORACLE — l'Analyste. Le troisième visage de l'app : il ne motive pas,
// il ne programme pas, il LIT. Rapport rule-based sur le ledger complet ;
// le jour où Whoop arrive, ses phrases s'enrichissent, son rôle ne change pas.

export const ANALYST = {
  name: "Oracle",
  codename: "THE ANALYST",
  monogram: "Δ",
  domain: "Synthèse · Directives",
};

export interface ReportInputs {
  /** getWeeklyXp(≥2) — dernier index = semaine courante */
  weekly: Record<StatKey, number[]>;
  /** getJournal(14) */
  journal: Record<string, string[]>;
  savingsTotal: number;
  savingsEntries: SavingsEntry[];
  records: PersonalRecord[];
  day: number;
  phase: Phase;
}

export interface ReportSection {
  title: string;
  lines: string[];
}

export interface Report {
  headline: string;
  sections: ReportSection[];
  directive: string;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

function trendArrow(now: number, before: number): string {
  if (before === 0) return now > 0 ? "▲ nouveau" : "—";
  const pct = Math.round(((now - before) / before) * 100);
  if (pct > 5) return `▲ +${pct}%`;
  if (pct < -5) return `▼ ${pct}%`;
  return "≈ stable";
}

function frDate(iso: string): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    .replace(".", "");
}

export function buildReport(inputs: ReportInputs): Report {
  const { weekly, journal, savingsTotal, savingsEntries, records, day, phase } =
    inputs;

  const thisWeek = Object.fromEntries(
    STAT_KEYS.map((k) => [k, weekly[k][weekly[k].length - 1] ?? 0]),
  ) as Record<StatKey, number>;
  const lastWeek = Object.fromEntries(
    STAT_KEYS.map((k) => [k, weekly[k][weekly[k].length - 2] ?? 0]),
  ) as Record<StatKey, number>;

  const topStat = STAT_KEYS.reduce((a, b) =>
    thisWeek[a] >= thisWeek[b] ? a : b,
  );
  const weakStat = STAT_KEYS.reduce((a, b) =>
    thisWeek[a] <= thisWeek[b] ? a : b,
  );
  const totalThisWeek = STAT_KEYS.reduce((s, k) => s + thisWeek[k], 0);

  // ── MOMENTUM ──
  const momentum: ReportSection = {
    title: "Momentum — 7 derniers jours",
    lines: STAT_KEYS.map(
      (k) =>
        `${STATS[k].glyph} ${STATS[k].label} · +${fmt(thisWeek[k])} XP · ${trendArrow(thisWeek[k], lastWeek[k])}`,
    ),
  };

  // ── JOURNAL ──
  const days = Object.keys(journal);
  const counts = HABITS.map((h) => ({
    habit: h,
    done: days.filter((d) => journal[d].includes(h.key)).length,
  }));
  const tracked = counts.filter((c) => c.done > 0);
  const best = tracked.length
    ? tracked.reduce((a, b) => (a.done >= b.done ? a : b))
    : null;
  const journalSection: ReportSection = {
    title: `Journal — ${days.length} jours`,
    lines: [
      ...counts.map(
        (c) =>
          `${c.habit.glyph} ${c.habit.label} · ${c.done}/${days.length}${c.done === 0 ? " · à lancer" : ""}`,
      ),
      best
        ? `Ton ancre : ${best.habit.label.toLowerCase()} — c'est elle qui tient le journal debout.`
        : "Journal vierge sur la période — commence petit, un essentiel par jour.",
    ],
  };

  // ── ÉPARGNE ──
  const remaining = Math.max(0, SAVINGS_GOAL - savingsTotal);
  const recentDeposits = savingsEntries.filter(
    (e) =>
      Date.now() - Date.parse(`${e.date}T00:00:00`) < 45 * 24 * 3600 * 1000,
  );
  const monthlyRate = Math.round(
    recentDeposits.reduce((s, e) => s + e.amount, 0) / 1.5,
  );
  const savingsSection: ReportSection = {
    title: "Épargne",
    lines: [
      `${formatEuro(savingsTotal)} sécurisés · reste ${formatEuro(remaining)} vers l'objectif.`,
      monthlyRate > 0
        ? `Rythme courant ≈ ${formatEuro(monthlyRate)}/mois → objectif atteint dans ~${Math.ceil(remaining / monthlyRate)} mois.`
        : "Aucun dépôt sur 45 jours — un virement, même petit, relance la machine.",
    ],
  };

  // ── RECORDS ──
  const prs = records
    .filter((r) => r.isPr)
    .sort((a, b) => b.date.localeCompare(a.date));
  const gaps = MOVEMENTS.map((m) => {
    const b = bestOf(
      m,
      records.filter((r) => r.movementKey === m.key).map((r) => r.value),
    );
    if (b === null) return null;
    const achieved = m.betterIs === "higher" ? b >= m.target : b <= m.target;
    if (achieved) return null;
    const ratio = m.betterIs === "higher" ? b / m.target : m.target / b;
    return { m, b, ratio };
  })
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a, b) => b.ratio - a.ratio);
  const recordsSection: ReportSection = {
    title: "Records",
    lines: [
      prs[0]
        ? `Dernier PR : ${MOVEMENTS.find((m) => m.key === prs[0].movementKey)?.label} ${formatRecordValue(MOVEMENTS.find((m) => m.key === prs[0].movementKey)!.unit, prs[0].value)} (${frDate(prs[0].date)}).`
        : "Aucun PR loggé — pose tes baselines cette semaine.",
      gaps[0]
        ? `Cible la plus proche : ${gaps[0].m.label} — ${formatRecordValue(gaps[0].m.unit, gaps[0].b)} → ${gaps[0].m.targetLabel} (${Math.round(gaps[0].ratio * 100)}% du chemin).`
        : "Toutes les cibles mesurées sont atteintes — on relève la barre au jour 90.",
    ],
  };

  // ── PROTOCOLE ──
  const protocolSection: ReportSection = {
    title: "Protocole 90 jours",
    lines: [
      `Jour ${day}/${PROTOCOL_DAYS} — phase ${phase.name} : ${phase.focus.toLowerCase()}.`,
      `${PROTOCOL_DAYS - day} jours avant le retest complet.`,
    ],
  };

  // ── DIRECTIVE ──
  const DIRECTIVES: Record<StatKey, string> = {
    force:
      "La force est ta stat la plus discrète cette semaine — ne saute ni Force A ni Force B, et charge la barre.",
    engine:
      "Le moteur a le moins tourné — sanctuarise le 4×4 et le seuil cette semaine, c'est eux qui paieront au jour 90.",
    skill:
      "Le skill décroche — 15 min de handstand après une séance force suffisent à relancer la stat.",
    discipline:
      "La discipline rapporte le moins — le journal du soir et le Recovery Protocol du dimanche sont tes points faciles.",
    mental:
      "Le mental stagne — prends UN risk tier au-dessus sur la séance où tu te sens fort, et tiens-le.",
  };

  return {
    headline: `+${fmt(totalThisWeek)} XP cette semaine, portés par ${STATS[topStat].label} (+${fmt(thisWeek[topStat])}).`,
    sections: [
      momentum,
      journalSection,
      savingsSection,
      recordsSection,
      protocolSection,
    ],
    directive: DIRECTIVES[weakStat],
  };
}
