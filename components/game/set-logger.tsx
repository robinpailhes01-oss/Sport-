"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { HUD_EASE } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export interface DraftSet {
  weightKg: number;
  reps: number;
  /** null tant que la série n'est pas validée */
  done: boolean;
}

/**
 * Grille de saisie d'un exercice chargé. Le pari UX : la valeur proposée est
 * juste dans 90% des cas, donc valider une série = UN tap. Ajuster reste
 * possible en deux taps (± sur la charge ou les reps), jamais un clavier.
 */
export function SetLogger({
  sets,
  suggestion,
  onChange,
}: {
  sets: DraftSet[];
  /** Justification de la charge proposée — affichée une fois, en clair */
  suggestion: string | null;
  onChange: (sets: DraftSet[]) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);

  function update(index: number, patch: Partial<DraftSet>) {
    onChange(sets.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  /** Valider une série propage la charge aux séries suivantes non faites —
   *  on ne resaisit pas cinq fois le même poids. */
  function validate(index: number) {
    const target = sets[index];
    onChange(
      sets.map((s, i) => {
        if (i === index) return { ...s, done: !s.done };
        if (i > index && !s.done)
          return { ...s, weightKg: target.weightKg, reps: target.reps };
        return s;
      }),
    );
    setEditing(null);
  }

  return (
    <div className="space-y-1.5">
      {suggestion && (
        <p className="font-mono text-[10px] leading-relaxed text-ink-mute">
          ▸ {suggestion}
        </p>
      )}

      {sets.map((set, i) => {
        const isEditing = editing === i;
        return (
          <div key={i} className="space-y-1.5">
            <div
              className={cn(
                "flex items-center gap-2 border px-2 py-1.5 transition-colors",
                set.done ? "border-volt/50 bg-volt-faint" : "border-line",
              )}
            >
              <span className="w-8 shrink-0 font-mono text-[10px] tracking-micro text-ink-mute">
                S{i + 1}
              </span>

              <button
                type="button"
                onClick={() => setEditing(isEditing ? null : i)}
                className="flex flex-1 items-baseline gap-1 text-left"
                aria-label={`Ajuster la série ${i + 1}`}
              >
                <span
                  className={cn(
                    "font-mono text-sm font-bold tabular",
                    set.done ? "text-volt" : "text-ink",
                  )}
                >
                  {set.weightKg % 1 === 0 ? set.weightKg : set.weightKg.toFixed(1)}
                </span>
                <span className="font-mono text-[10px] text-ink-mute">kg</span>
                <span className="px-1 font-mono text-[10px] text-ink-mute">×</span>
                <span
                  className={cn(
                    "font-mono text-sm font-bold tabular",
                    set.done ? "text-volt" : "text-ink",
                  )}
                >
                  {set.reps}
                </span>
              </button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => validate(i)}
                aria-label={
                  set.done ? `Annuler la série ${i + 1}` : `Valider la série ${i + 1}`
                }
                className={cn(
                  "flex h-8 w-10 shrink-0 items-center justify-center border font-mono text-xs font-bold transition-colors",
                  set.done
                    ? "border-volt bg-volt text-void"
                    : "border-line-bright text-ink-mute",
                )}
              >
                ✓
              </motion.button>
            </div>

            {isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2, ease: HUD_EASE }}
                className="grid grid-cols-2 gap-2 overflow-hidden pl-8"
              >
                <Stepper
                  label="Charge"
                  value={set.weightKg}
                  suffix="kg"
                  step={2.5}
                  min={0}
                  onChange={(v) => update(i, { weightKg: v })}
                />
                <Stepper
                  label="Reps"
                  value={set.reps}
                  step={1}
                  min={1}
                  onChange={(v) => update(i, { reps: v })}
                />
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stepper({
  label,
  value,
  suffix,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  step: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="border border-line p-1.5">
      <p className="hud-label mb-1 text-center">{label}</p>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`${label} moins ${step}`}
          className="h-7 w-8 border border-line-bright font-mono text-sm text-ink-dim active:bg-surface"
        >
          −
        </button>
        <span className="font-mono text-sm font-bold text-ink tabular">
          {value % 1 === 0 ? value : value.toFixed(1)}
          {suffix && <span className="text-[9px] text-ink-mute"> {suffix}</span>}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          aria-label={`${label} plus ${step}`}
          className="h-7 w-8 border border-line-bright font-mono text-sm text-ink-dim active:bg-surface"
        >
          +
        </button>
      </div>
    </div>
  );
}
