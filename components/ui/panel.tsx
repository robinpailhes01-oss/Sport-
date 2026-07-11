import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "default" | "volt" | "danger";

const tickColor: Record<Tone, string> = {
  default: "border-line-bright",
  volt: "border-volt",
  danger: "border-danger",
};

/** Panneau HUD avec ticks de coin — la brique de base du langage visuel. */
export function Panel({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  const tick = tickColor[tone];
  return (
    <div
      className={cn(
        "relative border border-line bg-surface/80 backdrop-blur-sm",
        tone === "volt" && "shadow-glow-volt-sm border-volt/30",
        tone === "danger" && "border-danger/30",
        className,
      )}
    >
      <span className={cn("absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2", tick)} />
      <span className={cn("absolute -right-px -top-px h-2 w-2 border-r-2 border-t-2", tick)} />
      <span className={cn("absolute -bottom-px -left-px h-2 w-2 border-b-2 border-l-2", tick)} />
      <span className={cn("absolute -bottom-px -right-px h-2 w-2 border-b-2 border-r-2", tick)} />
      {children}
    </div>
  );
}
