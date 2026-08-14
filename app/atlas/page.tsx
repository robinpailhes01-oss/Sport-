"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { BodyMap, ZONE_LABELS, ZoneLegend } from "@/components/game/body-map";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { MUSCLES, MUSCLE_KEYS, exerciseByKey, type MuscleKey } from "@/lib/engine/exercises";
import {
  atlasVerdict,
  muscleDetail,
  muscleZones,
  strengthRatios,
  trackedExercises,
  type ZoneStatus,
} from "@/lib/engine/strength";
import type { AvatarState, BodyScan, SetLog, WeighIn } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const fmtTonnage = (kg: number) =>
  kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;

export default function AtlasPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [logs, setLogs] = useState<SetLog[]>([]);
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [view, setView] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<MuscleKey | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [a, l, w, s] = await Promise.all([
        db().getAvatar(),
        db().listSetLogs(),
        db().listWeighIns(),
        db().listBodyScans(),
      ]);
      setAvatar(a);
      setLogs(l);
      setWeighIns(w);
      setScans(s);
      setReady(true);
    })();
  }, []);

  const zones = useMemo(() => muscleZones(logs), [logs]);
  const statusByMuscle = useMemo(
    () =>
      Object.fromEntries(zones.map((z) => [z.muscle, z.status])) as Record<
        MuscleKey,
        ZoneStatus
      >,
    [zones],
  );
  const verdict = useMemo(() => atlasVerdict(logs), [logs]);
  const detail = useMemo(
    () => (selected ? muscleDetail(selected, logs) : null),
    [selected, logs],
  );
  const bodyweight = weighIns[0]?.weightKg ?? null;
  const ratios = useMemo(() => strengthRatios(logs, bodyweight), [logs, bodyweight]);
  const tracked = useMemo(() => trackedExercises(logs), [logs]);
  const stagnating = tracked.filter((t) => t.stagnating);

  // Le scan le plus récent de l'angle correspondant à la vue affichée.
  const scanForView = useMemo(() => {
    const angle = view === "front" ? "face" : "dos";
    return scans.find((s) => s.angle === angle) ?? null;
  }, [scans, view]);

  const hasData = logs.length > 0;

  if (!avatar || !ready) return <main className="min-h-dvh" />;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="space-y-4">
        <Rise>
          <p className="hud-label mb-1">Ce que tes charges disent de ton corps</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Atlas
          </h1>
        </Rise>

        {!hasData && (
          <Rise>
            <Panel className="p-5 text-center">
              <p className="font-mono text-xs leading-relaxed text-ink-mute">
                Aucune charge enregistrée.
                <br />
                Logge tes séries pendant un run — l&apos;atlas se dessinera tout
                seul.
              </p>
            </Panel>
          </Rise>
        )}

        {/* ── BANDEAU CORPS ── */}
        <Rise>
          <Panel className="p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="hud-label mb-1">Poids</p>
                <p className="font-display text-2xl font-bold leading-none text-volt">
                  {bodyweight ? bodyweight.toFixed(1) : "—"}
                  <span className="text-sm text-ink-mute"> kg</span>
                </p>
              </div>
              <div className="text-right">
                <p className="hud-label mb-1">Volume 28 j</p>
                <p className="font-mono text-lg font-bold text-ink tabular">
                  {fmtTonnage(zones.reduce((s, z) => s + z.tonnage, 0))}
                </p>
              </div>
            </div>
            {ratios.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3">
                {ratios.map((r) => (
                  <span key={r.exerciseKey} className="font-mono text-[10px]">
                    <span className="text-ink-mute">{r.label} </span>
                    <span className="text-volt tabular">{r.ratio.toFixed(2)}×</span>
                  </span>
                ))}
              </div>
            )}
            {!bodyweight && (
              <p className="mt-3 border-t border-line pt-3 font-mono text-[10px] leading-relaxed text-ink-mute">
                Pèse-toi dans{" "}
                <Link href="/profil" className="text-volt underline">
                  ton profil
                </Link>{" "}
                pour débloquer les ratios de force.
              </p>
            )}
          </Panel>
        </Rise>

        {/* ── CARTE ── */}
        <Rise>
          <Panel className="p-4">
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {(["front", "back"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setView(v);
                    setSelected(null);
                  }}
                  className={cn(
                    "border py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors",
                    view === v
                      ? "border-volt text-volt"
                      : "border-line text-ink-mute hover:border-line-bright",
                  )}
                >
                  {v === "front" ? "Face" : "Dos"}
                </button>
              ))}
            </div>

            <div className="relative mx-auto aspect-[1/2] w-full max-w-[240px]">
              {overlay && scanForView && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={scanForView.url}
                  alt={`Scan ${view}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className={cn("absolute inset-0", overlay && "opacity-70")}>
                <BodyMap
                  view={view}
                  statusByMuscle={statusByMuscle}
                  selected={selected}
                  onSelect={setSelected}
                />
              </div>
            </div>

            <div className="mt-3">
              <ZoneLegend />
            </div>

            {scanForView && (
              <button
                type="button"
                onClick={() => setOverlay((o) => !o)}
                className={cn(
                  "mt-3 w-full border py-2 font-mono text-[10px] uppercase tracking-wide transition-colors",
                  overlay
                    ? "border-volt text-volt"
                    : "border-line text-ink-mute hover:border-line-bright",
                )}
              >
                {overlay ? "◧ Masquer ta photo" : "◧ Calquer sur ta photo"}
              </button>
            )}

            {verdict && (
              <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-dim">
                {verdict}
              </p>
            )}
          </Panel>
        </Rise>

        {/* ── DÉTAIL DE ZONE ── */}
        {detail && (
          <Rise>
            <Panel tone="volt" className="p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="font-display text-sm font-bold uppercase tracking-wider text-volt">
                  {MUSCLES[detail.muscle].label}
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="font-mono text-xs text-ink-mute"
                  aria-label="Fermer le détail"
                >
                  ✕
                </button>
              </div>

              <div className="mb-3 flex gap-4">
                <div>
                  <p className="hud-label mb-0.5">Statut</p>
                  <p className="font-mono text-xs text-ink">
                    {ZONE_LABELS[detail.zone.status]}
                  </p>
                </div>
                <div>
                  <p className="hud-label mb-0.5">Volume 28 j</p>
                  <p className="font-mono text-xs text-ink tabular">
                    {fmtTonnage(detail.zone.tonnage)}
                  </p>
                </div>
                <div>
                  <p className="hud-label mb-0.5">Part</p>
                  <p className="font-mono text-xs text-ink tabular">
                    {(detail.zone.share * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {detail.feeders.length > 0 ? (
                <div className="space-y-1">
                  <p className="hud-label mb-1">Ce qui la nourrit</p>
                  {detail.feeders.slice(0, 4).map((f) => (
                    <div
                      key={f.exerciseKey}
                      className="flex items-baseline justify-between font-mono text-[11px]"
                    >
                      <span className="text-ink-dim">
                        {exerciseByKey(f.exerciseKey)?.label ?? f.exerciseKey}
                        {f.isPrimary && <span className="text-volt"> ●</span>}
                      </span>
                      <span className="text-ink-mute tabular">
                        {fmtTonnage(f.tonnage)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-[11px] leading-relaxed text-ink-mute">
                  Aucune charge sur cette zone depuis 28 jours.
                </p>
              )}

              {detail.suggestions.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="hud-label mb-1">Pour la charger</p>
                  <p className="font-mono text-[11px] leading-relaxed text-ink-dim">
                    {detail.suggestions
                      .map((k) => exerciseByKey(k)?.label ?? k)
                      .join(" · ")}
                  </p>
                </div>
              )}
            </Panel>
          </Rise>
        )}

        {/* ── EXERCICES SUIVIS ── */}
        {tracked.length > 0 && (
          <Rise>
            <Panel className="p-4">
              <p className="hud-label mb-3">
                Exercices suivis — 1RM estimé
              </p>
              <div className="space-y-2">
                {tracked.map((t) => (
                  <div
                    key={t.exerciseKey}
                    className="flex items-baseline justify-between border-b border-line pb-1.5 last:border-0"
                  >
                    <span className="font-display text-xs font-bold uppercase tracking-wide">
                      {exerciseByKey(t.exerciseKey)?.label ?? t.exerciseKey}
                    </span>
                    <span className="flex items-baseline gap-2 font-mono text-[11px] tabular">
                      <span className="text-volt">{t.e1rm.toFixed(1)} kg</span>
                      {t.trendPct !== null && (
                        <span
                          className={cn(
                            t.trendPct > 2
                              ? "text-volt"
                              : t.trendPct < -2
                                ? "text-danger"
                                : "text-ink-mute",
                          )}
                        >
                          {t.trendPct > 0 ? "▲" : t.trendPct < 0 ? "▼" : "≈"}
                          {Math.abs(t.trendPct).toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {stagnating.length > 0 && (
                <p className="mt-3 border-t border-line pt-3 font-mono text-[10px] leading-relaxed text-danger/90">
                  ⚠ Stagnation sur{" "}
                  {stagnating
                    .map((s) => exerciseByKey(s.exerciseKey)?.label ?? s.exerciseKey)
                    .join(", ")}{" "}
                  — change de schéma de séries ou prends un deload.
                </p>
              )}
            </Panel>
          </Rise>
        )}

        {/* ── ANGLES MORTS ── */}
        {hasData && (
          <Rise>
            <Panel className="p-4">
              <p className="hud-label mb-2">Angles morts</p>
              {(() => {
                const blind = MUSCLE_KEYS.filter(
                  (m) => statusByMuscle[m] === "negligee",
                );
                return blind.length > 0 ? (
                  <p className="text-xs leading-relaxed text-ink-dim">
                    {blind.map((m) => MUSCLES[m].label).join(" · ")} — aucune
                    charge sur 28 jours.
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed text-ink-dim">
                    Aucun groupe musculaire complètement délaissé. Bon équilibre.
                  </p>
                );
              })()}
            </Panel>
          </Rise>
        )}

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
