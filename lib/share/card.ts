// Générateur de carte de partage — format story 1080×1920, esthétique
// Volt Protocol. 100% client (canvas), photo optionnelle en fond.

export interface SharePayload {
  kind: "run" | "recovery";
  title: string;
  xp?: number;
  flawless?: boolean;
  multiplier?: number;
  day: number;
  totalDays: number;
  dateLabel: string;
}

const W = 1080;
const H = 1920;
const VOLT = "#C8FF00";
const INK_DIM = "#9AA3B2";
const INK_MUTE = "#5C6470";

function resolveFont(cssVar: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const span = document.createElement("span");
  span.style.fontFamily = `var(${cssVar})`;
  span.style.position = "absolute";
  span.style.visibility = "hidden";
  document.body.appendChild(span);
  const family = getComputedStyle(span).fontFamily || fallback;
  span.remove();
  return family;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
) {
  const scale = Math.max(W / img.width, H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function corner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
) {
  const L = 42;
  ctx.strokeStyle = VOLT;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + dx * L, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + dy * L);
  ctx.stroke();
}

async function loadPhoto(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } finally {
    // révoqué après le draw par le caller — on garde l'URL vivante ici
  }
}

export async function generateShareCard(
  payload: SharePayload,
  photo?: File,
): Promise<Blob> {
  await document.fonts.ready;
  const display = resolveFont("--font-display", "sans-serif");
  const mono = resolveFont("--font-mono", "monospace");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── fond ──
  ctx.fillStyle = "#0A0B0D";
  ctx.fillRect(0, 0, W, H);
  if (photo) {
    const img = await loadPhoto(photo);
    drawCover(ctx, img);
    URL.revokeObjectURL(img.src);
    // voile pour la lisibilité
    ctx.fillStyle = "rgba(10,11,13,0.30)";
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, H * 0.35, 0, H);
    grad.addColorStop(0, "rgba(10,11,13,0)");
    grad.addColorStop(1, "rgba(10,11,13,0.94)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    const gradTop = ctx.createLinearGradient(0, 0, 0, 300);
    gradTop.addColorStop(0, "rgba(10,11,13,0.85)");
    gradTop.addColorStop(1, "rgba(10,11,13,0)");
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, W, 300);
  } else {
    // grille technique discrète
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  const M = 84; // marge

  // ── header : wordmark + jour ──
  ctx.textBaseline = "top";
  ctx.fillStyle = "#E6EAF2";
  ctx.font = `700 52px ${display}`;
  const word = "A S C E N T";
  ctx.fillText(word, M, M);
  const wordWidth = ctx.measureText(word).width;
  ctx.fillStyle = VOLT;
  ctx.shadowColor = VOLT;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(M + wordWidth + 34, M + 30, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = INK_MUTE;
  ctx.font = `500 30px ${mono}`;
  ctx.textAlign = "right";
  ctx.fillText(`DAY ${payload.day}/${payload.totalDays}`, W - M, M + 12);
  ctx.textAlign = "left";

  // ── bloc bas ──
  let y = H - 420;

  ctx.fillStyle = INK_MUTE;
  ctx.font = `500 30px ${mono}`;
  const label =
    payload.kind === "run" ? "R U N   T E R M I N É" : "R E C O V E R Y   D O N E";
  ctx.fillText(label, M, y);
  y += 62;

  ctx.fillStyle = "#E6EAF2";
  ctx.font = `700 88px ${display}`;
  ctx.fillText(payload.title.toUpperCase(), M, y, W - 2 * M);
  y += 128;

  if (payload.xp !== undefined) {
    ctx.fillStyle = VOLT;
    ctx.shadowColor = VOLT;
    ctx.shadowBlur = 46;
    ctx.font = `700 150px ${display}`;
    const xpText = `+${payload.xp.toLocaleString("fr-FR")} XP`;
    ctx.fillText(xpText, M, y);
    ctx.shadowBlur = 0;

    if (payload.flawless) {
      const xpWidth = ctx.measureText(xpText).width;
      ctx.font = `500 30px ${mono}`;
      const badge = "FLAWLESS";
      const bw = ctx.measureText(badge).width + 48;
      const bx = M + xpWidth + 44;
      const by = y + 52;
      ctx.strokeStyle = VOLT;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, 64);
      ctx.fillStyle = VOLT;
      ctx.fillText(badge, bx + 24, by + 18);
    }
    y += 190;
  } else {
    y += 20;
  }

  ctx.fillStyle = INK_DIM;
  ctx.font = `500 32px ${mono}`;
  const meta = [
    payload.dateLabel.toUpperCase(),
    payload.multiplier ? `×${payload.multiplier.toFixed(2)}` : null,
    "PROTOCOLE 90 JOURS",
  ]
    .filter(Boolean)
    .join("  ·  ");
  ctx.fillText(meta, M, y);

  // ── ticks de coin ──
  corner(ctx, 40, 40, 1, 1);
  corner(ctx, W - 40, 40, -1, 1);
  corner(ctx, 40, H - 40, 1, -1);
  corner(ctx, W - 40, H - 40, -1, -1);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob a échoué"))),
      "image/png",
    );
  });
}

/** Partage via la share sheet native, sinon téléchargement. */
export async function shareOrDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch {
      // partage annulé → fallback téléchargement
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
