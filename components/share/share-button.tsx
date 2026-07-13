"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { HUD_EASE } from "@/components/motion/primitives";
import {
  generateShareCard,
  shareOrDownload,
  type SharePayload,
} from "@/lib/share/card";

/**
 * Génère la carte story 1080×1920 (photo optionnelle) puis ouvre la share sheet.
 * Titre et légende sont éditables avant génération.
 */
export function ShareButton({ payload }: { payload: SharePayload }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState(payload.title);
  const [detail, setDetail] = useState(payload.detail ?? "");

  async function generate(photo?: File) {
    setBusy(true);
    try {
      const blob = await generateShareCard(
        {
          ...payload,
          title: title.trim() || payload.title,
          detail: detail.trim() || undefined,
        },
        photo,
      );
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      await shareOrDownload(blob, `ascent-${payload.kind}-day${payload.day}.png`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="hud-label mb-1 block">Titre</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={26}
            className="h-10 w-full border border-line bg-void px-3 font-display text-xs font-bold uppercase tracking-wide text-ink outline-none transition-colors focus:border-volt"
          />
        </label>
        <label className="block">
          <span className="hud-label mb-1 block">Légende</span>
          <input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={38}
            placeholder="6h12 · avant la chaleur"
            className="h-10 w-full border border-line bg-void px-3 font-mono text-xs text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-volt"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          size="md"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          📷 Avec photo
        </Button>
        <Button
          variant="ghost"
          size="md"
          disabled={busy}
          onClick={() => generate()}
        >
          Partager
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) generate(file);
          e.target.value = "";
        }}
      />
      <AnimatePresence>
        {preview && (
          <motion.img
            key={preview}
            src={preview}
            alt="Carte de partage générée"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: HUD_EASE }}
            className="mx-auto w-40 border border-line"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
