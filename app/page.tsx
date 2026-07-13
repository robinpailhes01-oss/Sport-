"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { CoachBadge } from "@/components/game/coach-badge";
import { Counter } from "@/components/game/counter";
import { StatRadar } from "@/components/game/stat-radar";
import { StatRow } from "@/components/game/stat-row";
import { WeekStrip } from "@/components/game/week-strip";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { COACHES, coachForType } from "@/lib/engine/coaches";
import { planForDate, type DayPlan } from "@/lib/engine/program";
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
  } | null>(null);

  useEffect(() => {
    db().getAvatar().then(setAvatar);
    db().getActiveRun().then(setActiveRun);
    const plan = planForDate(new Date());
    db()
      .getTemplateBySlug(plan.resolvedSlug)
      .then((template) => template && setMission({ plan, template }));
  }, []);

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
          ) : mission ? (
            <Panel tone="volt" className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="hud-label mb-1">
                    Mission du jour — {mission.plan.dayLabel}
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
                <WeekStrip todayIndex={mission.plan.day} />
              </div>
              <Link href={`/run/new?tpl=${mission.template.slug}`} className="block">
                <Button size="lg" tabIndex={-1}>
                  Lancer la mission
                </Button>
              </Link>
              <Link
                href="/run/new"
                className="block text-center font-mono text-[10px] tracking-micro text-ink-mute hover:text-ink-dim"
              >
                AUTRE RUN →
              </Link>
            </Panel>
          ) : (
            <Link href="/run/new" className="block">
              <Button size="lg" tabIndex={-1}>
                Lancer un run
              </Button>
            </Link>
          )}
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

        {/* ── LIEN PROGRESSION ── */}
        <Rise>
          <Link href="/progression" className="block">
            <Panel className="flex items-center justify-between p-4">
              <div>
                <p className="hud-label mb-1">Vue d&apos;ensemble</p>
                <p className="font-display text-sm font-bold uppercase tracking-wider">
                  Progression &amp; objectifs →
                </p>
              </div>
              <span className="font-mono text-xs text-volt tabular">10 SEM</span>
            </Panel>
          </Link>
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

        {/* ── TEASER PHASE 2 ── */}
        <Rise>
          <Panel className="flex items-center justify-between p-4 opacity-50">
            <div>
              <p className="hud-label mb-1">Season 01 — Boss</p>
              <p className="font-display text-sm font-bold uppercase tracking-wider">
                Hyrox
              </p>
            </div>
            <span className="font-mono text-[10px] tracking-micro text-ink-mute">
              🔒 VERROUILLÉ
            </span>
          </Panel>
        </Rise>
      </Stagger>
    </main>
  );
}
