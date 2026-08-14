"use client";

import { motion } from "motion/react";
import { HUD_EASE } from "@/components/motion/primitives";
import { Panel } from "@/components/ui/panel";
import type { ScanAnalysis } from "@/lib/engine/types";

/** Le rapport de lecture morphologique — ce que l'IA voit, croisé au ledger. */
export function ScanReport({ analysis }: { analysis: ScanAnalysis }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: HUD_EASE }}
    >
      <Panel tone="volt" className="p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="hud-label text-volt">Lecture morphologique</p>
          <span className="font-mono text-[9px] tracking-micro text-ink-mute">
            ORACLE
          </span>
        </div>

        <p className="text-sm leading-relaxed text-ink">{analysis.summary}</p>

        {analysis.developed.length > 0 && (
          <div className="mt-4">
            <p className="hud-label mb-1.5">Points forts visibles</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.developed.map((zone) => (
                <span
                  key={zone}
                  className="border border-volt/40 bg-volt-faint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-volt"
                >
                  {zone}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.toWork.length > 0 && (
          <div className="mt-4">
            <p className="hud-label mb-2">À travailler — par priorité</p>
            <div className="space-y-2">
              {analysis.toWork.map((item, i) => (
                <div key={item.zone} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-danger/50 font-mono text-[10px] font-bold text-danger">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-xs font-bold uppercase tracking-wide">
                      {item.zone}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-dim">
                      {item.why}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.posture && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="hud-label mb-1">Posture</p>
            <p className="text-xs leading-relaxed text-ink-dim">
              {analysis.posture}
            </p>
          </div>
        )}

        {analysis.crossCheck && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="hud-label mb-1">Recoupement avec tes charges</p>
            <p className="text-xs leading-relaxed text-ink-dim">
              {analysis.crossCheck}
            </p>
          </div>
        )}

        <p className="mt-4 border-t border-line pt-3 font-mono text-[9px] leading-relaxed text-ink-mute">
          Lecture visuelle d&apos;entraînement, pas un avis médical. Aucune
          estimation de masse grasse — une photo ne permet pas de la mesurer.
        </p>
      </Panel>
    </motion.div>
  );
}
