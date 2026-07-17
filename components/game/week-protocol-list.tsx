"use client";

import { coachForType } from "@/lib/engine/coaches";
import { WEEK_PROTOCOL } from "@/lib/engine/program";
import type { WorkoutTemplate } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

/** Semaine type du protocole — séance (ou alternance) par jour, coach qui la signe. */
export function WeekProtocolList({
  templates,
  highlightDay,
  showIntent = true,
}: {
  templates: WorkoutTemplate[];
  /** 0 = lundi … 6 = dimanche — met la ligne en avant (aujourd'hui) */
  highlightDay?: number;
  showIntent?: boolean;
}) {
  const bySlug = new Map(templates.map((t) => [t.slug, t]));

  return (
    <ul className="divide-y divide-line/60">
      {WEEK_PROTOCOL.map((plan) => {
        const tpl = bySlug.get(plan.templateSlug);
        const alt = plan.altTemplateSlug
          ? bySlug.get(plan.altTemplateSlug)
          : null;
        const coach = tpl ? coachForType(tpl.type) : null;
        const isToday = plan.day === highlightDay;
        return (
          <li
            key={plan.day}
            className={cn(
              "-mx-2 flex items-center gap-3 px-2 py-2.5",
              isToday && "bg-volt-faint",
            )}
          >
            <span
              className={cn(
                "w-9 shrink-0 font-mono text-[10px] tracking-micro",
                isToday ? "text-volt" : "text-ink-mute",
              )}
            >
              {plan.dayShort}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xs font-bold uppercase tracking-wide">
                {tpl?.title}
                {alt && <span className="text-ink-mute"> / {alt.title}</span>}
              </p>
              {showIntent && (
                <p className="mt-0.5 truncate text-[11px] text-ink-dim">
                  {plan.intent}
                </p>
              )}
            </div>
            {coach && (
              <span
                className={cn(
                  "shrink-0 font-mono text-[9px] tracking-micro",
                  coach.accent === "danger" ? "text-danger/80" : "text-zone2/80",
                )}
              >
                {coach.monogram}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
