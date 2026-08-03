"use client";

import { useRef } from "react";
import { Silhouette } from "./silhouette";
import type { ScanAngle } from "@/lib/engine/types";

export function CaptureSlot({
  angle,
  label,
  previewUrl,
  onCapture,
}: {
  angle: ScanAngle;
  label: string;
  previewUrl?: string;
  onCapture: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
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
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onCapture(file);
          e.target.value = "";
        }}
      />
      <span className="hud-label">{label}</span>
    </div>
  );
}
