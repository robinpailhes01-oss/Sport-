"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HUD_EASE } from "@/components/motion/primitives";
import { Silhouette } from "./silhouette";
import type { ScanAngle } from "@/lib/engine/types";

// "ready" couvre les deux cas — flux caméra en direct OU pas (permission
// refusée, contexte PWA sans accès webcam, etc.). Le chrono tourne dans les
// deux cas ; seule la façon de conclure diffère (capture directe vs bascule
// vers l'appareil photo natif du téléphone APRÈS le chrono, jamais avant).
type Phase = "loading" | "ready" | "counting" | "scanning" | "review";

const SCAN_LINES = (priorityLabel: string | null) => [
  "CALIBRAGE MORPHOLOGIQUE…",
  "RECOUPEMENT LEDGER…",
  priorityLabel ? `ZONE PRIORITAIRE : ${priorityLabel.toUpperCase()}` : "ANALYSE TERMINÉE",
];

function captureVideoFrame(video: HTMLVideoElement, maxDim = 1280, quality = 0.85): string {
  let { videoWidth: width, videoHeight: height } = video;
  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width);
    width = maxDim;
  } else if (height >= width && height > maxDim) {
    width = Math.round((width * maxDim) / height);
    height = maxDim;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Session de capture plein écran — chrono 3s, effet scan, revue avant validation. */
export function CameraCapture({
  angle,
  label,
  priorityLabel,
  onCapture,
  onClose,
  onFallback,
}: {
  angle: ScanAngle;
  label: string;
  /** Stat la plus faible de la semaine — vraie donnée du ledger, pas une analyse d'image */
  priorityLabel: string | null;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  /** Appelé APRÈS le chrono si aucun flux caméra n'était disponible — le
   * parent rouvre l'input natif, qui prend alors la photo lui-même. */
  onFallback: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [streamAvailable, setStreamAvailable] = useState(false);
  const [count, setCount] = useState(3);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function acquireCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStreamAvailable(false);
      setPhase("ready");
      return Promise.resolve();
    }
    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStreamAvailable(true);
        setPhase("ready");
      })
      .catch(() => {
        setStreamAvailable(false);
        setPhase("ready");
      });
  }

  useEffect(() => {
    let cancelled = false;
    acquireCamera().then(() => {
      if (cancelled) streamRef.current?.getTracks().forEach((t) => t.stop());
    });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le chrono tourne toujours ici, qu'il y ait un flux caméra ou non.
  useEffect(() => {
    if (phase !== "counting") return;
    if (count === 0) {
      const video = videoRef.current;
      if (streamAvailable && video) {
        setPhoto(captureVideoFrame(video));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setPhase("scanning");
      } else {
        // Rien à capturer nous-mêmes — le chrono a fait son travail,
        // l'appareil photo natif prend le relais maintenant.
        onFallback();
      }
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [phase, count, streamAvailable, onFallback]);

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setTimeout(() => setPhase("review"), 1400);
    return () => clearTimeout(t);
  }, [phase]);

  function startCountdown() {
    setCount(3);
    setPhase("counting");
  }

  function retake() {
    setPhoto(null);
    setPhase("loading");
    acquireCamera();
  }

  function confirm() {
    if (photo) onCapture(photo);
    onClose();
  }

  function close() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-void">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="hud-label">Scan — {label}</p>
        <button
          type="button"
          onClick={close}
          className="font-mono text-sm text-ink-mute hover:text-ink"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden bg-black">
        {streamAvailable && phase !== "scanning" && phase !== "review" && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {(phase === "ready" || phase === "counting") && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-ink">
            <Silhouette angle={angle} />
          </div>
        )}

        {!streamAvailable && phase === "ready" && (
          <p className="pointer-events-none absolute inset-x-4 top-4 text-center font-mono text-[10px] leading-relaxed text-ink-mute">
            Caméra intégrée indisponible — le chrono te prépare, puis
            l&apos;appareil photo du téléphone s&apos;ouvre.
          </p>
        )}

        {photo && (phase === "scanning" || phase === "review") && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        )}

        <AnimatePresence>
          {phase === "counting" && (
            <motion.div
              key={count}
              initial={{ opacity: 0, scale: 1.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.35, ease: HUD_EASE }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <span className="font-display text-8xl font-bold text-volt text-glow-volt">
                {count === 0 ? "●" : count}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "scanning" && (
          <>
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ duration: 1.1, ease: "linear" }}
              className="pointer-events-none absolute inset-x-0 h-1 bg-volt shadow-glow-volt"
              style={{ boxShadow: "0 0 24px 4px rgba(200,255,0,0.7)" }}
            />
            <div className="absolute inset-x-0 bottom-8 space-y-1.5 px-4">
              {SCAN_LINES(priorityLabel).map((line, i) => (
                <motion.p
                  key={line}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.35, duration: 0.3 }}
                  className="font-mono text-[11px] tracking-wide text-volt"
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </>
        )}

        {phase === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-xs text-ink-mute">Caméra…</p>
          </div>
        )}
      </div>

      <div className="border-t border-line p-4">
        {phase === "ready" && (
          <button
            type="button"
            onClick={startCountdown}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-volt bg-volt/20 shadow-glow-volt-sm active:scale-95"
            aria-label="Déclencher le scan"
          >
            <span className="h-11 w-11 rounded-full bg-volt" />
          </button>
        )}
        {phase === "review" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={retake}
              className="border border-line-bright py-3 font-display text-xs font-bold uppercase tracking-wide text-ink-dim"
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={confirm}
              className="bg-volt py-3 font-display text-xs font-bold uppercase tracking-wide text-void"
            >
              Valider
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
