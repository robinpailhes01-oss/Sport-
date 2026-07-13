"use client";

import { WEEK_PROTOCOL } from "@/lib/engine/program";
import { cn } from "@/lib/utils";

/** Bande du protocole hebdo — le microcycle en un coup d'œil, jour courant en volt. */
export function WeekStrip({ todayIndex }: { todayIndex: number }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEK_PROTOCOL.map((plan) => {
        const isToday = plan.day === todayIndex;
        const isRest = plan.templateSlug === "recovery-protocol";
        return (
          <div
            key={plan.day}
            className={cn(
              "flex flex-col items-center gap-1 border py-2",
              isToday
                ? "border-volt bg-volt-faint shadow-glow-volt-sm"
                : "border-line",
            )}
          >
            <span
              className={cn(
                "font-mono text-[9px] tracking-micro",
                isToday ? "text-volt" : "text-ink-mute",
              )}
            >
              {plan.dayShort}
            </span>
            <span
              className={cn(
                "text-[13px] leading-none",
                !isToday && "opacity-60",
              )}
              aria-hidden
            >
              {isRest ? "◌" : "▮"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
