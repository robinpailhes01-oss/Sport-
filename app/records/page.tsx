"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HUD_EASE, Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import {
  MOVEMENTS,
  bestOf,
  formatDelta,
  formatRecordValue,
  parseTimeValue,
  type Movement,
} from "@/lib/engine/records";
import { STATS, type AvatarState, type PersonalRecord } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })
    .replace(".", "");
}

export default function RecordsPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [movement, setMovement] = useState<Movement>(MOVEMENTS[0]);
  const [rawValue, setRawValue] = useState("");
  const [date, setDate] = useState(today());
  const [feedback, setFeedback] = useState<{
    isPr: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    db().getAvatar().then(setAvatar);
    db().listRecords().then(setRecords);
  }, []);

  const parsedValue = useMemo(() => {
    if (movement.unit === "time") return parseTimeValue(rawValue);
    const n = Number(rawValue.replace(",", "."));
    return rawValue.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
  }, [movement, rawValue]);

  async function submit() {
    if (parsedValue === null) return;
    const { record, prevBest } = await db().addRecord(
      movement.key,
      parsedValue,
      date,
    );
    setRecords(await db().listRecords());
    setRawValue("");
    setFeedback(
      record.isPr
        ? {
            isPr: true,
            message: `PR VALIDÉ — ${movement.label} ${formatRecordValue(movement.unit, record.value)} · +40 XP ${STATS[movement.stat].label}`,
          }
        : {
            isPr: false,
            message: `Enregistré. Le PR reste ${prevBest !== null ? formatRecordValue(movement.unit, prevBest) : "—"}.`,
          },
    );
  }

  // Historique groupé par mouvement, du plus récent au plus ancien.
  const byMovement = useMemo(() => {
    return MOVEMENTS.map((m) => {
      const entries = records
        .filter((r) => r.movementKey === m.key)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
      return { movement: m, entries };
    }).filter((g) => g.entries.length > 0);
  }, [records]);

  if (!avatar) return <main className="min-h-dvh" />;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="space-y-4">
        <Rise>
          <p className="hud-label mb-1">Le livre des records</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Records
          </h1>
        </Rise>

        {/* ── NOUVEAU TEST ── */}
        <Rise>
          <Panel tone="volt" className="space-y-4 p-4">
            <p className="hud-label">Nouveau test</p>

            <div className="flex flex-wrap gap-1.5">
              {MOVEMENTS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMovement(m);
                    setRawValue("");
                    setFeedback(null);
                  }}
                  className={cn(
                    "border px-2.5 py-1.5 font-mono text-[10px] tracking-wide transition-colors",
                    m.key === movement.key
                      ? "border-volt bg-volt-faint text-volt"
                      : "border-line text-ink-dim hover:border-line-bright",
                  )}
                >
                  {m.label.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="hud-label mb-1.5 block">
                  {movement.unit === "time"
                    ? "Chrono (mm:ss)"
                    : movement.unit === "kg"
                      ? "Charge (kg)"
                      : movement.unit === "reps"
                        ? "Répétitions"
                        : "Distance (m)"}
                </span>
                <input
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  inputMode={movement.unit === "time" ? "numeric" : "decimal"}
                  placeholder={movement.unit === "time" ? "19:45" : "112.5"}
                  className="h-11 w-full border border-line bg-void px-3 font-mono text-sm text-ink tabular outline-none transition-colors placeholder:text-ink-mute focus:border-volt"
                />
              </label>
              <label className="block">
                <span className="hud-label mb-1.5 block">Date du test</span>
                <input
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full border border-line bg-void px-3 font-mono text-sm text-ink tabular outline-none transition-colors focus:border-volt"
                />
              </label>
            </div>

            <Button
              size="md"
              className="w-full"
              disabled={parsedValue === null}
              onClick={submit}
            >
              Enregistrer le test
            </Button>

            <AnimatePresence>
              {feedback && (
                <motion.p
                  key={feedback.message}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: HUD_EASE }}
                  className={cn(
                    "border px-3 py-2 font-mono text-[11px] tracking-wide",
                    feedback.isPr
                      ? "border-volt/50 bg-volt-faint text-volt"
                      : "border-line text-ink-dim",
                  )}
                >
                  {feedback.message}
                </motion.p>
              )}
            </AnimatePresence>
          </Panel>
        </Rise>

        {/* ── HISTORIQUE PAR MOUVEMENT ── */}
        {byMovement.map(({ movement: m, entries }) => {
          const best = bestOf(m, entries.map((e) => e.value));
          const desc = [...entries].reverse();
          return (
            <Rise key={m.key}>
              <Panel className="p-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <p className="font-display text-sm font-bold uppercase tracking-wider">
                    <span className="mr-1.5" aria-hidden>
                      {STATS[m.stat].glyph}
                    </span>
                    {m.label}
                  </p>
                  <p className="shrink-0 font-mono text-sm font-bold text-volt text-glow-volt tabular">
                    {best !== null ? formatRecordValue(m.unit, best) : "—"}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {desc.map((entry) => {
                    const idx = entries.indexOf(entry);
                    const prev = idx > 0 ? entries[idx - 1] : null;
                    return (
                      <li
                        key={entry.id}
                        className="flex items-baseline justify-between gap-3 text-xs"
                      >
                        <span className="font-mono text-[11px] uppercase text-ink-mute tabular">
                          {formatDate(entry.date)}
                        </span>
                        <span className="flex items-baseline gap-2">
                          {prev && (
                            <span
                              className={cn(
                                "font-mono text-[10px] tabular",
                                entry.isPr ? "text-volt" : "text-ink-mute",
                              )}
                            >
                              {formatDelta(m.unit, prev.value, entry.value)}
                            </span>
                          )}
                          <span
                            className={cn(
                              "font-mono font-bold tabular",
                              entry.isPr ? "text-ink" : "text-ink-dim",
                            )}
                          >
                            {formatRecordValue(m.unit, entry.value)}
                          </span>
                          {entry.isPr && (
                            <span className="border border-volt/50 px-1 py-px font-mono text-[8px] tracking-micro text-volt">
                              PR
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 border-t border-line/60 pt-2 text-right font-mono text-[10px] tracking-micro text-ink-mute">
                  CIBLE J90 : <span className="text-ink-dim">{m.targetLabel}</span>
                </p>
              </Panel>
            </Rise>
          );
        })}

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
