"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { AnalystInsignia } from "@/components/game/analyst-badge";
import { CoachBadge } from "@/components/game/coach-badge";
import { Counter } from "@/components/game/counter";
import { StatRadar } from "@/components/game/stat-radar";
import { StatRow } from "@/components/game/stat-row";
import { WeekStrip } from "@/components/game/week-strip";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { buildReport } from "@/lib/engine/analyst";
import { COACHES, coachForType } from "@/lib/engine/coaches";
import { HABITS, SAVINGS_GOAL, formatEuro } from "@/lib/engine/habits";
import {
  planForDayIndex,
  weekdayIndex,
  type DayPlan,
} from "@/lib/engine/program";
import { PROTOCOL_DAYS, phaseForDay } from "@/lib/engine/season";
import {
  STAT_KEYS,
  STATS,
  type AvatarState,
  type Run,
  type WorkoutTemplate,
} from "@/lib/engine/types";
import { cn, formatXp } from "@/lib/utils";

export default function DashboardPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [mission, setMission] = useState<{
    plan: DayPlan;
    template: WorkoutTemplate;
    todayIsSea: boolean;
    shifted: boolean;
  } | null>(null);
  const [journalToday, setJournalToday] = useState<string[]>([]);
  const [savingsTotal, setSavingsTotal] = useState(0);
  const [analystHeadline, setAnalystHeadline] = useState<string | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  // La mission du jour glisse d'un cran par jour de mer déclaré cette semaine —
  // le protocole reprend là où il s'est arrêté, le streak ne bouge pas.
  async function refreshMission() {
    const now = new Date();
    const weekday = weekdayIndex(now);
    const seaDays = await db().listSeaDays();
    const monday = new Date(now);
    monday.setDate(now.getDate() - weekday);
    const mondayIso = monday.toISOString().slice(0, 10);
    const todayIsSea = seaDays.includes(todayIso);
    const seaBefore = seaDays.filter(
      (d) => d >= mondayIso && d < todayIso,
    ).length;
    const planIndex = Math.max(0, weekday - seaBefore);
    const plan = planForDayIndex(planIndex, now);
    const template = await db().getTemplateBySlug(plan.resolvedSlug);
    if (template)
      setMission({ plan, template, todayIsSea, shifted: seaBefore > 0 });
  }

  useEffect(() => {
    db().getAvatar().then(setAvatar);
    db().getActiveRun().then(setActiveRun);
    db()
      .getJournal(1)
      .then((j) => setJournalToday(j[todayIso] ?? []));
    db()
      .getSavings()
      .then((s) => setSavingsTotal(s.total));
    // le débrief d'Oracle, calculé sur le ledger local
    (async () => {
      const [av, weekly, journal, savings, records] = await Promise.all([
        db().getAvatar(),
        db().getWeeklyXp(10),
        db().getJournal(14),
        db().getSavings(),
        db().listRecords(),
      ]);
      const report = buildReport({
        weekly,
        journal,
        savingsTotal: savings.total,
        savingsEntries: savings.entries,
        records,
        day: av.dayIndex,
        phase: phaseForDay(av.dayIndex),
      });
      setAnalystHeadline(report.headline);
    })();
    refreshMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleSea() {
    await db().toggleSeaDay(todayIso);
    await refreshMission();
  }

  async function toggleHabit(key: string) {
    const day = await db().toggleHabit(todayIso, key);
    setJournalToday(day);
    db().getAvatar().then(setAvatar);
  }

  if (!avatar) return <main className="min-h-dvh" />;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="space-y-4">
        {/* ── AVATAR ── */}
        <Rise>
          <Panel tone="volt" className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="hud-label mb-1">Opérateur</p>
                <p className="font-display text-xl font-bold tracking-wider">
                  {avatar.callsign}
                </p>
              </div>
              <div className="text-right">
                <p className="hud-label mb-1">Niveau total</p>
                <p className="font-display text-4xl font-bold leading-none text-volt text-glow-volt">
                  <Counter value={avatar.totalLevel} duration={1.4} />
                </p>
              </div>
            </div>
            <div className="mt-2">
              <StatRadar stats={avatar.stats} />
            </div>
          </Panel>
        </Rise>

        {/* ── RUN EN COURS / MISSION DU JOUR ── */}
        <Rise>
          {activeRun ? (
            <Link
              href={activeRun.status === "active" ? `/run/${activeRun.id}` : "/run/new"}
              className="block"
            >
              <Panel tone="danger" className="flex items-center justify-between p-4">
                <div>
                  <p className="hud-label mb-1 text-danger">
                    Run {activeRun.status === "active" ? "en cours" : "armé"}
                  </p>
                  <p className="font-display text-sm font-bold uppercase tracking-wider">
                    Reprendre le run →
                  </p>
                </div>
                <span className="h-2 w-2 animate-pulse-live rounded-full bg-danger" />
              </Panel>
            </Link>
          ) : mission?.todayIsSea ? (
            <Panel className="space-y-3 border-zone2/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="hud-label mb-1 text-zone2">Jour de mer — off assumé</p>
                  <p className="font-display text-lg font-bold uppercase tracking-wider">
                    ⚓ En mer, Capitaine
                  </p>
                  <p className="mt-0.5 text-xs text-ink-dim">
                    Zéro culpabilité. Demain : {mission.template.title} — le
                    protocole reprend où il s&apos;est arrêté.
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full" onClick={toggleSea}>
                Finalement je m&apos;entraîne — annuler
              </Button>
            </Panel>
          ) : mission ? (
            <Panel tone="volt" className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="hud-label mb-1">
                    Mission du jour
                    {mission.shifted && (
                      <span className="text-zone2"> — décalée (mer)</span>
                    )}
                  </p>
                  <p className="font-display text-lg font-bold uppercase tracking-wider">
                    {mission.template.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-dim">
                    {mission.plan.intent}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 pt-1 font-mono text-[9px] tracking-micro",
                    coachForType(mission.template.type).accent === "danger"
                      ? "text-danger/80"
                      : "text-zone2/80",
                  )}
                >
                  {coachForType(mission.template.type).codename}
                </span>
              </div>
              <div className="mb-1">
                <WeekStrip todayIndex={weekdayIndex(new Date())} />
              </div>
              <Link href={`/run/new?tpl=${mission.template.slug}`} className="block">
                <Button size="lg" tabIndex={-1}>
                  Lancer la mission
                </Button>
              </Link>
              <div className="flex items-center justify-between">
                <Link
                  href="/run/new"
                  className="font-mono text-[10px] tracking-micro text-ink-mute hover:text-ink-dim"
                >
                  AUTRE RUN →
                </Link>
                <button
                  type="button"
                  onClick={toggleSea}
                  className="font-mono text-[10px] tracking-micro text-zone2/80 transition-colors hover:text-zone2"
                >
                  ⚓ JOURNÉE EN MER
                </button>
              </div>
            </Panel>
          ) : (
            <Link href="/run/new" className="block">
              <Button size="lg" tabIndex={-1}>
                Lancer un run
              </Button>
            </Link>
          )}
        </Rise>

        {/* ── JOURNAL DU JOUR ── */}
        <Rise>
          <Panel className="space-y-3 p-4">
            <div className="flex items-baseline justify-between">
              <p className="hud-label">Journal du jour</p>
              <Link
                href="/journal"
                className="font-mono text-[10px] tracking-micro text-ink-mute transition-colors hover:text-ink-dim"
              >
                TOUT VOIR →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {HABITS.map((habit) => {
                const checked = journalToday.includes(habit.key);
                return (
                  <button
                    key={habit.key}
                    type="button"
                    onClick={() => toggleHabit(habit.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 border py-2.5 transition-colors",
                      checked
                        ? "border-volt/50 bg-volt-faint"
                        : "border-line hover:border-line-bright",
                    )}
                  >
                    <span className="text-base" aria-hidden>
                      {habit.glyph}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[9px] tracking-micro",
                        checked ? "text-volt" : "text-ink-mute",
                      )}
                    >
                      {habit.label.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
            <Link href="/journal" className="block">
              <div className="flex items-baseline justify-between">
                <span className="hud-label">💰 Épargne</span>
                <span className="font-mono text-[11px] font-bold text-ink-dim tabular">
                  <span className="text-volt">{formatEuro(savingsTotal)}</span> /{" "}
                  {formatEuro(SAVINGS_GOAL)}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full bg-line/60">
                <div
                  className="h-full bg-volt/80"
                  style={{
                    width: `${Math.min(1, savingsTotal / SAVINGS_GOAL) * 100}%`,
                  }}
                />
              </div>
            </Link>
          </Panel>
        </Rise>

        {/* ── LES 5 STATS ── */}
        <Rise>
          <Panel className="px-4 py-2">
            <div className="divide-y divide-line/60">
              {STAT_KEYS.map((key, i) => (
                <StatRow
                  key={key}
                  statKey={key}
                  state={avatar.stats[key]}
                  delay={0.3 + i * 0.1}
                />
              ))}
            </div>
          </Panel>
        </Rise>

        {/* ── ORACLE — DÉBRIEF ── */}
        {analystHeadline && (
          <Rise>
            <Link href="/rapport" className="block">
              <Panel className="flex items-start gap-3 p-4">
                <div className="shrink-0 pt-0.5">
                  <AnalystInsignia size={36} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="hud-label mb-1 text-volt">
                    Oracle — débrief prêt
                  </p>
                  <p className="text-xs leading-snug text-ink-dim">
                    {analystHeadline}
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] tracking-micro text-ink-mute">
                    RAPPORT COMPLET →
                  </p>
                </div>
              </Panel>
            </Link>
          </Rise>
        )}

        {/* ── LIENS PROGRESSION / RECORDS / COMMS ── */}
        <Rise>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/progression" className="block">
              <Panel className="p-3">
                <p className="hud-label mb-1">Vue</p>
                <p className="font-display text-xs font-bold uppercase tracking-wider">
                  Progression →
                </p>
              </Panel>
            </Link>
            <Link href="/records" className="block">
              <Panel className="p-3">
                <p className="hud-label mb-1">PRs</p>
                <p className="font-display text-xs font-bold uppercase tracking-wider">
                  Records →
                </p>
              </Panel>
            </Link>
            <Link href="/comms" className="block">
              <Panel className="p-3">
                <p className="hud-label mb-1">Agents</p>
                <p className="font-display text-xs font-bold uppercase tracking-wider">
                  Comms →
                </p>
              </Panel>
            </Link>
          </div>
        </Rise>

        {/* ── HANDLERS ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Handlers — ils signent tes programmes</p>
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              <CoachBadge coach={COACHES.goggins} />
              <CoachBadge coach={COACHES.robbins} />
            </div>
          </Panel>
        </Rise>

        {/* ── FEED ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Log récent</p>
            <ul className="space-y-2.5">
              {avatar.recentEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-baseline justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 truncate text-ink-dim">
                    <span className="mr-1.5" aria-hidden>
                      {STATS[event.stat].glyph}
                    </span>
                    {event.reason}
                  </span>
                  <span className="shrink-0 font-mono font-bold text-volt tabular">
                    +{formatXp(event.amount)} XP
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </Rise>

        {/* ── PROTOCOLE 90 JOURS ── */}
        <Rise>
          <Panel className="p-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="hud-label">
                Protocole 90 jours —{" "}
                <span className="text-volt">
                  {phaseForDay(avatar.dayIndex).name}
                </span>
              </p>
              <p className="font-mono text-[10px] tracking-micro text-ink-mute">
                JOUR{" "}
                <span className="text-ink">{avatar.dayIndex}</span>/
                {PROTOCOL_DAYS}
              </p>
            </div>
            <div className="mb-2 h-1 w-full bg-line/60">
              <div
                className="h-full bg-volt shadow-glow-volt-sm"
                style={{ width: `${(avatar.dayIndex / PROTOCOL_DAYS) * 100}%` }}
              />
            </div>
            <p className="text-xs text-ink-dim">
              {phaseForDay(avatar.dayIndex).focus}
            </p>
            <p className="mt-1.5 font-mono text-[10px] tracking-micro text-ink-mute">
              BOSS · JOUR 90 : RETEST COMPLET DES PRS
            </p>
          </Panel>
        </Rise>
      </Stagger>
    </main>
  );
}
