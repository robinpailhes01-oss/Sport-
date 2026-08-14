"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { strengthRatios } from "@/lib/engine/strength";
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  type Equipment,
  type Goal,
  type OperatorProfile,
  type SetLog,
  type WeighIn,
} from "@/lib/engine/types";
import { cn } from "@/lib/utils";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function frDate(iso: string): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    .replace(".", "");
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [logs, setLogs] = useState<SetLog[]>([]);
  const [weightDraft, setWeightDraft] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    db().getProfile().then(setProfile);
    db().listWeighIns().then(setWeighIns);
    db().listSetLogs().then(setLogs);
  }, []);

  async function patch(next: Partial<OperatorProfile>) {
    const updated = await db().setProfile(next);
    setProfile(updated);
    setSaved("Profil enregistré.");
    setTimeout(() => setSaved(null), 2000);
  }

  async function saveWeight() {
    const value = Number(weightDraft.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    await db().addWeighIn(todayIso(), value);
    setWeightDraft("");
    setWeighIns(await db().listWeighIns());
  }

  if (!profile) return <main className="min-h-dvh" />;

  const current = weighIns[0] ?? null;
  // Référence ~30 jours en arrière pour la tendance — la première pesée
  // plus ancienne que 21 jours, sinon la plus ancienne disponible.
  const reference =
    weighIns.find((w) => {
      const days = (Date.now() - Date.parse(`${w.date}T00:00:00`)) / 86400000;
      return days >= 21;
    }) ?? weighIns[weighIns.length - 1] ?? null;
  const delta =
    current && reference && reference.date !== current.date
      ? current.weightKg - reference.weightKg
      : null;

  const ratios = strengthRatios(logs, current?.weightKg ?? null);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar />

      <Stagger className="space-y-4">
        <Rise>
          <p className="hud-label mb-1">Qui pilote le protocole</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Profil opérateur
          </h1>
        </Rise>

        {/* ── POIDS ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Poids de corps</p>
            <div className="mb-3 flex items-end justify-between">
              <p className="font-display text-4xl font-bold leading-none text-volt text-glow-volt">
                {current ? current.weightKg.toFixed(1) : "—"}
                <span className="text-lg text-ink-mute"> kg</span>
              </p>
              {delta !== null && (
                <p
                  className={cn(
                    "font-mono text-xs tabular",
                    delta > 0 ? "text-zone2" : "text-volt",
                  )}
                >
                  {delta > 0 ? "▲ +" : "▼ "}
                  {Math.abs(delta).toFixed(1)} kg
                  <span className="ml-1 text-ink-mute">
                    depuis {frDate(reference!.date)}
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weightDraft}
                onChange={(e) => setWeightDraft(e.target.value)}
                placeholder="Pesée du jour"
                className="min-w-0 flex-1 border border-line bg-void px-3 py-2 font-mono text-sm text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-volt"
              />
              <Button size="md" onClick={saveWeight} disabled={!weightDraft.trim()}>
                Peser
              </Button>
            </div>
            {weighIns.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                {weighIns.slice(0, 6).map((w) => (
                  <span key={w.date} className="font-mono text-[10px] text-ink-mute">
                    {frDate(w.date)} · {w.weightKg.toFixed(1)}
                  </span>
                ))}
              </div>
            )}
          </Panel>
        </Rise>

        {/* ── RATIOS DE FORCE ── */}
        {ratios.length > 0 && (
          <Rise>
            <Panel className="p-4">
              <p className="hud-label mb-3">Force relative — ×poids de corps</p>
              <div className="space-y-2.5">
                {ratios.map((r) => {
                  const pct = Math.min(100, (r.ratio / r.targetRatio) * 100);
                  return (
                    <div key={r.exerciseKey}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="font-display text-xs font-bold uppercase tracking-wide">
                          {r.label}
                        </span>
                        <span className="font-mono text-[11px] tabular">
                          <span className="text-volt">{r.ratio.toFixed(2)}×</span>
                          <span className="text-ink-mute"> / {r.targetRatio}×</span>
                        </span>
                      </div>
                      <div className="h-1 bg-line">
                        <div
                          className="h-full bg-volt"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-mute">
                Calculé depuis tes séries réelles (1RM estimé), jamais un test max.
              </p>
            </Panel>
          </Rise>
        )}

        {/* ── MORPHOLOGIE ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Morphologie</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="hud-label mb-1 block">Taille (cm)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  defaultValue={profile.heightCm ?? ""}
                  onBlur={(e) =>
                    patch({ heightCm: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full border border-line bg-void px-3 py-2 font-mono text-sm text-ink outline-none focus:border-volt"
                />
              </label>
              <label className="block">
                <span className="hud-label mb-1 block">Naissance</span>
                <input
                  type="date"
                  defaultValue={profile.birthdate ?? ""}
                  onBlur={(e) => patch({ birthdate: e.target.value || null })}
                  className="w-full border border-line bg-void px-3 py-2 font-mono text-xs text-ink outline-none focus:border-volt"
                />
              </label>
            </div>
          </Panel>
        </Rise>

        {/* ── OBJECTIF ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Objectif principal</p>
            <div className="space-y-2">
              {(Object.keys(GOAL_LABELS) as Goal[]).map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => patch({ goal })}
                  className={cn(
                    "w-full border px-3 py-2.5 text-left font-display text-xs font-bold uppercase tracking-wide transition-colors",
                    profile.goal === goal
                      ? "border-volt bg-volt-faint text-volt"
                      : "border-line text-ink-mute hover:border-line-bright",
                  )}
                >
                  {GOAL_LABELS[goal]}
                </button>
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-mute">
              Pondère les séances que les agents te proposeront.
            </p>
          </Panel>
        </Rise>

        {/* ── CONTEXTE ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Contexte d&apos;entraînement</p>
            <div className="mb-3 space-y-2">
              {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => patch({ equipment: eq })}
                  className={cn(
                    "w-full border px-3 py-2.5 text-left font-display text-xs font-bold uppercase tracking-wide transition-colors",
                    profile.equipment === eq
                      ? "border-volt bg-volt-faint text-volt"
                      : "border-line text-ink-mute hover:border-line-bright",
                  )}
                >
                  {EQUIPMENT_LABELS[eq]}
                </button>
              ))}
            </div>

            <label className="mb-3 block">
              <span className="hud-label mb-1 block">
                Durée max d&apos;une séance : {profile.timeBudgetMin} min
              </span>
              <input
                type="range"
                min={30}
                max={120}
                step={5}
                defaultValue={profile.timeBudgetMin}
                onChange={(e) =>
                  setProfile({ ...profile, timeBudgetMin: Number(e.target.value) })
                }
                onMouseUp={(e) =>
                  patch({ timeBudgetMin: Number((e.target as HTMLInputElement).value) })
                }
                onTouchEnd={(e) =>
                  patch({ timeBudgetMin: Number((e.target as HTMLInputElement).value) })
                }
                className="w-full accent-volt"
              />
            </label>

            <label className="block">
              <span className="hud-label mb-1 block">Contraintes</span>
              <textarea
                rows={3}
                defaultValue={profile.constraints ?? ""}
                onBlur={(e) => patch({ constraints: e.target.value || null })}
                placeholder="Chaleur 11h-17h, jours de mer imprévisibles, épaule droite sensible…"
                className="w-full resize-none border border-line bg-void p-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-volt"
              />
            </label>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-ink-mute">
              Lu par tes agents à chaque séance proposée.
            </p>
          </Panel>
        </Rise>

        {saved && (
          <p className="text-center font-mono text-[11px] text-volt">{saved}</p>
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
