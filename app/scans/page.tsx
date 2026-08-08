"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { CaptureSlot } from "@/components/scans/capture-slot";
import { CameraCapture } from "@/components/scans/camera-capture";
import { CompareSlider } from "@/components/scans/compare-slider";
import { db } from "@/lib/data";
import { STAT_KEYS, STATS, type AvatarState, type BodyScan, type ScanAngle } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const ANGLES: { key: ScanAngle; label: string }[] = [
  { key: "face", label: "Face" },
  { key: "profil", label: "Profil" },
  { key: "dos", label: "Dos" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function frDate(iso: string): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" })
    .replace(".", "");
}

// Redimensionne côté client avant envoi — une photo de téléphone brute pèse
// plusieurs Mo, inutile de faire voyager ça jusqu'à Supabase.
function resizeToDataUrl(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponible"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ScansPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [draft, setDraft] = useState<Partial<Record<ScanAngle, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorityLabel, setPriorityLabel] = useState<string | null>(null);

  const [activeCamera, setActiveCamera] = useState<ScanAngle | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const fallbackAngleRef = useRef<ScanAngle | null>(null);

  const [dateA, setDateA] = useState<string | null>(null);
  const [dateB, setDateB] = useState<string | null>(null);
  const [compareAngle, setCompareAngle] = useState<ScanAngle>("face");

  useEffect(() => {
    db().getAvatar().then(setAvatar);
    refresh();
    // Vraie donnée du ledger — jamais une analyse d'image — pour donner au
    // scan un sens de progression de personnage sans rien inventer.
    db()
      .getWeeklyXp(1)
      .then((weekly) => {
        const weakest = STAT_KEYS.reduce((a, b) => (weekly[a][0] <= weekly[b][0] ? a : b));
        setPriorityLabel(STATS[weakest].label);
      });
  }, []);

  function setDraftFor(angle: ScanAngle, dataUrl: string) {
    setError(null);
    setDraft((d) => ({ ...d, [angle]: dataUrl }));
  }

  function openCamera(angle: ScanAngle) {
    setActiveCamera(angle);
  }

  function openFallback(angle: ScanAngle) {
    fallbackAngleRef.current = angle;
    fallbackInputRef.current?.click();
  }

  async function refresh() {
    const list = await db().listBodyScans();
    setScans(list);
  }

  const byDate = new Map<string, Partial<Record<ScanAngle, BodyScan>>>();
  for (const s of scans) {
    const day = byDate.get(s.date) ?? {};
    day[s.angle] = s;
    byDate.set(s.date, day);
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  useEffect(() => {
    if (dates.length >= 2 && !dateA && !dateB) {
      setDateB(dates[0]);
      setDateA(dates[dates.length - 1]);
    }
  }, [dates.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFallbackFile(file: File) {
    const angle = fallbackAngleRef.current;
    if (!angle) return;
    setError(null);
    try {
      const dataUrl = await resizeToDataUrl(file);
      setDraftFor(angle, dataUrl);
    } catch {
      setError("Impossible de lire cette photo — réessaie.");
    }
  }

  async function saveScan() {
    const entries = Object.entries(draft) as [ScanAngle, string][];
    if (entries.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const [angle, dataUrl] of entries) {
        await db().addBodyScan(todayIso(), angle, dataUrl);
      }
      setDraft({});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const todayScans = byDate.get(todayIso());
  const draftCount = Object.keys(draft).length;
  const scanA = dateA ? byDate.get(dateA)?.[compareAngle] : undefined;
  const scanB = dateB ? byDate.get(dateB)?.[compareAngle] : undefined;

  if (!avatar) return <main className="min-h-dvh" />;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="space-y-4">
        <Rise>
          <p className="hud-label mb-1">Preuve visuelle du protocole</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Scan corporel
          </h1>
        </Rise>

        {/* ── NOUVEAU SCAN ── */}
        <Rise>
          <Panel className="p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="hud-label">Nouveau scan — {frDate(todayIso())}</p>
              {todayScans && (
                <span className="font-mono text-[10px] text-volt">déjà commencé</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ANGLES.map(({ key, label }) => (
                <CaptureSlot
                  key={key}
                  angle={key}
                  label={label}
                  previewUrl={draft[key] ?? todayScans?.[key]?.url}
                  onClick={() => openCamera(key)}
                />
              ))}
            </div>
            <input
              ref={fallbackInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFallbackFile(file);
                e.target.value = "";
              }}
            />
            {error && (
              <p className="mt-3 font-mono text-[11px] text-danger">{error}</p>
            )}
            <Button
              size="md"
              className="mt-4 w-full"
              disabled={draftCount === 0 || saving}
              onClick={saveScan}
            >
              {saving ? "Enregistrement…" : `Enregistrer (${draftCount}/3)`}
            </Button>
            <p className="mt-2 text-center font-mono text-[10px] leading-relaxed text-ink-mute">
              Stocké en privé — jamais public, jamais visible sans toi.
            </p>
            {priorityLabel && (
              <p className="mt-3 border-t border-line pt-3 text-center font-mono text-[10px] tracking-wide text-ink-mute">
                Zone prioritaire du protocole —{" "}
                <span className="text-volt">{priorityLabel.toUpperCase()}</span>
              </p>
            )}
          </Panel>
        </Rise>

        {/* ── CHRONOLOGIE ── */}
        {dates.length > 0 && (
          <Rise>
            <Panel className="p-4">
              <p className="hud-label mb-3">
                Chronologie — {dates.length} scan{dates.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-2">
                {dates.map((date) => {
                  const day = byDate.get(date)!;
                  return (
                    <div
                      key={date}
                      className="flex items-center gap-2 border border-line p-2"
                    >
                      <span className="w-16 shrink-0 font-mono text-[11px] text-ink-dim">
                        {frDate(date)}
                      </span>
                      <div className="flex flex-1 gap-1.5">
                        {ANGLES.map(({ key }) =>
                          day[key] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={key}
                              src={day[key]!.url}
                              alt={key}
                              className="h-14 w-11 border border-line object-cover"
                            />
                          ) : (
                            <div
                              key={key}
                              className="h-14 w-11 border border-dashed border-line/50 bg-void"
                            />
                          ),
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </Rise>
        )}

        {/* ── COMPARATEUR ── */}
        {dates.length >= 2 && (
          <Rise>
            <Panel className="p-4">
              <p className="hud-label mb-3">Avant / Après</p>
              <div className="mb-3 flex gap-1.5">
                {ANGLES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCompareAngle(key)}
                    className={cn(
                      "flex-1 border py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors",
                      compareAngle === key
                        ? "border-volt text-volt"
                        : "border-line text-ink-mute hover:border-line-bright",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <select
                  value={dateA ?? ""}
                  onChange={(e) => setDateA(e.target.value)}
                  className="border border-line bg-void px-2 py-2 font-mono text-xs text-ink outline-none"
                >
                  {dates.map((d) => (
                    <option key={d} value={d}>
                      {frDate(d)}
                    </option>
                  ))}
                </select>
                <select
                  value={dateB ?? ""}
                  onChange={(e) => setDateB(e.target.value)}
                  className="border border-line bg-void px-2 py-2 font-mono text-xs text-ink outline-none"
                >
                  {dates.map((d) => (
                    <option key={d} value={d}>
                      {frDate(d)}
                    </option>
                  ))}
                </select>
              </div>
              {scanA && scanB ? (
                <CompareSlider
                  beforeUrl={scanA.url}
                  afterUrl={scanB.url}
                  beforeLabel={frDate(dateA!)}
                  afterLabel={frDate(dateB!)}
                />
              ) : (
                <p className="border border-line/50 p-6 text-center font-mono text-[11px] leading-relaxed text-ink-mute">
                  Pas de photo « {ANGLES.find((a) => a.key === compareAngle)?.label.toLowerCase()} »
                  sur une des deux dates choisies.
                </p>
              )}
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

      {activeCamera && (
        <CameraCapture
          angle={activeCamera}
          label={ANGLES.find((a) => a.key === activeCamera)!.label}
          priorityLabel={priorityLabel}
          onCapture={(dataUrl) => setDraftFor(activeCamera, dataUrl)}
          onClose={() => setActiveCamera(null)}
          onFallback={() => {
            const angle = activeCamera;
            setActiveCamera(null);
            openFallback(angle);
          }}
        />
      )}
    </main>
  );
}
