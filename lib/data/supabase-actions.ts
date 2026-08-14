"use server";

import { rollModifiers } from "@/lib/engine/run-generator";
import { computeOutcome } from "@/lib/engine/scoring";
import { statStateFromXp, totalScore } from "@/lib/engine/xp";
import { agentReplies, type CommsAuthor, type CommsMessage } from "@/lib/engine/comms";
import { callCommsAi } from "@/lib/ai/comms-client";
import type { CommsAiContext } from "@/lib/ai/comms-types";
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
  type Equipment,
  type Goal,
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
import { MODIFIER_CATALOG, SEED_PROFILE, TEMPLATES } from "./seed";
import { supabaseAdmin } from "./supabase-client";

// Server Actions — c'est ici, et uniquement ici, que le service_role Supabase
// est utilisé. Chaque fonction reproduit exactement la logique métier de
// MockDataSource (même moteur lib/engine, même règles), mais lit/écrit sur
// Postgres au lieu du localStorage. lib/data/supabase.ts n'est qu'une fine
// classe qui délègue ici pour respecter l'interface DataSource.

function bail(err: { message: string } | null): void {
  if (err) throw new Error(err.message);
}

// ── XP / avatar ──────────────────────────────────────────────

async function xpByStat(): Promise<Record<StatKey, number>> {
  const totals = Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<
    StatKey,
    number
  >;
  const { data, error } = await supabaseAdmin()
    .from("xp_events")
    .select("stat, amount");
  bail(error);
  for (const row of data ?? []) {
    totals[row.stat as StatKey] += row.amount as number;
  }
  return totals;
}

async function computeStreak(): Promise<number> {
  const admin = supabaseAdmin();
  const active = new Set<string>();

  const [{ data: runs, error: e1 }, { data: validated, error: e2 }, { data: seaDays, error: e3 }] =
    await Promise.all([
      admin.from("runs").select("completed_at").eq("status", "completed"),
      admin.from("journal_validated").select("date"),
      admin.from("sea_days").select("date"),
    ]);
  bail(e1);
  bail(e2);
  bail(e3);

  for (const r of runs ?? []) {
    if (r.completed_at) active.add(String(r.completed_at).slice(0, 10));
  }
  for (const v of validated ?? []) active.add(v.date as string);
  for (const d of seaDays ?? []) active.add(d.date as string);

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

export async function getAvatar(): Promise<AvatarState> {
  const totals = await xpByStat();
  const stats = Object.fromEntries(
    STAT_KEYS.map((k) => [k, statStateFromXp(totals[k])]),
  ) as Record<StatKey, StatState>;

  const { data: recent, error } = await supabaseAdmin()
    .from("xp_events")
    .select("id, stat, amount, source, reason, run_id, created_at")
    .neq("source", "bonus")
    .order("created_at", { ascending: false })
    .limit(8);
  bail(error);

  return {
    ...SEED_PROFILE,
    streakDays: await computeStreak(),
    dayIndex: dayOfProtocol(new Date()),
    stats,
    score: totalScore(totals),
    recentEvents: (recent ?? []).map(
      (r): XpEvent => ({
        id: r.id,
        stat: r.stat as StatKey,
        amount: r.amount,
        source: r.source,
        reason: r.reason,
        runId: r.run_id ?? undefined,
        createdAt: r.created_at,
      }),
    ),
  };
}

export async function listTemplates(): Promise<WorkoutTemplate[]> {
  return TEMPLATES;
}

export async function getTemplate(id: string): Promise<WorkoutTemplate | null> {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export async function getTemplateBySlug(
  slug: string,
): Promise<WorkoutTemplate | null> {
  return TEMPLATES.find((t) => t.slug === slug) ?? null;
}

export async function getWeeklyXp(
  weeks: number,
): Promise<Record<StatKey, number[]>> {
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const since = new Date(now - weeks * WEEK_MS).toISOString();
  const result = Object.fromEntries(
    STAT_KEYS.map((k) => [k, Array(weeks).fill(0)]),
  ) as Record<StatKey, number[]>;

  const { data, error } = await supabaseAdmin()
    .from("xp_events")
    .select("stat, amount, created_at")
    .neq("source", "bonus")
    .gte("created_at", since);
  bail(error);

  for (const e of data ?? []) {
    const age = Math.floor((now - Date.parse(e.created_at)) / WEEK_MS);
    if (age < 0 || age >= weeks) continue;
    result[e.stat as StatKey][weeks - 1 - age] += e.amount as number;
  }
  return result;
}

// ── Runs ─────────────────────────────────────────────────────

function rowToRun(r: Record<string, unknown>): Run {
  return {
    id: r.id as string,
    templateId: r.template_id as string,
    status: r.status as Run["status"],
    modifiers: (r.modifiers as Run["modifiers"]) ?? [],
    riskTier: r.risk_tier as number,
    rolledAt: r.rolled_at as string,
    startedAt: (r.started_at as string) ?? undefined,
    completedAt: (r.completed_at as string) ?? undefined,
    performance: (r.performance as Run["performance"]) ?? undefined,
    outcome: (r.outcome as Run["outcome"]) ?? undefined,
  };
}

async function mustGetRun(runId: string): Promise<Run> {
  const { data, error } = await supabaseAdmin()
    .from("runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  bail(error);
  if (!data) throw new Error(`Run inconnu: ${runId}`);
  return rowToRun(data);
}

export async function rollRun(templateId: string, riskTier: number): Promise<Run> {
  const run: Run = {
    id: `run-${Date.now().toString(36)}`,
    templateId,
    status: "rolled",
    modifiers: rollModifiers(MODIFIER_CATALOG, riskTier),
    riskTier,
    rolledAt: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin().from("runs").insert({
    id: run.id,
    template_id: run.templateId,
    status: run.status,
    modifiers: run.modifiers,
    risk_tier: run.riskTier,
    rolled_at: run.rolledAt,
  });
  bail(error);
  return run;
}

export async function rerollRun(runId: string): Promise<Run> {
  const run = await mustGetRun(runId);
  if (run.status !== "rolled") return run;
  run.modifiers = rollModifiers(MODIFIER_CATALOG, run.riskTier);
  const { error } = await supabaseAdmin()
    .from("runs")
    .update({ modifiers: run.modifiers })
    .eq("id", runId);
  bail(error);
  return run;
}

export async function startRun(runId: string): Promise<Run> {
  const run = await mustGetRun(runId);
  run.status = "active";
  run.startedAt = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("runs")
    .update({ status: run.status, started_at: run.startedAt })
    .eq("id", runId);
  bail(error);
  return run;
}

export async function completeRun(
  runId: string,
  performance: RunPerformance,
): Promise<Run> {
  const run = await mustGetRun(runId);
  const template = TEMPLATES.find((t) => t.id === run.templateId);
  if (!template) throw new Error(`Template inconnu: ${run.templateId}`);

  const outcome = computeOutcome(template, run, performance, await xpByStat());
  run.status = "completed";
  run.completedAt = new Date().toISOString();
  run.performance = performance;
  run.outcome = outcome;

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("runs")
    .update({
      status: run.status,
      completed_at: run.completedAt,
      performance: run.performance,
      outcome: run.outcome,
    })
    .eq("id", runId);
  bail(error);

  const events = (
    Object.entries(outcome.xpByStat) as [StatKey, number][]
  ).filter(([, amount]) => amount !== 0);
  if (events.length > 0) {
    const { error: e2 } = await admin.from("xp_events").insert(
      events.map(([stat, amount]) => ({
        stat,
        amount,
        source: "run",
        run_id: run.id,
        reason: `${template.title} — ×${outcome.multiplier.toFixed(2)}`,
        created_at: run.completedAt,
      })),
    );
    bail(e2);
  }
  return run;
}

export async function abandonRun(runId: string): Promise<Run> {
  const run = await mustGetRun(runId);
  run.status = "abandoned";
  run.completedAt = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("runs")
    .update({ status: run.status, completed_at: run.completedAt })
    .eq("id", runId);
  bail(error);
  return run;
}

export async function getRun(runId: string): Promise<Run | null> {
  const { data, error } = await supabaseAdmin()
    .from("runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  bail(error);
  return data ? rowToRun(data) : null;
}

export async function getActiveRun(): Promise<Run | null> {
  const { data, error } = await supabaseAdmin()
    .from("runs")
    .select("*")
    .in("status", ["active", "rolled"])
    .order("rolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  bail(error);
  return data ? rowToRun(data) : null;
}

// ── Records ──────────────────────────────────────────────────

export async function listRecords(): Promise<PersonalRecord[]> {
  const { data, error } = await supabaseAdmin()
    .from("records")
    .select("id, movement_key, value, date, is_pr")
    .order("date", { ascending: true });
  bail(error);
  return (data ?? []).map((r) => ({
    id: r.id,
    movementKey: r.movement_key,
    value: r.value,
    date: r.date,
    isPr: r.is_pr,
  }));
}

export async function addRecord(
  movementKey: string,
  value: number,
  date: string,
): Promise<{ record: PersonalRecord; prevBest: number | null }> {
  const movement = movementByKey(movementKey);
  if (!movement) throw new Error(`Mouvement inconnu: ${movementKey}`);

  const admin = supabaseAdmin();
  const { data: prior, error: e1 } = await admin
    .from("records")
    .select("value")
    .eq("movement_key", movementKey);
  bail(e1);

  const prevBest = bestOf(movement, (prior ?? []).map((r) => r.value as number));
  const isPr = isImprovement(movement, prevBest, value);

  const { data: inserted, error: e2 } = await admin
    .from("records")
    .insert({ movement_key: movementKey, value, date, is_pr: isPr })
    .select("id")
    .single();
  bail(e2);

  if (isPr) {
    const { error: e3 } = await admin.from("xp_events").insert({
      stat: movement.stat,
      amount: 40,
      source: "record",
      reason: `PR — ${movement.label} ${formatRecordValue(movement.unit, value)}`,
      created_at: new Date().toISOString(),
    });
    bail(e3);
  }

  const record: PersonalRecord = {
    id: inserted!.id,
    movementKey,
    value,
    date,
    isPr,
  };
  return { record, prevBest };
}

// ── Jours de mer ─────────────────────────────────────────────

export async function listSeaDays(): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from("sea_days").select("date");
  bail(error);
  return (data ?? []).map((d) => d.date as string);
}

export async function toggleSeaDay(date: string): Promise<string[]> {
  const admin = supabaseAdmin();
  const { data: existing, error: e1 } = await admin
    .from("sea_days")
    .select("date")
    .eq("date", date)
    .maybeSingle();
  bail(e1);

  if (existing) {
    const { error } = await admin.from("sea_days").delete().eq("date", date);
    bail(error);
  } else {
    const { error } = await admin.from("sea_days").insert({ date });
    bail(error);
  }
  return listSeaDays();
}

// ── Heure d'entraînement ─────────────────────────────────────

export async function getTrainingTime(date: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("training_times")
    .select("time")
    .eq("date", date)
    .maybeSingle();
  bail(error);
  return data?.time ?? null;
}

export async function setTrainingTime(
  date: string,
  time: string | null,
): Promise<void> {
  const admin = supabaseAdmin();
  if (time) {
    const { error } = await admin
      .from("training_times")
      .upsert({ date, time });
    bail(error);
  } else {
    const { error } = await admin.from("training_times").delete().eq("date", date);
    bail(error);
  }
}

// ── Journal ──────────────────────────────────────────────────

export async function getJournal(days: number): Promise<Record<string, string[]>> {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10));
  }
  const out: Record<string, string[]> = Object.fromEntries(dates.map((d) => [d, []]));

  const { data, error } = await supabaseAdmin()
    .from("journal_entries")
    .select("date, habit_key")
    .in("date", dates);
  bail(error);
  for (const row of data ?? []) {
    out[row.date as string]?.push(row.habit_key as string);
  }
  return out;
}

export async function toggleHabit(date: string, habitKey: string): Promise<string[]> {
  const habit = habitByKey(habitKey);
  if (!habit) throw new Error(`Habitude inconnue: ${habitKey}`);

  const admin = supabaseAdmin();
  const { data: existing, error: e1 } = await admin
    .from("journal_entries")
    .select("habit_key")
    .eq("date", date)
    .eq("habit_key", habitKey)
    .maybeSingle();
  bail(e1);

  if (existing) {
    const { error } = await admin
      .from("journal_entries")
      .delete()
      .eq("date", date)
      .eq("habit_key", habitKey);
    bail(error);
  } else {
    const { error } = await admin
      .from("journal_entries")
      .insert({ date, habit_key: habitKey });
    bail(error);

    // XP à la première coche du jour uniquement — journal_granted est une
    // trace permanente, jamais nettoyée par un décoche.
    const { data: granted, error: e2 } = await admin
      .from("journal_granted")
      .select("habit_key")
      .eq("date", date)
      .eq("habit_key", habitKey)
      .maybeSingle();
    bail(e2);

    if (!granted) {
      const { error: e3 } = await admin
        .from("journal_granted")
        .insert({ date, habit_key: habitKey });
      bail(e3);
      const { error: e4 } = await admin.from("xp_events").insert({
        stat: habit.stat,
        amount: habit.xp,
        source: "checkin",
        reason: `Journal — ${habit.label}`,
        created_at: new Date().toISOString(),
      });
      bail(e4);
    }

    const { count, error: e5 } = await admin
      .from("journal_entries")
      .select("habit_key", { count: "exact", head: true })
      .eq("date", date);
    bail(e5);

    if (count === HABITS.length) {
      const { data: fullGranted, error: e6 } = await admin
        .from("journal_granted")
        .select("habit_key")
        .eq("date", date)
        .eq("habit_key", "__full__")
        .maybeSingle();
      bail(e6);

      if (!fullGranted) {
        const { error: e7 } = await admin
          .from("journal_granted")
          .insert({ date, habit_key: "__full__" });
        bail(e7);
        const { error: e8 } = await admin.from("xp_events").insert({
          stat: "discipline",
          amount: FULL_JOURNAL_BONUS,
          source: "checkin",
          reason: "Journal complet — toutes les habitudes tenues",
          created_at: new Date().toISOString(),
        });
        bail(e8);
      }
    }
  }

  const { data: day, error: e9 } = await admin
    .from("journal_entries")
    .select("habit_key")
    .eq("date", date);
  bail(e9);
  return (day ?? []).map((r) => r.habit_key as string);
}

export async function listValidatedDays(): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from("journal_validated")
    .select("date");
  bail(error);
  return (data ?? []).map((d) => d.date as string);
}

export async function validateJournal(date: string): Promise<void> {
  const admin = supabaseAdmin();
  const { data: existing, error: e1 } = await admin
    .from("journal_validated")
    .select("date")
    .eq("date", date)
    .maybeSingle();
  bail(e1);
  if (existing) return;

  const { error: e2 } = await admin.from("journal_validated").insert({ date });
  bail(e2);
  const { error: e3 } = await admin.from("xp_events").insert({
    stat: "discipline",
    amount: 5,
    source: "checkin",
    reason: "Journal validé — journée clôturée",
    created_at: new Date().toISOString(),
  });
  bail(e3);
}

// ── Épargne ──────────────────────────────────────────────────

export async function getSavings(): Promise<{ total: number; entries: SavingsEntry[] }> {
  const { data, error } = await supabaseAdmin()
    .from("savings")
    .select("id, amount, date")
    .order("date", { ascending: false });
  bail(error);
  const entries = (data ?? []).map((e) => ({ id: e.id, amount: e.amount, date: e.date }));
  return { total: entries.reduce((s, e) => s + e.amount, 0), entries };
}

export async function addSaving(amount: number, date: string): Promise<SavingsEntry> {
  const admin = supabaseAdmin();
  const { data: inserted, error } = await admin
    .from("savings")
    .insert({ amount, date })
    .select("id")
    .single();
  bail(error);
  const { error: e2 } = await admin.from("xp_events").insert({
    stat: "discipline",
    amount: SAVINGS_XP,
    source: "checkin",
    reason: `Épargne — ${formatEuro(amount)} de côté`,
    created_at: new Date().toISOString(),
  });
  bail(e2);
  return { id: inserted!.id, amount, date };
}

// ── Comms ────────────────────────────────────────────────────

function rowToComms(r: Record<string, unknown>): CommsMessage {
  return {
    id: r.id as number,
    author: r.author as CommsMessage["author"],
    text: r.text as string,
    mood: (r.mood as number) ?? undefined,
    createdAt: r.created_at as string,
  };
}

export async function listComms(): Promise<CommsMessage[]> {
  const { data, error } = await supabaseAdmin()
    .from("comms_messages")
    .select("*")
    .order("created_at", { ascending: true });
  bail(error);
  return (data ?? []).map(rowToComms);
}

export async function sendComms(text: string, mood: number): Promise<CommsMessage[]> {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: myEntries, error: e1 } = await admin
    .from("comms_messages")
    .select("mood, created_at")
    .eq("author", "me")
    .order("created_at", { ascending: false });
  bail(e1);

  const lastLow = (myEntries ?? []).find((m) => (m.mood ?? 3) <= 2);
  const lastLowMoodDaysAgo = lastLow
    ? Math.floor((Date.now() - Date.parse(lastLow.created_at as string)) / (24 * 3600 * 1000))
    : null;

  const weekly = await getWeeklyXp(1);
  const weakStat = STAT_KEYS.reduce((a, b) => (weekly[a][0] <= weekly[b][0] ? a : b));
  const topStat = STAT_KEYS.reduce((a, b) => (weekly[a][0] >= weekly[b][0] ? a : b));

  const replies = await commsReplies(text, mood, {
    entryCount: (myEntries ?? []).length,
    lastLowMoodDaysAgo,
    weakStatLabel: STATS[weakStat].label,
    topStatLabel: STATS[topStat].label,
  });

  const { error: e2 } = await admin.from("comms_messages").insert({
    author: "me",
    text,
    mood,
    created_at: now,
  });
  bail(e2);

  if (replies.length > 0) {
    const { error: e3 } = await admin.from("comms_messages").insert(
      replies.map((r) => ({
        author: r.author,
        text: r.text,
        created_at: new Date().toISOString(),
      })),
    );
    bail(e3);
  }

  return listComms();
}

async function commsReplies(
  text: string,
  mood: number,
  partial: {
    entryCount: number;
    lastLowMoodDaysAgo: number | null;
    weakStatLabel: string;
    topStatLabel: string;
  },
): Promise<{ author: Exclude<CommsAuthor, "me">; text: string }[]> {
  const fallback = () =>
    agentReplies(text, mood, {
      entryCount: partial.entryCount,
      lastLowMoodDaysAgo: partial.lastLowMoodDaysAgo,
      weakStatLabel: partial.weakStatLabel,
    });

  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  try {
    const admin = supabaseAdmin();
    const day = dayOfProtocol(new Date());
    const phase = phaseForDay(day);

    const [{ data: savingsRows }, { data: validatedRows }, { data: prRows }, { data: historyRows }] =
      await Promise.all([
        admin.from("savings").select("amount"),
        admin.from("journal_validated").select("date"),
        admin
          .from("records")
          .select("movement_key, value, date")
          .eq("is_pr", true)
          .order("date", { ascending: false })
          .limit(1),
        admin
          .from("comms_messages")
          .select("author, text, mood")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    const savingsTotal = (savingsRows ?? []).reduce((s, e) => s + (e.amount as number), 0);
    const journalValidatedDays = (validatedRows ?? []).length;
    const lastPr = (prRows ?? [])[0];
    const lastRecordLabel = lastPr
      ? `${movementByKey(lastPr.movement_key as string)?.label ?? lastPr.movement_key} ${formatRecordValue(movementByKey(lastPr.movement_key as string)!.unit, lastPr.value as number)}`
      : null;
    const history = (historyRows ?? [])
      .reverse()
      .map((m) => ({
        author: m.author as CommsAuthor,
        text: m.text as string,
        mood: (m.mood as number) ?? undefined,
      }));

    const context: CommsAiContext = {
      score: totalScore(await xpByStat()),
      streakDays: await computeStreak(),
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

    const replies = await callCommsAi(text, mood, context);
    if (!replies?.length) return fallback();
    return replies;
  } catch {
    return fallback();
  }
}

// ── Reset ────────────────────────────────────────────────────

export async function resetProtocol(): Promise<void> {
  const { error } = await supabaseAdmin().rpc("reset_ascent_protocol");
  bail(error);
}

// ── Profil, pesées, séries ───────────────────────────────────

const DEFAULT_PROFILE: OperatorProfile = {
  heightCm: null,
  birthdate: null,
  equipment: "gym",
  goal: "hybride-hyrox",
  constraints: null,
  timeBudgetMin: 60,
};

export async function getProfile(): Promise<OperatorProfile> {
  const { data, error } = await supabaseAdmin()
    .from("operator_profile")
    .select("height_cm, birthdate, equipment, goal, constraints, time_budget_min")
    .eq("id", 1)
    .maybeSingle();
  bail(error);
  if (!data) return DEFAULT_PROFILE;
  return {
    heightCm: data.height_cm,
    birthdate: data.birthdate,
    equipment: data.equipment as Equipment,
    goal: data.goal as Goal,
    constraints: data.constraints,
    timeBudgetMin: data.time_budget_min,
  };
}

export async function setProfile(
  patch: Partial<OperatorProfile>,
): Promise<OperatorProfile> {
  const current = await getProfile();
  const next = { ...current, ...patch };
  const { error } = await supabaseAdmin().from("operator_profile").upsert({
    id: 1,
    height_cm: next.heightCm,
    birthdate: next.birthdate,
    equipment: next.equipment,
    goal: next.goal,
    constraints: next.constraints,
    time_budget_min: next.timeBudgetMin,
    updated_at: new Date().toISOString(),
  });
  bail(error);
  return next;
}

export async function listWeighIns(): Promise<WeighIn[]> {
  const { data, error } = await supabaseAdmin()
    .from("weigh_ins")
    .select("date, weight_kg")
    .order("date", { ascending: false });
  bail(error);
  return (data ?? []).map((w) => ({ date: w.date, weightKg: Number(w.weight_kg) }));
}

export async function addWeighIn(date: string, weightKg: number): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("weigh_ins")
    .upsert({ date, weight_kg: weightKg }, { onConflict: "date" });
  bail(error);
}

export async function listSetLogs(days = 120): Promise<SetLog[]> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await supabaseAdmin()
    .from("set_logs")
    .select("id, run_id, exercise_key, set_index, weight_kg, reps, rpe, date")
    .gte("date", since)
    .order("date", { ascending: false });
  bail(error);
  return (data ?? []).map((s) => ({
    id: s.id,
    runId: s.run_id,
    exerciseKey: s.exercise_key,
    setIndex: s.set_index,
    weightKg: Number(s.weight_kg),
    reps: s.reps,
    rpe: s.rpe,
    date: s.date,
  }));
}

export async function saveSetLogs(
  runId: string,
  exerciseKey: string,
  date: string,
  sets: { weightKg: number; reps: number; rpe?: number | null }[],
): Promise<void> {
  const admin = supabaseAdmin();
  // Idempotent : on remplace les séries de cet exercice pour ce run, pour
  // qu'une correction en cours de séance ne crée pas de doublons.
  const { error: e1 } = await admin
    .from("set_logs")
    .delete()
    .eq("run_id", runId)
    .eq("exercise_key", exerciseKey);
  bail(e1);

  const rows = sets
    .filter((s) => s.weightKg > 0 && s.reps > 0)
    .map((s, i) => ({
      run_id: runId,
      exercise_key: exerciseKey,
      set_index: i,
      weight_kg: s.weightKg,
      reps: s.reps,
      rpe: s.rpe ?? null,
      date,
    }));
  if (rows.length === 0) return;

  const { error: e2 } = await admin.from("set_logs").insert(rows);
  bail(e2);
}

// ── Scans corporels ──────────────────────────────────────────
// Bucket Storage PRIVÉ (créé en migration) — jamais d'URL publique, toujours
// une URL signée à durée de vie courte générée ici, côté serveur.

const SCANS_BUCKET = "body-scans";

function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Format d'image invalide");
  return { buffer: Buffer.from(match[2], "base64"), contentType: match[1] };
}

function rowToBodyScan(r: Record<string, unknown>, url: string): BodyScan {
  return {
    id: r.id as number,
    date: r.date as string,
    angle: r.angle as ScanAngle,
    url,
    createdAt: r.created_at as string,
  };
}

export async function listBodyScans(): Promise<BodyScan[]> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("body_scans")
    .select("id, date, angle, storage_path, created_at")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  bail(error);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: signed, error: e2 } = await admin.storage
    .from(SCANS_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path as string),
      3600,
    );
  bail(e2);

  const urlByPath = new Map(
    (signed ?? []).map((s) => [s.path ?? "", s.signedUrl]),
  );
  return rows.map((r) =>
    rowToBodyScan(r, urlByPath.get(r.storage_path as string) ?? ""),
  );
}

export async function addBodyScan(
  date: string,
  angle: ScanAngle,
  dataUrl: string,
): Promise<BodyScan> {
  const admin = supabaseAdmin();
  const { buffer, contentType } = parseDataUrl(dataUrl);
  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `${date}/${angle}-${Date.now()}.${ext}`;

  const { error: e1 } = await admin.storage
    .from(SCANS_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  bail(e1);

  const { data: inserted, error: e2 } = await admin
    .from("body_scans")
    .insert({ date, angle, storage_path: path })
    .select("id, date, angle, storage_path, created_at")
    .single();
  bail(e2);

  const { data: signed, error: e3 } = await admin.storage
    .from(SCANS_BUCKET)
    .createSignedUrl(path, 3600);
  bail(e3);

  return rowToBodyScan(inserted!, signed?.signedUrl ?? "");
}

export async function deleteBodyScan(id: number): Promise<void> {
  const admin = supabaseAdmin();
  const { data: row, error: e1 } = await admin
    .from("body_scans")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  bail(e1);
  if (!row) return;

  const { error: e2 } = await admin.storage
    .from(SCANS_BUCKET)
    .remove([row.storage_path as string]);
  bail(e2);
  const { error: e3 } = await admin.from("body_scans").delete().eq("id", id);
  bail(e3);
}
