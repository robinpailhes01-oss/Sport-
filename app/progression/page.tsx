"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { WeeklyBars } from "@/components/game/weekly-bars";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { coachForType } from "@/lib/engine/coaches";
import { WEEK_PROTOCOL } from "@/lib/engine/program";
import { TARGETS } from "@/lib/engine/targets";
import {
  STAT_KEYS,
  STATS,
  type AvatarState,
  type StatKey,
  type WorkoutTemplate,
} from "@/lib/engine/types";
import { cn, formatXp } from "@/lib/utils";

const WEEKS = 10;

export default function ProgressionPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [weekly, setWeekly] = useState<Record<StatKey, number[]> | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  useEffect(() => {
    db().getAvatar().then(setAvatar);
    db().getWeeklyXp(WEEKS).then(setWeekly);
    db().listTemplates().then(setTemplates);
  }, []);

  if (!avatar || !weekly) return <main className="min-h-dvh" />;

  const bySlug = new Map(templates.map((t) => [t.slug, t]));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="space-y-4">
        <Rise>
          <p className="hud-label mb-1">Vue d&apos;ensemble</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Progression
          </h1>
        </Rise>

        {/* ── ÉVOLUTION 10 SEMAINES ── */}
        <Rise>
          <Panel tone="volt" className="space-y-5 p-4">
            <div className="flex items-baseline justify-between">
              <p className="hud-label">XP hebdo — {WEEKS} semaines</p>
              <p className="font-mono text-[10px] tracking-micro text-ink-mute">
                SEMAINE COURANTE EN VOLT
              </p>
            </div>
            {STAT_KEYS.map((key, i) => {
              const state = avatar.stats[key];
              const values = weekly[key];
              const thisWeek = values[values.length - 1];
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="font-display text-xs font-bold uppercase tracking-wider">
                      <span className="mr-1.5" aria-hidden>
                        {STATS[key].glyph}
                      </span>
                      {STATS[key].label}
                      <span className="ml-2 font-mono text-[10px] font-normal text-ink-mute">
                        LV {state.level}
                      </span>
                    </span>
                    <span className="font-mono text-xs font-bold text-volt tabular">
                      +{formatXp(thisWeek)} XP
                    </span>
                  </div>
                  <WeeklyBars values={values} delay={0.2 + i * 0.1} />
                </div>
              );
            })}
          </Panel>
        </Rise>

        {/* ── PROTOCOLE HEBDO ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Protocole hebdo — semaine type</p>
            <ul className="divide-y divide-line/60">
              {WEEK_PROTOCOL.map((plan) => {
                const tpl = bySlug.get(plan.templateSlug);
                const alt = plan.altTemplateSlug
                  ? bySlug.get(plan.altTemplateSlug)
                  : null;
                const coach = tpl ? coachForType(tpl.type) : null;
                return (
                  <li key={plan.day} className="flex items-center gap-3 py-2.5">
                    <span className="w-9 shrink-0 font-mono text-[10px] tracking-micro text-ink-mute">
                      {plan.dayShort}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-xs font-bold uppercase tracking-wide">
                        {tpl?.title}
                        {alt && (
                          <span className="text-ink-mute"> / {alt.title}</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-dim">
                        {plan.intent}
                      </p>
                    </div>
                    {coach && (
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[9px] tracking-micro",
                          coach.accent === "danger"
                            ? "text-danger/80"
                            : "text-zone2/80",
                        )}
                      >
                        {coach.monogram}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </Rise>

        {/* ── OBJECTIFS DE SAISON ── */}
        <Rise>
          <Panel className="p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="hud-label">Objectifs de saison</p>
              <p className="font-mono text-[10px] tracking-micro text-ink-mute">
                &lt; 70 KG · HYBRIDE
              </p>
            </div>
            <div className="space-y-4">
              {STAT_KEYS.map((key) => {
                const targets = TARGETS.filter((t) => t.stat === key);
                if (targets.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-ink-dim">
                      <span className="mr-1.5" aria-hidden>
                        {STATS[key].glyph}
                      </span>
                      {STATS[key].label}
                    </p>
                    <ul className="space-y-1">
                      {targets.map((t) => (
                        <li
                          key={t.label}
                          className="flex items-baseline justify-between gap-3 text-xs"
                        >
                          <span className="text-ink-dim">{t.label}</span>
                          <span className="shrink-0 font-mono font-bold text-ink tabular">
                            {t.current ?? "—"}{" "}
                            <span className="text-ink-mute">→</span>{" "}
                            <span className="text-volt">{t.target}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-line/60 pt-3 font-mono text-[10px] leading-relaxed tracking-wide text-ink-mute">
              BASELINES « — » À CALIBRER : TEST 1RM, TIME TRIAL 5K, ROW 2K.
            </p>
          </Panel>
        </Rise>

        <Rise className="pt-2">
          <Link href="/" className="block">
            <Button variant="ghost" size="md" className="w-full" tabIndex={-1}>
              ← Retour au QG
            </Button>
          </Link>
        </Rise>
      </Stagger>
    </main>
  );
}
