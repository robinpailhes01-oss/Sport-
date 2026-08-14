"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { BodyScan, ScanAngle } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

// La vidéo d'évolution : tes scans d'un même angle enchaînés dans l'ordre,
// date incrustée. Rendu sur un canvas vertical (1080×1920) qu'on peut
// lire dans l'app puis exporter en fichier vidéo via MediaRecorder.

const W = 1080;
const H = 1920;
const MS_PER_FRAME = 450;

function frDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Charge les images à l'avance — sans ça, l'export capture des cadres vides. */
function loadImages(urls: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Image illisible"));
          img.src = url;
        }),
    ),
  );
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  date: string,
  index: number,
  total: number,
) {
  ctx.fillStyle = "#0A0B0D";
  ctx.fillRect(0, 0, W, H);

  // photo en "cover", centrée
  const scale = Math.max(W / img.width, H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);

  // dégradé bas pour asseoir le texte
  const grad = ctx.createLinearGradient(0, H - 460, 0, H);
  grad.addColorStop(0, "rgba(10,11,13,0)");
  grad.addColorStop(1, "rgba(10,11,13,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - 460, W, 460);

  // date
  ctx.fillStyle = "#C8FF00";
  ctx.font = "bold 64px 'Space Grotesk', system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(frDate(date).toUpperCase(), 72, H - 210);

  // progression
  ctx.fillStyle = "#9AA3B2";
  ctx.font = "32px 'JetBrains Mono', monospace";
  ctx.fillText(`SCAN ${index + 1} / ${total}`, 72, H - 150);

  // barre de progression
  ctx.fillStyle = "#23262E";
  ctx.fillRect(72, H - 110, W - 144, 6);
  ctx.fillStyle = "#C8FF00";
  ctx.fillRect(72, H - 110, ((W - 144) * (index + 1)) / total, 6);

  // signature
  ctx.fillStyle = "#F2F4F8";
  ctx.font = "bold 36px 'Space Grotesk', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("ASCENT", W - 72, H - 210);
  ctx.textAlign = "left";
}

export function EvolutionVideo({ scans }: { scans: BodyScan[] }) {
  const [angle, setAngle] = useState<ScanAngle>("face");
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Un angle donné, du plus ancien au plus récent — c'est le sens de l'histoire.
  const series = scans
    .filter((s) => s.angle === angle)
    .sort((a, b) => a.date.localeCompare(b.date));

  useEffect(() => {
    setPlaying(false);
    setMessage(null);
  }, [angle]);

  async function play() {
    const canvas = canvasRef.current;
    if (!canvas || series.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setPlaying(true);
    setMessage(null);
    try {
      const images = await loadImages(series.map((s) => s.url));
      for (let i = 0; i < images.length; i++) {
        drawFrame(ctx, images[i], series[i].date, i, images.length);
        await new Promise((r) => setTimeout(r, MS_PER_FRAME));
      }
    } catch {
      setMessage("Impossible de charger les photos.");
    } finally {
      setPlaying(false);
    }
  }

  async function exportVideo() {
    const canvas = canvasRef.current;
    if (!canvas || series.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setExporting(true);
    setMessage(null);
    try {
      const images = await loadImages(series.map((s) => s.url));
      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });

      recorder.start();
      for (let i = 0; i < images.length; i++) {
        drawFrame(ctx, images[i], series[i].date, i, images.length);
        await new Promise((r) => setTimeout(r, MS_PER_FRAME));
      }
      // dernier cadre tenu un peu plus longtemps — la fin doit respirer
      await new Promise((r) => setTimeout(r, 700));
      recorder.stop();

      const blob = await done;
      const file = new File([blob], `ascent-evolution-${angle}.webm`, {
        type: "video/webm",
      });

      // Partage natif si possible (mobile), téléchargement sinon.
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ASCENT — Évolution" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        setMessage("Vidéo téléchargée.");
      }
    } catch {
      setMessage("L'export a échoué sur ce navigateur.");
    } finally {
      setExporting(false);
    }
  }

  const ANGLES: { key: ScanAngle; label: string }[] = [
    { key: "face", label: "Face" },
    { key: "profil", label: "Profil" },
    { key: "dos", label: "Dos" },
  ];

  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="hud-label">Vidéo d&apos;évolution</p>
        <span className="font-mono text-[10px] text-ink-mute">
          {series.length} scan{series.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="mb-3 flex gap-1.5">
        {ANGLES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setAngle(key)}
            className={cn(
              "flex-1 border py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors",
              angle === key
                ? "border-volt text-volt"
                : "border-line text-ink-mute hover:border-line-bright",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="mx-auto block w-full max-w-[260px] border border-line bg-void"
      />

      {series.length < 2 ? (
        <p className="mt-3 text-center font-mono text-[11px] leading-relaxed text-ink-mute">
          Il faut au moins 2 scans « {angle} » pour monter une évolution.
          <br />
          Reviens dans quelques semaines.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" size="md" onClick={play} disabled={playing || exporting}>
            {playing ? "Lecture…" : "▶ Lire"}
          </Button>
          <Button size="md" onClick={exportVideo} disabled={playing || exporting}>
            {exporting ? "Montage…" : "Exporter"}
          </Button>
        </div>
      )}

      {message && (
        <p className="mt-2 text-center font-mono text-[11px] text-ink-dim">
          {message}
        </p>
      )}
    </Panel>
  );
}
