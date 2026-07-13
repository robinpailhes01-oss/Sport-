import { rollModifiers } from "@/lib/engine/run-generator";
import { computeOutcome } from "@/lib/engine/scoring";
import { statStateFromXp } from "@/lib/engine/xp";
import {
  STAT_KEYS,
  type AvatarState,
  type Run,
  type RunPerformance,
  type StatKey,
  type StatState,
  type WorkoutTemplate,
  type XpEvent,
} from "@/lib/engine/types";
import {
  MODIFIER_CATALOG,
  SEED_EVENTS,
  SEED_PROFILE,
  SEED_XP,
  TEMPLATES,
  seedWeeklyHistory,
} from "./seed";
import type { DataSource } from "./source";

const STORAGE_KEY = "ascent-save-v1";

interface SaveState {
  xpEvents: XpEvent[];
  runs: Run[];
  nextEventId: number;
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
        if (raw) return JSON.parse(raw) as SaveState;
      } catch {
        // sauvegarde corrompue → repart du seed
      }
    }
    return this.seed();
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
    return { xpEvents: events, runs: [], nextEventId: id };
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

  async getAvatar(): Promise<AvatarState> {
    const totals = this.xpByStat();
    const stats = Object.fromEntries(
      STAT_KEYS.map((k) => [k, statStateFromXp(totals[k])]),
    ) as Record<StatKey, StatState>;
    return {
      ...SEED_PROFILE,
      stats,
      totalLevel: STAT_KEYS.reduce((s, k) => s + stats[k].level, 0),
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

  private mustGetRun(runId: string): Run {
    const run = this.state.runs.find((r) => r.id === runId);
    if (!run) throw new Error(`Run inconnu: ${runId}`);
    return run;
  }
}
