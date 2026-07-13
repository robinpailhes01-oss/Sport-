"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { HUD_EASE, Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import {
  HABITS,
  SAVINGS_GOAL,
  SAVINGS_XP,
  formatEuro,
} from "@/lib/engine/habits";
import { STATS, type AvatarState, type SavingsEntry } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const GRID_DAYS = 14;

function isoDay(offset: number): string {
  return new Date(Date.now() - offset * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
}

export default function JournalPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [journal, setJournal] = useState<Record<string, string[]>>({});
  const [savings, setSavings] = useState<{
    total: number;
    entries: SavingsEntry[];
  } | null>(null);
  const [amount, setAmount] = useState("");

  const today = isoDay(0);
  const checkedToday = journal[today] ?? [];

  useEffect(() => {
    db().getAvatar().then(setAvatar);
    db().getJournal(GRID_DAYS).then(setJournal);
    db().getSavings().then(setSavings);
  }, []);

  async function toggle(habitKey: string) {
    const day = await db().toggleHabit(today, habitKey);
    setJournal((prev) => ({ ...prev, [today]: day }));
  }

  const parsedAmount = useMemo(() => {
    const n = Number(amount.replace(",", "."));
    return amount.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
  }, [amount]);

  async function deposit() {
    if (parsedAmount === null) return;
    await db().addSaving(parsedAmount, today);
    setSavings(await db().getSavings());
    setAmount("");
  }

  if (!avatar || !savings) return <main className="min-h-dvh" />;

  const pct = Math.min(1, savings.total / SAVINGS_GOAL);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="space-y-4">
        <Rise>
          <p className="hud-label mb-1">Les essentiels, chaque jour</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Journal
          </h1>
        </Rise>

        {/* ── HABITUDES DU JOUR ── */}
        <Rise>
          <Panel tone="volt" className="space-y-2 p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="hud-label">Aujourd&apos;hui</p>
              <p className="font-mono text-[10px] tracking-micro text-ink-mute">
                {checkedToday.length}/{HABITS.length}
              </p>
            </div>
            {HABITS.map((habit) => {
              const checked = checkedToday.includes(habit.key);
              return (
                <motion.button
                  key={habit.key}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggle(habit.key)}
                  className={cn(
                    "flex w-full items-center gap-3 border p-3.5 text-left transition-colors",
                    checked
                      ? "border-volt/50 bg-volt-faint"
                      : "border-line hover:border-line-bright",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[10px] font-bold",
                      checked
                        ? "border-volt bg-volt text-void"
                        : "border-line-bright text-ink-mute",
                    )}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span className="text-lg" aria-hidden>
                    {habit.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-display text-sm font-bold uppercase tracking-wide",
                        checked && "text-volt",
                      )}
                    >
                      {habit.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-dim">{habit.blurb}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-ink-mute tabular">
                    +{habit.xp} {STATS[habit.stat].glyph}
                  </span>
                </motion.button>
              );
            })}
          </Panel>
        </Rise>

        {/* ── ÉPARGNE ── */}
        <Rise>
          <Panel className="space-y-3 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="hud-label">💰 Épargne — objectif</p>
              <p className="font-mono text-[10px] tracking-micro text-ink-mute">
                +{SAVINGS_XP} XP / DÉPÔT
              </p>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="font-display text-2xl font-bold text-volt text-glow-volt tabular">
                {formatEuro(savings.total)}
              </p>
              <p className="font-mono text-xs text-ink-dim tabular">
                / {formatEuro(SAVINGS_GOAL)}
              </p>
            </div>
            <div className="h-1.5 w-full bg-line/60">
              <motion.div
                className="h-full bg-gradient-to-r from-volt-dim to-volt shadow-glow-volt-sm"
                initial={{ width: 0 }}
                animate={{ width: `${pct * 100}%` }}
                transition={{ duration: 1, ease: HUD_EASE, delay: 0.3 }}
              />
            </div>
            <div className="flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="250"
                className="h-11 min-w-0 flex-1 border border-line bg-void px-3 font-mono text-sm text-ink tabular outline-none transition-colors placeholder:text-ink-mute focus:border-volt"
              />
              <Button size="md" disabled={parsedAmount === null} onClick={deposit}>
                Mettre de côté
              </Button>
            </div>
            {savings.entries.length > 0 && (
              <ul className="space-y-1 border-t border-line/60 pt-2">
                {savings.entries.slice(0, 5).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-baseline justify-between text-xs"
                  >
                    <span className="font-mono text-[11px] uppercase text-ink-mute tabular">
                      {new Date(`${entry.date}T00:00:00`)
                        .toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
                        .replace(".", "")}
                    </span>
                    <span className="font-mono font-bold text-ink-dim tabular">
                      +{formatEuro(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Rise>

        {/* ── GRILLE 14 JOURS ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Régularité — {GRID_DAYS} jours</p>
            <div className="space-y-2">
              {HABITS.map((habit) => (
                <div key={habit.key} className="flex items-center gap-2">
                  <span className="w-5 text-center text-sm" aria-hidden>
                    {habit.glyph}
                  </span>
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: GRID_DAYS }, (_, i) => {
                      const date = isoDay(GRID_DAYS - 1 - i);
                      const done = (journal[date] ?? []).includes(habit.key);
                      const isToday = date === today;
                      return (
                        <div
                          key={date}
                          className={cn(
                            "h-4 flex-1",
                            done
                              ? isToday
                                ? "bg-volt shadow-glow-volt-sm"
                                : "bg-volt/45"
                              : "bg-line/50",
                            isToday && !done && "border border-line-bright",
                          )}
                          title={date}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
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
