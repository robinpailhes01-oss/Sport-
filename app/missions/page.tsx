"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { HUD_EASE, Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { COACHES } from "@/lib/engine/coaches";
import {
  WORKOUT_TYPE_LABELS,
  type AvatarState,
  type Mission,
} from "@/lib/engine/types";
import { cn } from "@/lib/utils";

function coachName(author: string): string {
  return author === "goggins" ? COACHES.goggins.codename : COACHES.robbins.codename;
}

export default function MissionsPage() {
  const router = useRouter();
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [closed, setClosed] = useState<Mission[]>([]);
  const [generating, setGenerating] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [a, m, c] = await Promise.all([
        db().getAvatar(),
        db().listMissions(),
        db().listClosedMissions(),
      ]);
      setAvatar(a);
      setMissions(m);
      setClosed(c);
      setReady(true);
    })();
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const created = await db().generateMissions();
      if (created.length === 0) {
        setError(
          "Génération indisponible — vérifie que la clé IA est configurée côté serveur.",
        );
        return;
      }
      setMissions(await db().listMissions());
    } catch (e) {
      setError(e instanceof Error ? e.message : "La génération a échoué.");
    } finally {
      setGenerating(false);
    }
  }

  async function launch(mission: Mission) {
    setLaunching(mission.id);
    setError(null);
    try {
      const run = await db().launchMission(mission.id);
      if (!run) {
        setError("Impossible de lancer cette séance.");
        return;
      }
      router.push(`/run/${run.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le lancement a échoué.");
      setLaunching(null);
    }
  }

  async function skip(mission: Mission) {
    await db().skipMission(mission.id);
    setMissions(await db().listMissions());
    setClosed(await db().listClosedMissions());
  }

  if (!avatar || !ready) return <main className="min-h-dvh" />;

  const active = missions.find((m) => m.status === "active");
  const pending = missions.filter((m) => m.status === "pending");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="space-y-4">
        <Rise>
          <p className="hud-label mb-1">Ce qu&apos;il y a à faire</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Missions
          </h1>
        </Rise>

        {/* ── RUN EN COURS ── */}
        {active && (
          <Rise>
            <Panel tone="volt" className="p-4">
              <p className="hud-label mb-1">Séance en cours</p>
              <p className="font-display text-lg font-bold uppercase tracking-wider">
                {active.template.title}
              </p>
              {active.runId && (
                <Link href={`/run/${active.runId}`} className="mt-3 block">
                  <Button size="md" className="w-full" tabIndex={-1}>
                    Reprendre →
                  </Button>
                </Link>
              )}
            </Panel>
          </Rise>
        )}

        {/* ── LA FILE ── */}
        {pending.length === 0 ? (
          <Rise>
            <Panel className="p-5">
              <p className="text-center font-mono text-xs leading-relaxed text-ink-mute">
                Ta file est vide.
                <br />
                Demande à tes coachs de la remplir — ils composeront des
                séances complémentaires à partir de tes charges réelles.
              </p>
            </Panel>
          </Rise>
        ) : (
          pending.map((mission, i) => (
            <Rise key={mission.id}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05, ease: HUD_EASE }}
              >
                <Panel className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="hud-label mb-1">
                        {WORKOUT_TYPE_LABELS[mission.template.type]} ·{" "}
                        {mission.template.durationMin}′
                      </p>
                      <p className="font-display text-base font-bold uppercase tracking-wide">
                        {mission.template.title}
                      </p>
                    </div>
                    {mission.priority >= 7 && (
                      <span className="shrink-0 border border-danger/50 px-1.5 py-0.5 font-mono text-[9px] tracking-micro text-danger">
                        PRIORITÉ
                      </span>
                    )}
                  </div>

                  <p className="mb-3 text-xs leading-relaxed text-ink-dim">
                    {mission.rationale}
                  </p>

                  <div className="mb-3 space-y-1 border-y border-line py-2">
                    {mission.template.blocks.map((b, j) => (
                      <p key={j} className="font-mono text-[10px] text-ink-mute">
                        <span className="text-ink-dim">{b.name}</span> — {b.detail}
                      </p>
                    ))}
                  </div>

                  <p className="hud-label mb-2">{coachName(mission.author)}</p>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Button
                      size="md"
                      disabled={launching !== null}
                      onClick={() => launch(mission)}
                    >
                      {launching === mission.id ? "Lancement…" : "Lancer"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      disabled={launching !== null}
                      onClick={() => skip(mission)}
                    >
                      Passer
                    </Button>
                  </div>
                </Panel>
              </motion.div>
            </Rise>
          ))
        )}

        {/* ── GÉNÉRER ── */}
        <Rise>
          <Panel tone="volt" className="p-4">
            <p className="hud-label mb-1 text-volt">Remplir la file</p>
            <p className="text-xs leading-relaxed text-ink-dim">
              Tes coachs composent 3 à 5 séances complémentaires — durées
              variées, adaptées à ton matériel et à tes zones en retard. Tu
              piochesment dedans quand tu peux.
            </p>
            <Button
              size="md"
              className="mt-3 w-full"
              disabled={generating}
              onClick={generate}
            >
              {generating ? "Les coachs composent…" : "Générer mes séances"}
            </Button>
            {error && (
              <p className="mt-2 font-mono text-[11px] text-danger">{error}</p>
            )}
          </Panel>
        </Rise>

        {/* ── HISTORIQUE ── */}
        {closed.length > 0 && (
          <Rise>
            <Panel className="p-4">
              <p className="hud-label mb-2">Closes</p>
              <div className="space-y-1">
                {closed.slice(0, 8).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-baseline justify-between font-mono text-[11px]"
                  >
                    <span
                      className={cn(
                        "truncate",
                        m.status === "done" ? "text-ink-dim" : "text-ink-mute line-through",
                      )}
                    >
                      {m.template.title}
                    </span>
                    <span
                      className={cn(
                        "ml-2 shrink-0 text-[9px] tracking-micro",
                        m.status === "done" ? "text-volt" : "text-ink-mute",
                      )}
                    >
                      {m.status === "done" ? "FAITE" : "PASSÉE"}
                    </span>
                  </div>
                ))}
              </div>
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
