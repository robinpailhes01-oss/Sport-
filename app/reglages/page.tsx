"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { sendTestPush } from "@/lib/push/push-actions";
import {
  disablePush,
  enablePush,
  getExistingSubscription,
  pushSupported,
} from "@/lib/push/register";

type PushState = "checking" | "unsupported" | "off" | "on";

export default function ReglagesPage() {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [pushState, setPushState] = useState<PushState>("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) {
      setPushState("unsupported");
      return;
    }
    getExistingSubscription().then((sub) => setPushState(sub ? "on" : "off"));
  }, []);

  async function togglePush() {
    setPushBusy(true);
    setPushMessage(null);
    try {
      if (pushState === "on") {
        await disablePush();
        setPushState("off");
      } else {
        await enablePush();
        setPushState("on");
      }
    } catch (e) {
      setPushMessage(e instanceof Error ? e.message : "Échec de l'opération.");
    } finally {
      setPushBusy(false);
    }
  }

  async function testPush() {
    setPushBusy(true);
    setPushMessage(null);
    try {
      const { sent } = await sendTestPush();
      setPushMessage(
        sent > 0
          ? "Notification de test envoyée."
          : "Aucun appareil abonné à notifier.",
      );
    } catch (e) {
      setPushMessage(e instanceof Error ? e.message : "Échec de l'envoi.");
    } finally {
      setPushBusy(false);
    }
  }

  async function reset() {
    setResetting(true);
    await db().resetProtocol();
    window.location.href = "/";
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-6">
      <TopBar />

      <Stagger className="space-y-4">
        <Rise>
          <p className="hud-label mb-1">Configuration</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Réglages
          </h1>
        </Rise>

        {/* ── NOTIFICATIONS ── */}
        <Rise>
          <Panel className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="hud-label">Notifications push</p>
              {pushState === "on" && (
                <span className="font-mono text-[9px] tracking-micro text-volt">
                  ● ACTIVES
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-ink-dim">
              Rappel avant l&apos;heure d&apos;entraînement déclarée, alerte si
              ta streak est en jeu en fin de journée. Fonctionne même app
              fermée, une fois installée sur l&apos;écran d&apos;accueil.
            </p>

            {pushState === "unsupported" ? (
              <p className="mt-3 border border-line/50 px-3 py-2 text-center font-mono text-[11px] text-ink-mute">
                Non supporté sur ce navigateur.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant={pushState === "on" ? "ghost" : "primary"}
                  size="md"
                  onClick={togglePush}
                  disabled={pushBusy || pushState === "checking"}
                >
                  {pushState === "on" ? "Désactiver" : "Activer"}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={testPush}
                  disabled={pushBusy || pushState !== "on"}
                >
                  Envoyer un test
                </Button>
              </div>
            )}
            {pushMessage && (
              <p className="mt-2 font-mono text-[11px] text-ink-dim">{pushMessage}</p>
            )}
          </Panel>
        </Rise>

        {/* ── INTÉGRATIONS ── */}
        <Rise>
          <Panel className="p-4">
            <p className="hud-label mb-3">Intégrations</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between border border-line px-3 py-2.5">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink-mute">
                  Whoop — récup, sommeil, HRV
                </span>
                <span className="font-mono text-[9px] tracking-micro text-ink-mute">
                  🔒 BIENTÔT
                </span>
              </div>
              <div className="flex items-center justify-between border border-line px-3 py-2.5">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink-mute">
                  Google Calendar
                </span>
                <span className="font-mono text-[9px] tracking-micro text-ink-mute">
                  🔒 BIENTÔT
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-dim">
              Arrivent avec le prochain palier (données en ligne sur Supabase) —
              nécessaire pour stocker les connexions en sécurité.
            </p>
          </Panel>
        </Rise>

        {/* ── ZONE DANGEREUSE ── */}
        <Rise>
          <Panel tone="danger" className="p-4">
            <p className="hud-label mb-2 text-danger">Zone dangereuse</p>
            <p className="text-xs leading-relaxed text-ink-dim">
              Efface tout : XP, niveaux, records, journal, épargne, comms,
              jours de mer. Repart d&apos;un protocole vierge, jour 1. Les
              scans corporels sont épargnés — c&apos;est irréversible pour
              le reste.
            </p>
            {!confirming ? (
              <Button
                variant="danger"
                size="md"
                className="mt-3 w-full"
                onClick={() => setConfirming(true)}
              >
                Réinitialiser le protocole
              </Button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="border border-danger/50 bg-danger/10 px-3 py-2 text-center font-mono text-[11px] tracking-wide text-danger">
                  SÛR ? TOUT SERA EFFACÉ, SANS RETOUR EN ARRIÈRE.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setConfirming(false)}
                    disabled={resetting}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    onClick={reset}
                    disabled={resetting}
                  >
                    Oui, tout effacer
                  </Button>
                </div>
              </div>
            )}
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
