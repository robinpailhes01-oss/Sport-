"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HUD_EASE, Rise, Stagger } from "@/components/motion/primitives";
import { ModifierCard } from "@/components/game/modifier-card";
import { RiskSelector } from "@/components/game/risk-selector";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import {
  STATS,
  WORKOUT_TYPE_LABELS,
  type Run,
  type WorkoutTemplate,
} from "@/lib/engine/types";
import { cn } from "@/lib/utils";

export default function NewRunPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [selected, setSelected] = useState<WorkoutTemplate | null>(null);
  const [riskTier, setRiskTier] = useState(0);
  const [run, setRun] = useState<Run | null>(null);
  const [engaging, setEngaging] = useState(false);

  useEffect(() => {
    db().listTemplates().then(setTemplates);
  }, []);

  async function roll() {
    if (!selected) return;
    const rolled = run
      ? await db().rerollRun(run.id)
      : await db().rollRun(selected.id, riskTier);
    // force le remount des cartes pour rejouer l'animation de tirage
    setRun({ ...rolled, modifiers: [...rolled.modifiers] });
  }

  async function engage() {
    if (!run) return;
    setEngaging(true);
    await db().startRun(run.id);
    router.push(`/run/${run.id}`);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar />

      <Stagger className="space-y-6">
        <Rise>
          <p className="hud-label mb-1">Nouveau run</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Prépare le tirage
          </h1>
        </Rise>

        {/* ── 1. LA SÉANCE ── */}
        <Rise>
          <p className="hud-label mb-3">01 — Séance</p>
          <div className="grid grid-cols-1 gap-2">
            {templates.map((tpl) => {
              const isSelected = selected?.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={!!run}
                  onClick={() => setSelected(tpl)}
                  className={cn(
                    "flex items-center justify-between gap-3 border p-3.5 text-left transition-colors disabled:opacity-40",
                    isSelected
                      ? "border-volt bg-volt-faint shadow-glow-volt-sm"
                      : "border-line hover:border-line-bright",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold uppercase tracking-wide">
                      {tpl.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tracking-micro text-ink-mute">
                      {WORKOUT_TYPE_LABELS[tpl.type].toUpperCase()} · {tpl.durationMin}′
                      · {tpl.baseXp} XP
                    </p>
                  </div>
                  <span className="shrink-0 text-lg" aria-hidden>
                    {STATS[tpl.primaryStat].glyph}
                  </span>
                </button>
              );
            })}
          </div>
        </Rise>

        {/* ── 2. LE RISQUE ── */}
        <Rise>
          <p className="hud-label mb-3">02 — Risk tier</p>
          <fieldset disabled={!!run} className={cn(run && "opacity-40")}>
            <RiskSelector value={riskTier} onChange={setRiskTier} />
          </fieldset>
        </Rise>

        {/* ── 3. LE TIRAGE ── */}
        <Rise>
          <p className="hud-label mb-3">03 — Modifiers</p>
          <AnimatePresence mode="wait">
            {run ? (
              <motion.div
                key={run.modifiers.map((m) => m.id).join("-")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="space-y-2"
              >
                {run.modifiers.map((mod, i) => (
                  <ModifierCard key={mod.id} modifier={mod} index={i} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                exit={{ opacity: 0 }}
                transition={{ ease: HUD_EASE }}
              >
                <Panel className="p-6 text-center">
                  <p className="font-mono text-xs text-ink-mute">
                    Le tirage est scellé jusqu&apos;au roll.
                  </p>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </Rise>

        {/* ── ACTIONS ── */}
        <Rise className="space-y-2 pt-2">
          {!run ? (
            <Button size="lg" disabled={!selected} onClick={roll}>
              Roll
            </Button>
          ) : (
            <>
              <Button size="lg" disabled={engaging} onClick={engage}>
                Engager le run
              </Button>
              <Button variant="ghost" size="md" className="w-full" onClick={roll}>
                Reroll
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={async () => {
              if (run) await db().abandonRun(run.id);
              router.push("/");
            }}
          >
            ← Retour au QG
          </Button>
        </Rise>
      </Stagger>
    </main>
  );
}
