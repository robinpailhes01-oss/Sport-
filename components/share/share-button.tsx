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

/** Génère la carte story 1080×1920 (photo optionnelle) puis ouvre la share sheet. */
export function ShareButton({ payload }: { payload: SharePayload }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function generate(photo?: File) {
    setBusy(true);
    try {
      const blob = await generateShareCard(payload, photo);
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
