"use client";

import Link from "next/link";
import { useState } from "react";
import { Rise, Stagger } from "@/components/motion/primitives";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";

export default function ReglagesPage() {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

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
              jours de mer. Repart d&apos;un protocole vierge, jour 1. Aucune
              sauvegarde cloud n&apos;existe encore — c&apos;est
              irréversible.
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
