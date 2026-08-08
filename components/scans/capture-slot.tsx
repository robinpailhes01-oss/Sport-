"use client";

import { Silhouette } from "./silhouette";
import type { ScanAngle } from "@/lib/engine/types";

export function CaptureSlot({
  angle,
  label,
  previewUrl,
  onClick,
}: {
  angle: ScanAngle;
  label: string;
  previewUrl?: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Scanner — ${label}`}
        className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden border border-line bg-void text-ink-mute transition-colors hover:border-line-bright"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Scan ${label}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Silhouette angle={angle} />
        )}
        {!previewUrl && (
          <span className="absolute bottom-1.5 font-mono text-[9px] tracking-micro">
            📷
          </span>
        )}
      </button>
      <span className="hud-label">{label}</span>
    </div>
  );
}
