"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { WeekProtocolList } from "@/components/game/week-protocol-list";
import { WeeklyBars } from "@/components/game/weekly-bars";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { PROTOCOL_NOTES, weekdayIndex } from "@/lib/engine/program";
import {
  HABIT_TARGETS,
  MOVEMENTS,
  bestOf,
  formatRecordValue,
} from "@/lib/engine/records";
import {
  STAT_KEYS,
  STATS,
  type AvatarState,
  type PersonalRecord,
  type StatKey,
  type WorkoutTemplate,
} from "@/lib/engine/types";
import { formatXp } from "@/lib/utils";

const WEEKS = 10;

export default function ProgressionPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [weekly, setWeekly] = useState<Record<StatKey, number[]> | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);

  useEffect(() => {
    db().getAvatar().then(setAvatar);
    db().getWeeklyXp(WEEKS).then(setWeekly);
    db().listTemplates().then(setTemplates);
    db().listRecords().then(setRecords);
  }, []);

  if (!avatar || !weekly) return <main className="min-h-dvh" />;

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
            <WeekProtocolList
              templates={templates}
              highlightDay={weekdayIndex(new Date())}
            />
            <ul className="mt-3 space-y-1.5 border-t border-line/60 pt-3">
              {PROTOCOL_NOTES.map((note) => (
                <li
                  key={note}
                  className="text-[11px] leading-relaxed text-ink-mute"
                >
                  <span className="mr-1.5 text-volt/70">▸</span>
                  {note}
                </li>
              ))}
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
                const movements = MOVEMENTS.filter((m) => m.stat === key);
                const habits = HABIT_TARGETS.filter((h) => h.stat === key);
                if (movements.length === 0 && habits.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-ink-dim">
                      <span className="mr-1.5" aria-hidden>
                        {STATS[key].glyph}
                      </span>
                      {STATS[key].label}
                    </p>
                    <ul className="space-y-1">
                      {movements.map((m) => {
                        const best = bestOf(
                          m,
                          records
                            .filter((r) => r.movementKey === m.key)
                            .map((r) => r.value),
                        );
                        return (
                          <li
                            key={m.key}
                            className="flex items-baseline justify-between gap-3 text-xs"
                          >
                            <span className="text-ink-dim">{m.label}</span>
                            <span className="shrink-0 font-mono font-bold text-ink tabular">
                              {best !== null
                                ? formatRecordValue(m.unit, best)
                                : "—"}{" "}
                              <span className="text-ink-mute">→</span>{" "}
                              <span className="text-volt">{m.targetLabel}</span>
                            </span>
                          </li>
                        );
                      })}
                      {habits.map((h) => (
                        <li
                          key={h.label}
                          className="flex items-baseline justify-between gap-3 text-xs"
                        >
                          <span className="text-ink-dim">{h.label}</span>
                          <span className="shrink-0 font-mono font-bold text-volt tabular">
                            {h.target}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <Link
              href="/records"
              className="mt-4 block border-t border-line/60 pt-3 font-mono text-[10px] tracking-micro text-ink-mute transition-colors hover:text-ink-dim"
            >
              LES VALEURS COURANTES VIENNENT DU LIVRE DES RECORDS →
            </Link>
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
