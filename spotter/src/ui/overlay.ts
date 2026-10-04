import { BONES, type PoseFrame } from "../engine/types";

/**
 * Draws the skeleton over the camera picture. Shapes only, no text, so the
 * canvas can be mirrored along with a selfie camera without text coming out
 * backwards. Joints involved in a form fault glow red.
 */
export function drawSkeleton(
  canvas: HTMLCanvasElement,
  frame: PoseFrame | null,
  opts: { highlight: number[]; color?: string; progress?: number | null; clear?: boolean },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (frame && frame.width && (canvas.width !== frame.width || canvas.height !== frame.height)) {
    canvas.width = frame.width;
    canvas.height = frame.height;
  }
  if (opts.clear !== false) ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!frame || frame.landmarks.length < 33) return;
  const lm = frame.landmarks;
  const unit = Math.max(2, frame.width / 360);
  const color = opts.color ?? "#d4ff3a";
  const bad = new Set(opts.highlight);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // A dark under-stroke keeps the skeleton readable on bright backgrounds.
  for (const pass of [0, 1]) {
    for (const [a, b] of BONES) {
      const p = lm[a]!;
      const q = lm[b]!;
      if (p.visibility < 0.35 || q.visibility < 0.35) continue;
      const faint = Math.min(p.visibility, q.visibility) < 0.6;
      ctx.strokeStyle = pass === 0 ? "rgba(0,0,0,0.45)" : bad.has(a) || bad.has(b) ? "#ff5c5c" : faint ? `${color}73` : color;
      ctx.lineWidth = pass === 0 ? unit * 3.4 : unit * 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
  }
  const joints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (const i of joints) {
    const p = lm[i]!;
    if (p.visibility < 0.35) continue;
    const isBad = bad.has(i);
    if (isBad) {
      ctx.fillStyle = "rgba(255,92,92,0.28)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, unit * 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = isBad ? "#ff5c5c" : "#ffffff";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = unit;
    ctx.beginPath();
    ctx.arc(p.x, p.y, unit * (isBad ? 4 : 3), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Head.
  const nose = lm[0]!;
  if (nose.visibility > 0.5) {
    ctx.strokeStyle = color;
    ctx.lineWidth = unit * 1.5;
    ctx.beginPath();
    ctx.arc(nose.x, nose.y, unit * 7, 0, Math.PI * 2);
    ctx.stroke();
  }
}
