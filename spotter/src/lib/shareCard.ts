import { APP_NAME } from "../config";

/**
 * Draws a shareable result card (1080 x 1350, the portrait size social apps
 * expect) and returns it as a PNG blob. Drawn locally on a canvas: no upload.
 */
export async function makeShareCard(input: { headline: string; big: string; unit: string; lines: string[]; date: Date }): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  await document.fonts?.ready;

  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0f14");
  bg.addColorStop(1, "#07090c");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.8, H * 0.1, 0, W * 0.8, H * 0.1, 700);
  glow.addColorStop(0, "rgba(212,255,58,0.22)");
  glow.addColorStop(1, "rgba(212,255,58,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // Mark and name.
  g.fillStyle = "#d4ff3a";
  roundRect(g, 80, 80, 88, 88, 22);
  g.fill();
  g.fillStyle = "#0b0e05";
  g.beginPath();
  g.arc(145, 114, 8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#0b0e05";
  g.lineCap = "round";
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(136, 124);
  g.lineTo(98, 137);
  g.stroke();
  g.font = "italic 800 64px 'Barlow Condensed', sans-serif";
  g.fillStyle = "#f2f5f8";
  g.fillText(APP_NAME.toUpperCase(), 196, 146);

  g.font = "600 40px 'Inter Variable', sans-serif";
  g.fillStyle = "#d4ff3a";
  g.fillText(input.headline.toUpperCase(), 80, 330);

  g.font = "italic 800 460px 'Barlow Condensed', sans-serif";
  g.fillStyle = "#f2f5f8";
  g.shadowColor = "rgba(212,255,58,0.45)";
  g.shadowBlur = 60;
  g.fillText(input.big, 64, 760);
  g.shadowBlur = 0;
  const bigW = g.measureText(input.big).width;
  g.font = "italic 700 96px 'Barlow Condensed', sans-serif";
  g.fillStyle = "#d4ff3a";
  g.fillText(input.unit.toUpperCase(), 64 + bigW + 24, 760);

  g.font = "500 44px 'Inter Variable', sans-serif";
  g.fillStyle = "#c1c9d4";
  input.lines.slice(0, 4).forEach((l, i) => g.fillText(l, 80, 900 + i * 70));

  g.fillStyle = "#232a35";
  g.fillRect(80, 1190, W - 160, 2);
  g.font = "500 34px 'Inter Variable', sans-serif";
  g.fillStyle = "#8994a3";
  g.fillText(`Coached live by ${APP_NAME} AI · ${input.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`, 80, 1260);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Share through the phone's share sheet when available, otherwise download the PNG. */
export async function shareOrDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: APP_NAME });
      return;
    } catch {
      // Cancelled: fall through to a download.
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
