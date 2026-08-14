import { rollModifiers } from "@/lib/engine/run-generator";
import { computeOutcome } from "@/lib/engine/scoring";
import { statStateFromXp, totalScore } from "@/lib/engine/xp";
import { agentReplies, type CommsMessage } from "@/lib/engine/comms";
import type { CommsAiContext, CommsAiResponse } from "@/lib/ai/comms-types";
import {
  FULL_JOURNAL_BONUS,
  HABITS,
  SAVINGS_GOAL,
  SAVINGS_XP,
  formatEuro,
  habitByKey,
} from "@/lib/engine/habits";
import { STATS } from "@/lib/engine/types";
import {
  STAT_KEYS,
  type AvatarState,
  type BodyScan,
  type OperatorProfile,
  type PersonalRecord,
  type Run,
  type RunPerformance,
  type SavingsEntry,
  type ScanAngle,
  type SetLog,
  type StatKey,
  type StatState,
  type WeighIn,
  type WorkoutTemplate,
  type XpEvent,
} from "@/lib/engine/types";
import {
  bestOf,
  formatRecordValue,
  isImprovement,
  movementByKey,
} from "@/lib/engine/records";
import { dayOfProtocol, phaseForDay } from "@/lib/engine/season";
import {
  MODIFIER_CATALOG,
  SEED_EVENTS,
  SEED_PROFILE,
  SEED_RECORDS,
  SEED_XP,
  TEMPLATES,
  seedWeeklyHistory,
} from "./seed";
import type { DataSource } from "./source";

const STORAGE_KEY = "ascent-save-v1";

interface SaveState {
  xpEvents: XpEvent[];
  runs: Run[];
  records: PersonalRecord[];
  /** ISO yyyy-mm-dd des jours de mer déclarés */
  seaDays: string[];
  /** date → clés d'habitudes cochées */
  journal: Record<string, string[]>;
  /** date → clés déjà créditées en XP (anti-farming du toggle) */
  journalGranted: Record<string, string[]>;
  /** dates dont le journal a été validé (clôture explicite de la journée) */
  journalValidated: Record<string, boolean>;
  /** date → heure d'entraînement déclarée ("HH:MM") */
  trainingTimes: Record<string, string>;
  savings: SavingsEntry[];
  comms: CommsMessage[];
  /** Photos de scan stockées en dataURL — mode local uniquement, taille limitée */
  bodyScans: StoredBodyScan[];
  profile: OperatorProfile;
  weighIns: WeighIn[];
  setLogs: SetLog[];
  nextEventId: number;
  nextRecordId: number;
  nextSavingsId: number;
  nextCommsId: number;
  nextScanId: number;
  nextSetLogId: number;
}

const DEFAULT_PROFILE: OperatorProfile = {
  heightCm: null,
  birthdate: null,
  equipment: "gym",
  goal: "hybride-hyrox",
  constraints: null,
  timeBudgetMin: 60,
};

interface StoredBodyScan {
  id: number;
  date: string;
  angle: ScanAngle;
  dataUrl: string;
  createdAt: string;
}

// Implémentation mock : in-memory + localStorage, 100% client.
// Sera remplacée par SupabaseDataSource sans toucher à l'UI.
export class MockDataSource implements DataSource {
  private state: SaveState;

  constructor() {
    this.state = this.load();
  }

  private load(): SaveState {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const state = JSON.parse(raw) as SaveState;
          // migrations douces des vieilles sauvegardes
          if (!state.records) {
            const seeded = this.seedRecords();
            state.records = seeded.records;
            state.nextRecordId = seeded.nextRecordId;
          }
          state.seaDays ??= [];
          state.journal ??= this.seedJournal();
          state.journalGranted ??= { ...state.journal };
          if (!state.savings) {
            const seeded = this.seedSavings();
            state.savings = seeded.savings;
            state.nextSavingsId = seeded.nextSavingsId;
          }
          state.comms ??= [];
          state.nextCommsId ??= 1;
          state.journalValidated ??= {};
          state.trainingTimes ??= {};
          state.bodyScans ??= [];
          state.nextScanId ??= 1;
          state.profile ??= { ...DEFAULT_PROFILE };
          state.weighIns ??= [];
          state.setLogs ??= [];
          state.nextSetLogId ??= 1;
          return state;
        }
      } catch {
        // sauvegarde corrompue → repart du seed
      }
    }
    return this.seed();
  }

  private seedRecords(): { records: PersonalRecord[]; nextRecordId: number } {
    let id = 1;
    const records: PersonalRecord[] = [];
    for (const [movementKey, value, ago] of SEED_RECORDS) {
      const movement = movementByKey(movementKey);
      if (!movement) continue;
      const prev = records
        .filter((r) => r.movementKey === movementKey)
        .map((r) => r.value);
      records.push({
        id: id++,
        movementKey,
        value,
        date: new Date(Date.now() - ago * 24 * 3600 * 1000)
          .toISOString()
          .slice(0, 10),
        isPr: isImprovement(movement, bestOf(movement, prev), value),
      });
    }
    return { records, nextRecordId: id };
  }

  private seed(): SaveState {
    let id = 1;
    const events: XpEvent[] = [];
    const history = seedWeeklyHistory();
    // Solde de départ par stat : SEED_XP moins ce que l'historique hebdo et
    // les events récents apportent déjà — les totaux restent exacts.
    for (const stat of STAT_KEYS) {
      const accounted = [...SEED_EVENTS, ...history]
        .filter((e) => e.stat === stat)
        .reduce((s, e) => s + e.amount, 0);
      events.push({
        id: id++,
        stat,
        amount: SEED_XP[stat] - accounted,
        source: "bonus",
        reason: "Antériorité du protocole",
        createdAt: new Date(
          Date.now() - SEED_PROFILE.dayIndex * 24 * 3600 * 1000,
        ).toISOString(),
      });
    }
    for (const e of [...history, ...SEED_EVENTS]) {
      events.push({ ...e, id: id++ });
    }
    const { records, nextRecordId } = this.seedRecords();
    const { savings, nextSavingsId } = this.seedSavings();
    const journal = this.seedJournal();
    return {
      xpEvents: events,
      runs: [],
      records,
      seaDays: [],
      journal,
      journalGranted: { ...journal },
      journalValidated: {},
      trainingTimes: {},
      savings,
      comms: [],
      bodyScans: [],
      profile: { ...DEFAULT_PROFILE },
      weighIns: [],
      setLogs: [],
      nextEventId: id,
      nextRecordId,
      nextSavingsId,
      nextCommsId: 1,
      nextScanId: 1,
      nextSetLogId: 1,
    };
  }

  // Démo : quelques jours de journal déjà remplis + un début d'épargne.
  // À écraser par la vraie vie dès le premier jour d'usage.
  private seedJournal(): Record<string, string[]> {
    const journal: Record<string, string[]> = {};
    const patterns = [
      ["sans-alcool", "lecture"],
      ["sans-alcool", "visualisation", "lecture"],
      ["sans-alcool"],
      ["sans-alcool", "visualisation", "lecture"],
      ["lecture", "visualisation"],
    ];
    for (let i = 1; i <= patterns.length; i++) {
      const date = new Date(Date.now() - i * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      journal[date] = patterns[i - 1];
    }
    return journal;
  }

  private seedSavings(): { savings: SavingsEntry[]; nextSavingsId: number } {
    let id = 1;
    const savings: SavingsEntry[] = [
      [500, 40],
      [450, 22],
      [300, 6],
    ].map(([amount, ago]) => ({
      id: id++,
      amount,
      date: new Date(Date.now() - ago * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10),
    }));
    return { savings, nextSavingsId: id };
  }

  private persist() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }
  }

  private xpByStat(): Record<StatKey, number> {
    const totals = Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<
      StatKey,
      number
    >;
    for (const e of this.state.xpEvents) totals[e.stat] += e.amount;
    return totals;
  }

  // Un jour compte pour le streak s'il porte un run complété, un journal
  // validé ou un jour de mer déclaré. "Aujourd'hui" incomplet ne casse pas
  // la chaîne tant qu'il n'est pas fini — on regarde hier en attendant.
  private computeStreak(): number {
    const active = new Set<string>();
    for (const r of this.state.runs) {
      if (r.status === "completed" && r.completedAt) {
        active.add(r.completedAt.slice(0, 10));
      }
    }
    for (const [date, ok] of Object.entries(this.state.journalValidated)) {
      if (ok) active.add(date);
    }
    for (const d of this.state.seaDays) active.add(d);

    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const cursor = new Date();
    if (!active.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);

    let streak = 0;
    while (active.has(iso(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  async getAvatar(): Promise<AvatarState> {
    const totals = this.xpByStat();
    const stats = Object.fromEntries(
      STAT_KEYS.map((k) => [k, statStateFromXp(totals[k])]),
    ) as Record<StatKey, StatState>;
    return {
      ...SEED_PROFILE,
      streakDays: this.computeStreak(),
      dayIndex: dayOfProtocol(new Date()),
      stats,
      score: totalScore(totals),
      recentEvents: [...this.state.xpEvents]
        .filter((e) => e.source !== "bonus")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    };
  }

  async listTemplates(): Promise<WorkoutTemplate[]> {
    return TEMPLATES;
  }

  async getTemplate(id: string): Promise<WorkoutTemplate | null> {
    return TEMPLATES.find((t) => t.id === id) ?? null;
  }

  async getTemplateBySlug(slug: string): Promise<WorkoutTemplate | null> {
    return TEMPLATES.find((t) => t.slug === slug) ?? null;
  }

  async getWeeklyXp(weeks: number): Promise<Record<StatKey, number[]>> {
    const WEEK_MS = 7 * 24 * 3600 * 1000;
    const now = Date.now();
    const result = Object.fromEntries(
      STAT_KEYS.map((k) => [k, Array(weeks).fill(0)]),
    ) as Record<StatKey, number[]>;
    for (const e of this.state.xpEvents) {
      if (e.source === "bonus") continue;
      const age = Math.floor((now - Date.parse(e.createdAt)) / WEEK_MS);
      if (age < 0 || age >= weeks) continue;
      result[e.stat][weeks - 1 - age] += e.amount;
    }
    return result;
  }

  async rollRun(templateId: string, riskTier: number): Promise<Run> {
    const run: Run = {
      id: `run-${Date.now().toString(36)}`,
      templateId,
      status: "rolled",
      modifiers: rollModifiers(MODIFIER_CATALOG, riskTier),
      riskTier,
      rolledAt: new Date().toISOString(),
    };
    this.state.runs.push(run);
    this.persist();
    return run;
  }

  async rerollRun(runId: string): Promise<Run> {
    const run = this.mustGetRun(runId);
    if (run.status !== "rolled") return run;
    run.modifiers = rollModifiers(MODIFIER_CATALOG, run.riskTier);
    this.persist();
    return run;
  }

  async startRun(runId: string): Promise<Run> {
    const run = this.mustGetRun(runId);
    run.status = "active";
    run.startedAt = new Date().toISOString();
    this.persist();
    return run;
  }

  async completeRun(runId: string, performance: RunPerformance): Promise<Run> {
    const run = this.mustGetRun(runId);
    const template = TEMPLATES.find((t) => t.id === run.templateId);
    if (!template) throw new Error(`Template inconnu: ${run.templateId}`);

    const outcome = computeOutcome(template, run, performance, this.xpByStat());
    run.status = "completed";
    run.completedAt = new Date().toISOString();
    run.performance = performance;
    run.outcome = outcome;

    for (const [stat, amount] of Object.entries(outcome.xpByStat) as [
      StatKey,
      number,
    ][]) {
      if (amount === 0) continue;
      this.state.xpEvents.push({
        id: this.state.nextEventId++,
        stat,
        amount,
        source: "run",
        runId: run.id,
        reason: `${template.title} — ×${outcome.multiplier.toFixed(2)}`,
        createdAt: run.completedAt,
      });
    }
    this.persist();
    return run;
  }

  async abandonRun(runId: string): Promise<Run> {
    const run = this.mustGetRun(runId);
    run.status = "abandoned";
    run.completedAt = new Date().toISOString();
    this.persist();
    return run;
  }

  async getRun(runId: string): Promise<Run | null> {
    return this.state.runs.find((r) => r.id === runId) ?? null;
  }

  async getActiveRun(): Promise<Run | null> {
    return (
      this.state.runs.find(
        (r) => r.status === "active" || r.status === "rolled",
      ) ?? null
    );
  }

  async listRecords(): Promise<PersonalRecord[]> {
    return [...this.state.records];
  }

  async addRecord(
    movementKey: string,
    value: number,
    date: string,
  ): Promise<{ record: PersonalRecord; prevBest: number | null }> {
    const movement = movementByKey(movementKey);
    if (!movement) throw new Error(`Mouvement inconnu: ${movementKey}`);

    const prevBest = bestOf(
      movement,
      this.state.records
        .filter((r) => r.movementKey === movementKey)
        .map((r) => r.value),
    );
    const record: PersonalRecord = {
      id: this.state.nextRecordId++,
      movementKey,
      value,
      date,
      isPr: isImprovement(movement, prevBest, value),
    };
    this.state.records.push(record);

    // Un PR validé nourrit la stat du mouvement — le rétroviseur récompense.
    if (record.isPr) {
      this.state.xpEvents.push({
        id: this.state.nextEventId++,
        stat: movement.stat,
        amount: 40,
        source: "record",
        reason: `PR — ${movement.label} ${formatRecordValue(movement.unit, value)}`,
        createdAt: new Date().toISOString(),
      });
    }
    this.persist();
    return { record, prevBest };
  }

  async listSeaDays(): Promise<string[]> {
    return [...this.state.seaDays];
  }

  async toggleSeaDay(date: string): Promise<string[]> {
    const idx = this.state.seaDays.indexOf(date);
    if (idx >= 0) this.state.seaDays.splice(idx, 1);
    else this.state.seaDays.push(date);
    this.persist();
    return [...this.state.seaDays];
  }

  async getTrainingTime(date: string): Promise<string | null> {
    return this.state.trainingTimes[date] ?? null;
  }

  async setTrainingTime(date: string, time: string | null): Promise<void> {
    if (time) this.state.trainingTimes[date] = time;
    else delete this.state.trainingTimes[date];
    this.persist();
  }

  async getJournal(days: number): Promise<Record<string, string[]>> {
    const out: Record<string, string[]> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      out[date] = this.state.journal[date] ?? [];
    }
    return out;
  }

  async toggleHabit(date: string, habitKey: string): Promise<string[]> {
    const habit = habitByKey(habitKey);
    if (!habit) throw new Error(`Habitude inconnue: ${habitKey}`);

    const day = (this.state.journal[date] ??= []);
    const idx = day.indexOf(habitKey);
    if (idx >= 0) {
      day.splice(idx, 1);
    } else {
      day.push(habitKey);
      // XP à la première coche du jour uniquement — décocher ne rembourse pas,
      // recocher ne recrédite pas.
      const granted = (this.state.journalGranted[date] ??= []);
      if (!granted.includes(habitKey)) {
        granted.push(habitKey);
        this.state.xpEvents.push({
          id: this.state.nextEventId++,
          stat: habit.stat,
          amount: habit.xp,
          source: "checkin",
          reason: `Journal — ${habit.label}`,
          createdAt: new Date().toISOString(),
        });
      }
      if (
        day.length === HABITS.length &&
        !granted.includes("__full__")
      ) {
        granted.push("__full__");
        this.state.xpEvents.push({
          id: this.state.nextEventId++,
          stat: "discipline",
          amount: FULL_JOURNAL_BONUS,
          source: "checkin",
          reason: "Journal complet — toutes les habitudes tenues",
          createdAt: new Date().toISOString(),
        });
      }
    }
    this.persist();
    return [...day];
  }

  async listValidatedDays(): Promise<string[]> {
    return Object.keys(this.state.journalValidated).filter(
      (d) => this.state.journalValidated[d],
    );
  }

  async validateJournal(date: string): Promise<void> {
    if (this.state.journalValidated[date]) return;
    this.state.journalValidated[date] = true;
    this.state.xpEvents.push({
      id: this.state.nextEventId++,
      stat: "discipline",
      amount: 5,
      source: "checkin",
      reason: "Journal validé — journée clôturée",
      createdAt: new Date().toISOString(),
    });
    this.persist();
  }

  async getSavings(): Promise<{ total: number; entries: SavingsEntry[] }> {
    const entries = [...this.state.savings].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    return {
      total: this.state.savings.reduce((s, e) => s + e.amount, 0),
      entries,
    };
  }

  async addSaving(amount: number, date: string): Promise<SavingsEntry> {
    const entry: SavingsEntry = {
      id: this.state.nextSavingsId++,
      amount,
      date,
    };
    this.state.savings.push(entry);
    this.state.xpEvents.push({
      id: this.state.nextEventId++,
      stat: "discipline",
      amount: SAVINGS_XP,
      source: "checkin",
      reason: `Épargne — ${formatEuro(amount)} de côté`,
      createdAt: new Date().toISOString(),
    });
    this.persist();
    return entry;
  }

  async listComms(): Promise<CommsMessage[]> {
    return [...this.state.comms];
  }

  async sendComms(text: string, mood: number): Promise<CommsMessage[]> {
    const now = new Date().toISOString();
    const mine: CommsMessage = {
      id: this.state.nextCommsId++,
      author: "me",
      text,
      mood,
      createdAt: now,
    };

    // Contexte mémoire pour la réponse de l'agent
    const myEntries = this.state.comms.filter((m) => m.author === "me");
    const lastLow = [...myEntries]
      .reverse()
      .find((m) => (m.mood ?? 3) <= 2);
    const lastLowMoodDaysAgo = lastLow
      ? Math.floor(
          (Date.now() - Date.parse(lastLow.createdAt)) / (24 * 3600 * 1000),
        )
      : null;
    const weekly = await this.getWeeklyXp(1);
    const weakStat = STAT_KEYS.reduce((a, b) =>
      weekly[a][0] <= weekly[b][0] ? a : b,
    );
    const topStat = STAT_KEYS.reduce((a, b) =>
      weekly[a][0] >= weekly[b][0] ? a : b,
    );

    const replies = await this.commsReplies(text, mood, {
      entryCount: myEntries.length,
      lastLowMoodDaysAgo,
      weakStatLabel: STATS[weakStat].label,
      topStatLabel: STATS[topStat].label,
    });

    this.state.comms.push(mine);
    for (const reply of replies) {
      this.state.comms.push({
        id: this.state.nextCommsId++,
        author: reply.author,
        text: reply.text,
        createdAt: new Date().toISOString(),
      });
    }
    this.persist();
    return [...this.state.comms];
  }

  // Essaie l'IA réelle (route /api/comms) avec un contexte complet du ledger ;
  // retombe silencieusement sur le moteur de règles local si la route échoue
  // ou si aucune clé n'est configurée côté serveur.
  private async commsReplies(
    text: string,
    mood: number,
    partial: {
      entryCount: number;
      lastLowMoodDaysAgo: number | null;
      weakStatLabel: string;
      topStatLabel: string;
    },
  ): Promise<{ author: Exclude<CommsMessage["author"], "me">; text: string }[]> {
    const fallback = () =>
      agentReplies(text, mood, {
        entryCount: partial.entryCount,
        lastLowMoodDaysAgo: partial.lastLowMoodDaysAgo,
        weakStatLabel: partial.weakStatLabel,
      });

    if (typeof window === "undefined") return fallback();

    try {
      const day = dayOfProtocol(new Date());
      const phase = phaseForDay(day);
      const savingsTotal = this.state.savings.reduce((s, e) => s + e.amount, 0);
      const journalValidatedDays = Object.values(
        this.state.journalValidated,
      ).filter(Boolean).length;
      const lastPr = [...this.state.records]
        .filter((r) => r.isPr)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const lastRecordLabel = lastPr
        ? `${movementByKey(lastPr.movementKey)?.label ?? lastPr.movementKey} ${formatRecordValue(movementByKey(lastPr.movementKey)!.unit, lastPr.value)}`
        : null;
      const history = this.state.comms.slice(-8).map((m) => ({
        author: m.author,
        text: m.text,
        mood: m.mood,
      }));

      const context: CommsAiContext = {
        score: totalScore(this.xpByStat()),
        streakDays: this.computeStreak(),
        day,
        protocolDays: 90,
        phaseName: phase.name,
        phaseFocus: phase.focus,
        entryCount: partial.entryCount,
        lastLowMoodDaysAgo: partial.lastLowMoodDaysAgo,
        topStatLabel: partial.topStatLabel,
        weakStatLabel: partial.weakStatLabel,
        journalValidatedDays,
        savingsTotal,
        savingsGoal: SAVINGS_GOAL,
        lastRecordLabel,
        history,
      };

      const res = await fetch("/api/comms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mood, context }),
      });
      if (!res.ok) return fallback();

      const data = (await res.json()) as CommsAiResponse;
      if (!data.replies?.length) return fallback();
      return data.replies;
    } catch {
      return fallback();
    }
  }

  // Repart de zéro : le seed() de démo (utile en design) ne doit jamais
  // revenir après un reset — un vrai lancement part d'un état réellement vide.
  // Les scans corporels survivent au reset — ce sont des photos, pas du jeu.
  async resetProtocol(): Promise<void> {
    this.state = {
      xpEvents: [],
      runs: [],
      records: [],
      seaDays: [],
      journal: {},
      journalGranted: {},
      journalValidated: {},
      trainingTimes: {},
      savings: [],
      comms: [],
      bodyScans: this.state.bodyScans,
      // Le profil survit au reset : taille et objectif ne sont pas de la
      // progression. Les pesées et les séries, si — elles repartent à zéro.
      profile: this.state.profile,
      weighIns: [],
      setLogs: [],
      nextEventId: 1,
      nextRecordId: 1,
      nextSavingsId: 1,
      nextCommsId: 1,
      nextScanId: this.state.nextScanId,
      nextSetLogId: 1,
    };
    this.persist();
  }

  async getProfile(): Promise<OperatorProfile> {
    return { ...this.state.profile };
  }

  async setProfile(patch: Partial<OperatorProfile>): Promise<OperatorProfile> {
    this.state.profile = { ...this.state.profile, ...patch };
    this.persist();
    return { ...this.state.profile };
  }

  async listWeighIns(): Promise<WeighIn[]> {
    return [...this.state.weighIns].sort((a, b) => b.date.localeCompare(a.date));
  }

  async addWeighIn(date: string, weightKg: number): Promise<void> {
    this.state.weighIns = this.state.weighIns.filter((w) => w.date !== date);
    this.state.weighIns.push({ date, weightKg });
    this.persist();
  }

  async listSetLogs(days = 120): Promise<SetLog[]> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    return this.state.setLogs
      .filter((s) => s.date >= since)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async saveSetLogs(
    runId: string,
    exerciseKey: string,
    date: string,
    sets: { weightKg: number; reps: number; rpe?: number | null }[],
  ): Promise<void> {
    this.state.setLogs = this.state.setLogs.filter(
      (s) => !(s.runId === runId && s.exerciseKey === exerciseKey),
    );
    sets
      .filter((s) => s.weightKg > 0 && s.reps > 0)
      .forEach((s, i) => {
        this.state.setLogs.push({
          id: this.state.nextSetLogId++,
          runId,
          exerciseKey,
          setIndex: i,
          weightKg: s.weightKg,
          reps: s.reps,
          rpe: s.rpe ?? null,
          date,
        });
      });
    this.persist();
  }

  async listBodyScans(): Promise<BodyScan[]> {
    return [...this.state.bodyScans]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      .map((s) => ({ id: s.id, date: s.date, angle: s.angle, url: s.dataUrl, createdAt: s.createdAt }));
  }

  async addBodyScan(date: string, angle: ScanAngle, dataUrl: string): Promise<BodyScan> {
    const scan: StoredBodyScan = {
      id: this.state.nextScanId++,
      date,
      angle,
      dataUrl,
      createdAt: new Date().toISOString(),
    };
    this.state.bodyScans.push(scan);
    try {
      this.persist();
    } catch {
      // localStorage plein (les photos sont lourdes) — on retire le scan
      // qu'on vient d'ajouter plutôt que de laisser un état incohérent.
      this.state.bodyScans.pop();
      throw new Error(
        "Stockage local plein — passe sur Supabase pour garder tes scans (voir Réglages).",
      );
    }
    return { id: scan.id, date: scan.date, angle: scan.angle, url: scan.dataUrl, createdAt: scan.createdAt };
  }

  async deleteBodyScan(id: number): Promise<void> {
    this.state.bodyScans = this.state.bodyScans.filter((s) => s.id !== id);
    this.persist();
  }

  private mustGetRun(runId: string): Run {
    const run = this.state.runs.find((r) => r.id === runId);
    if (!run) throw new Error(`Run inconnu: ${runId}`);
    return run;
  }
}
