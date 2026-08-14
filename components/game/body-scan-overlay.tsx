"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HUD_EASE } from "@/components/motion/primitives";
import { BodyMap } from "./body-map";
import type { MuscleKey } from "@/lib/engine/exercises";
import type { ZoneStatus } from "@/lib/engine/strength";
import type { ScanTransform } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

// Le scan "réel" : TA photo, avec les zones musculaires posées dessus.
// Le calque ne devine rien — c'est toi qui le cales une fois par angle
// (glisser + largeur/hauteur). La pose de scan étant standardisée, ce
// calage reste juste pour tous les scans suivants.

export function BodyScanOverlay({
  photoUrl,
  view,
  statusByMuscle,
  transform,
  calibrating,
  onTransformChange,
  selected,
  onSelect,
  /** Rejoue le balayage à chaque changement de cette clé */
  scanKey,
}: {
  photoUrl: string;
  view: "front" | "back";
  statusByMuscle: Record<MuscleKey, ZoneStatus>;
  transform: ScanTransform;
  calibrating: boolean;
  onTransformChange: (t: ScanTransform) => void;
  selected?: MuscleKey | null;
  onSelect?: (muscle: MuscleKey) => void;
  scanKey?: string;
}) {
  const [scanning, setScanning] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Le balayage rejoue à chaque ouverture / changement de vue : c'est ce
  // moment qui donne la sensation d'un vrai scan.
  useEffect(() => {
    setScanning(true);
    const t = setTimeout(() => setScanning(false), 1600);
    return () => clearTimeout(t);
  }, [scanKey, view]);

  function onPointerDown(e: React.PointerEvent) {
    if (!calibrating) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!drag || !rect || drag.pointerId !== e.pointerId) return;
    // Déplacement exprimé en % du cadre : le calage reste valable quelle
    // que soit la taille d'écran.
    onTransformChange({
      ...transform,
      x: drag.originX + ((e.clientX - drag.startX) / rect.width) * 100,
      y: drag.originY + ((e.clientY - drag.startY) / rect.height) * 100,
    });
  }

  function endDrag(e: React.PointerEvent) {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] w-full select-none overflow-hidden border border-line bg-void"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={`Scan ${view === "front" ? "face" : "dos"}`}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* voile sombre : les zones volt ressortent sur n'importe quelle photo */}
      <div className="absolute inset-0 bg-void/45" />

      {/* le calque musculaire, calé par l'opérateur */}
      <motion.div
        className={cn(
          "absolute inset-0",
          calibrating && "cursor-move ring-1 ring-volt/50",
        )}
        style={{
          transform: `translate(${transform.x}%, ${transform.y}%) scale(${transform.scaleX}, ${transform.scaleY})`,
        }}
        initial={false}
        animate={{ opacity: scanning ? 0.25 : 0.8 }}
        transition={{ duration: 0.5, ease: HUD_EASE }}
      >
        <BodyMap
          view={view}
          statusByMuscle={statusByMuscle}
          selected={selected}
          onSelect={calibrating ? undefined : onSelect}
          animate={false}
        />
      </motion.div>

      {/* la ligne de balayage */}
      <AnimatePresence>
        {scanning && (
          <>
            <motion.div
              initial={{ top: "-2%" }}
              animate={{ top: "102%" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "linear" }}
              className="pointer-events-none absolute inset-x-0 h-[2px] bg-volt"
              style={{ boxShadow: "0 0 20px 4px rgba(200,255,0,0.75)" }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute left-2 top-2 font-mono text-[10px] tracking-micro text-volt"
            >
              ANALYSE MORPHOLOGIQUE…
            </motion.p>
          </>
        )}
      </AnimatePresence>

      {/* coins HUD */}
      {(["left-2 top-2 border-l-2 border-t-2", "right-2 top-2 border-r-2 border-t-2", "left-2 bottom-2 border-b-2 border-l-2", "right-2 bottom-2 border-b-2 border-r-2"] as const).map(
        (pos) => (
          <span
            key={pos}
            className={cn("pointer-events-none absolute h-3 w-3 border-volt/60", pos)}
          />
        ),
      )}

      {calibrating && (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[10px] tracking-wide text-volt">
          GLISSE POUR CALER
        </p>
      )}
    </div>
  );
}

/** Réglages de largeur / hauteur du calque — complète le glisser-déposer. */
export function CalibrationControls({
  transform,
  onChange,
  onReset,
}: {
  transform: ScanTransform;
  onChange: (t: ScanTransform) => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      <Slider
        label="Largeur"
        value={transform.scaleX}
        onChange={(scaleX) => onChange({ ...transform, scaleX })}
      />
      <Slider
        label="Hauteur"
        value={transform.scaleY}
        onChange={(scaleY) => onChange({ ...transform, scaleY })}
      />
      <button
        type="button"
        onClick={onReset}
        className="w-full border border-line py-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-mute transition-colors hover:border-line-bright"
      >
        Réinitialiser le calage
      </button>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="hud-label mb-1 flex items-baseline justify-between">
        <span>{label}</span>
        <span className="text-ink-dim">{value.toFixed(2)}×</span>
      </span>
      <input
        type="range"
        min={0.4}
        max={1.8}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-volt"
      />
    </label>
  );
}
