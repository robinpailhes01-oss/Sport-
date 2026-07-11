"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { RISK_TIERS } from "@/lib/engine/run-generator";
import type { Run, WorkoutTemplate } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

function useElapsed(startedAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!startedAt) return "00:00";
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function ActiveRunPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [blocksDone, setBlocksDone] = useState<boolean[]>([]);
  const [modifiersHonored, setModifiersHonored] = useState<boolean[]>([]);
  const [rpe, setRpe] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const elapsed = useElapsed(run?.startedAt);

  useEffect(() => {
    (async () => {
      const r = await db().getRun(params.id);
      if (!r) return router.replace("/");
      if (r.status === "completed") return router.replace(`/run/${r.id}/recap`);
      const tpl = await db().getTemplate(r.templateId);
      setRun(r);
      setTemplate(tpl);
      setBlocksDone(tpl ? tpl.blocks.map(() => false) : []);
      setModifiersHonored(r.modifiers.map(() => true));
    })();
  }, [params.id, router]);

  const completion = useMemo(() => {
    if (blocksDone.length === 0) return 0;
    return blocksDone.filter(Boolean).length / blocksDone.length;
  }, [blocksDone]);

  if (!run || !template) return <main className="min-h-dvh" />;

  const tier = RISK_TIERS[run.riskTier];

  async function finish() {
    if (!run) return;
    setSubmitting(true);
    await db().completeRun(run.id, { blocksDone, modifiersHonored, rpe });
    router.push(`/run/${run.id}/recap`);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar />

      <Stagger className="space-y-4">
        {/* ── EN-TÊTE DU RUN ── */}
        <Rise>
          <Panel tone={run.riskTier === 3 ? "danger" : "volt"} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="hud-label mb-1">
                  Run actif ·{" "}
                  <span className={run.riskTier === 3 ? "text-danger" : "text-volt"}>
                    {tier.name} ×{tier.mult.toFixed(2)}
                  </span>
                </p>
                <h1 className="truncate font-display text-lg font-bold uppercase tracking-wider">
                  {template.title}
                </h1>
              </div>
              <div className="shrink-0 text-right">
                <p className="hud-label mb-1">Chrono</p>
                <p className="font-mono text-2xl font-bold text-volt tabular">
                  {elapsed}
                </p>
              </div>
            </div>
          </Panel>
        </Rise>

        {/* ── MODIFIERS ACTIFS ── */}
        <Rise>
          <p className="hud-label mb-2">Modifiers — lâche-les si tu craques</p>
          <div className="space-y-2">
            {run.modifiers.map((mod, i) => (
              <button
                key={mod.id}
                type="button"
                onClick={() =>
                  setModifiersHonored((prev) =>
                    prev.map((v, j) => (j === i ? !v : v)),
                  )
                }
                className={cn(
                  "flex w-full items-center justify-between gap-3 border p-3 text-left transition-all",
                  modifiersHonored[i]
                    ? "border-volt/40 bg-volt-faint"
                    : "border-line opacity-45 line-through decoration-danger",
                )}
              >
                <span className="font-display text-xs font-bold uppercase tracking-wide">
                  {mod.name}
                </span>
                <span className="font-mono text-xs font-bold text-volt tabular">
                  ×{mod.xpMult.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </Rise>

        {/* ── BLOCS DE LA SÉANCE ── */}
        <Rise>
          <div className="mb-2 flex items-center justify-between">
            <p className="hud-label">Blocs</p>
            <p className="font-mono text-[10px] tracking-micro text-ink-mute">
              {blocksDone.filter(Boolean).length}/{template.blocks.length}
            </p>
          </div>
          <div className="space-y-2">
            {template.blocks.map((block, i) => {
              const done = blocksDone[i];
              return (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setBlocksDone((prev) => prev.map((v, j) => (j === i ? !v : v)))
                  }
                  className={cn(
                    "flex w-full items-center gap-3 border p-3.5 text-left transition-colors",
                    done
                      ? "border-volt/50 bg-volt-faint"
                      : "border-line hover:border-line-bright",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[10px] font-bold",
                      done
                        ? "border-volt bg-volt text-void"
                        : "border-line-bright text-ink-mute",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "font-display text-sm font-bold uppercase tracking-wide",
                        done && "text-volt",
                      )}
                    >
                      {block.name}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-ink-dim">
                      {block.detail}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Rise>

        {/* ── RPE ── */}
        <Rise>
          <p className="hud-label mb-2">RPE de la séance</p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRpe(n)}
                className={cn(
                  "h-9 border font-mono text-xs font-bold transition-colors tabular",
                  n === rpe
                    ? n >= 9
                      ? "border-danger bg-danger/15 text-danger"
                      : "border-volt bg-volt-faint text-volt"
                    : "border-line text-ink-mute hover:border-line-bright",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </Rise>

        {/* ── ACTIONS ── */}
        <Rise className="space-y-2 pt-2">
          <Button size="lg" disabled={submitting || completion === 0} onClick={finish}>
            Terminer le run
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            onClick={async () => {
              await db().abandonRun(run.id);
              router.push("/");
            }}
          >
            Abandonner — aucun XP
          </Button>
        </Rise>
      </Stagger>
    </main>
  );
}
