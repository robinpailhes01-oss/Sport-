"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { HUD_EASE, Rise, Stagger } from "@/components/motion/primitives";
import { CoachLine } from "@/components/game/coach-line";
import { Counter } from "@/components/game/counter";
import { XPBar } from "@/components/game/xp-bar";
import { TopBar } from "@/components/hud/top-bar";
import { ShareButton } from "@/components/share/share-button";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { PROTOCOL_DAYS } from "@/lib/engine/season";
import { coachForType, coachLine, type Coach } from "@/lib/engine/coaches";
import {
  STATS,
  WORKOUT_TYPE_LABELS,
  type AvatarState,
  type Run,
  type StatKey,
  type WorkoutTemplate,
} from "@/lib/engine/types";
import { formatXp } from "@/lib/utils";

export default function RecapPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [debrief, setDebrief] = useState<{ coach: Coach; line: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const r = await db().getRun(params.id);
      if (!r || r.status !== "completed" || !r.outcome) return router.replace("/");
      setRun(r);
      const tpl = await db().getTemplate(r.templateId);
      setTemplate(tpl);
      setAvatar(await db().getAvatar());
      if (tpl) {
        const coach = coachForType(tpl.type);
        setDebrief({
          coach,
          line: coachLine(
            coach.key,
            r.outcome.flawless ? "recap_flawless" : "recap_partial",
          ),
        });
      }
    })();
  }, [params.id, router]);

  if (!run?.outcome || !template || !avatar) return <main className="min-h-dvh" />;

  const { outcome } = run;
  const gains = Object.entries(outcome.xpByStat) as [StatKey, number][];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar />

      <Stagger className="space-y-4">
        {/* ── VERDICT ── */}
        <Rise>
          <div className="py-4 text-center">
            <p className="hud-label mb-2">Run terminé</p>
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: HUD_EASE, delay: 0.2 }}
              className="font-display text-6xl font-bold leading-none text-volt text-glow-volt"
            >
              +<Counter value={outcome.totalXp} duration={1.6} delay={0.4} />
            </motion.p>
            <p className="mt-2 font-mono text-[10px] tracking-micro text-ink-mute">
              XP · {template.title.toUpperCase()}
            </p>
            {outcome.flawless && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5, ease: HUD_EASE }}
                className="mt-3 inline-block border border-volt/50 bg-volt-faint px-3 py-1 font-mono text-[10px] tracking-micro text-volt"
              >
                FLAWLESS RUN
              </motion.p>
            )}
          </div>
        </Rise>

        {/* ── DÉTAIL DU CALCUL ── */}
        <Rise>
          <Panel className="grid grid-cols-3 divide-x divide-line/60 p-0 text-center">
            <div className="p-3">
              <p className="hud-label mb-1">Score</p>
              <p className="font-mono text-lg font-bold text-ink tabular">
                {Math.round(outcome.score * 100)}%
              </p>
            </div>
            <div className="p-3">
              <p className="hud-label mb-1">Multiplier</p>
              <p className="font-mono text-lg font-bold text-volt tabular">
                ×{outcome.multiplier.toFixed(2)}
              </p>
            </div>
            <div className="p-3">
              <p className="hud-label mb-1">RPE</p>
              <p className="font-mono text-lg font-bold text-ink tabular">
                {run.performance?.rpe ?? "—"}
              </p>
            </div>
          </Panel>
        </Rise>

        {/* ── DEBRIEF DU HANDLER ── */}
        {debrief && (
          <Rise>
            <CoachLine
              coach={debrief.coach}
              line={debrief.line}
              label="Debrief"
              delay={1.0}
            />
          </Rise>
        )}

        {/* ── LEVEL UPS ── */}
        {outcome.levelUps.map((lu, i) => (
          <Rise key={lu.stat}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4 + i * 0.25, duration: 0.6, ease: HUD_EASE }}
            >
              <Panel tone="volt" className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    {STATS[lu.stat].glyph}
                  </span>
                  <div>
                    <p className="hud-label mb-0.5 text-volt">Level up</p>
                    <p className="font-display text-sm font-bold uppercase tracking-wider">
                      {STATS[lu.stat].label}
                    </p>
                  </div>
                </div>
                <p className="font-mono text-xl font-bold text-volt text-glow-volt tabular">
                  {lu.from} → {lu.to}
                </p>
              </Panel>
            </motion.div>
          </Rise>
        ))}

        {/* ── GAINS PAR STAT ── */}
        <Rise>
          <Panel className="space-y-4 p-4">
            <p className="hud-label">Gains</p>
            {gains.map(([stat, amount], i) => {
              const state = avatar.stats[stat];
              return (
                <div key={stat}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="font-display text-xs font-bold uppercase tracking-wider">
                      <span className="mr-1.5" aria-hidden>
                        {STATS[stat].glyph}
                      </span>
                      {STATS[stat].label}
                      <span className="ml-2 font-mono text-[10px] font-normal text-ink-mute">
                        LV {state.level}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-bold text-volt tabular">
                      +{formatXp(amount)}
                    </span>
                  </div>
                  <XPBar pct={state.progress.pct} delay={0.8 + i * 0.2} />
                </div>
              );
            })}
          </Panel>
        </Rise>

        {/* ── PARTAGE ── */}
        <Rise>
          <Panel className="space-y-3 p-4">
            <p className="hud-label">Partager la win</p>
            <ShareButton
              payload={{
                kind: "run",
                title: template.title,
                detail: `${WORKOUT_TYPE_LABELS[template.type]} · ${template.durationMin}′`,
                day: avatar.dayIndex,
                totalDays: PROTOCOL_DAYS,
                dateLabel: new Date(
                  run.completedAt ?? Date.now(),
                ).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                }),
              }}
            />
          </Panel>
        </Rise>

        {/* ── RETOUR ── */}
        <Rise className="pt-2">
          <Link href="/" className="block">
            <Button size="lg" tabIndex={-1}>
              Retour au QG
            </Button>
          </Link>
        </Rise>
      </Stagger>
    </main>
  );
}
