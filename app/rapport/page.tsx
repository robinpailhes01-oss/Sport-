"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { HUD_EASE, Rise, Stagger } from "@/components/motion/primitives";
import { AnalystInsignia } from "@/components/game/analyst-badge";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { ANALYST, buildReport, type Report } from "@/lib/engine/analyst";
import { phaseForDay } from "@/lib/engine/season";
import type { AvatarState } from "@/lib/engine/types";

export default function RapportPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      const [av, weekly, journal, savings, records] = await Promise.all([
        db().getAvatar(),
        db().getWeeklyXp(10),
        db().getJournal(14),
        db().getSavings(),
        db().listRecords(),
      ]);
      setAvatar(av);
      setReport(
        buildReport({
          weekly,
          journal,
          savingsTotal: savings.total,
          savingsEntries: savings.entries,
          records,
          day: av.dayIndex,
          phase: phaseForDay(av.dayIndex),
        }),
      );
    })();
  }, []);

  if (!avatar || !report) return <main className="min-h-dvh" />;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="space-y-4">
        {/* ── L'ANALYSTE ── */}
        <Rise>
          <Panel tone="volt" className="p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 pt-0.5">
                <AnalystInsignia />
              </div>
              <div className="min-w-0">
                <p className="hud-label mb-0.5 text-volt">
                  {ANALYST.codename} — débrief
                </p>
                <p className="font-display text-lg font-bold uppercase tracking-wider">
                  {ANALYST.name}
                </p>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3, ease: HUD_EASE }}
                  className="mt-2 text-sm leading-snug text-ink"
                >
                  {report.headline}
                </motion.p>
              </div>
            </div>
          </Panel>
        </Rise>

        {/* ── SECTIONS ── */}
        {report.sections.map((section) => (
          <Rise key={section.title}>
            <Panel className="p-4">
              <p className="hud-label mb-3">{section.title}</p>
              <ul className="space-y-1.5">
                {section.lines.map((line) => (
                  <li
                    key={line}
                    className="text-xs leading-relaxed text-ink-dim"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </Panel>
          </Rise>
        ))}

        {/* ── DIRECTIVE ── */}
        <Rise>
          <Panel tone="volt" className="p-4">
            <p className="hud-label mb-2 text-volt">Directive de la semaine</p>
            <p className="text-sm leading-snug text-ink">{report.directive}</p>
            <p className="mt-2 font-mono text-[10px] tracking-micro text-ink-mute">
              — {ANALYST.name.toUpperCase()}, SUR LA BASE DE TON LEDGER
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
