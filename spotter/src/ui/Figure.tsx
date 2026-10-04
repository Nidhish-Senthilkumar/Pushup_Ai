import { useEffect, useMemo, useRef } from "react";
import { BONES } from "../engine/types";
import { scenePose, type PoseSpec, type View } from "../engine/synthetic";

/**
 * An animated stick figure doing the exercise, drawn from the same 3D
 * skeleton the engine is tested with. Shows the movement in the library and
 * on the setup screen without any video files.
 */

export const DEMO_VIEW: Record<string, View> = {
  pushup: "side",
  squat: "angled",
  "jumping-jack": "front",
  plank: "side",
  lunge: "side",
  curl: "angled",
  press: "front",
  "lateral-raise": "front",
  bridge: "side",
  situp: "side",
  "high-knees": "angled",
  "wall-sit": "side",
  burpee: "side",
};

const FRAMES = 48;

function specAt(id: string, k: number, faults?: Record<string, number>): PoseSpec {
  // Cycle: down for 40%, hold 10%, up 40%, rest 10%.
  const x = k / FRAMES;
  const ease = (v: number) => 0.5 - 0.5 * Math.cos(Math.PI * v);
  const d = x < 0.4 ? ease(x / 0.4) : x < 0.5 ? 1 : x < 0.9 ? ease(1 - (x - 0.5) / 0.4) : 0;
  if (id === "plank" || id === "wall-sit") return { exerciseId: id, d: 0, faults };
  if (id === "lunge") return { exerciseId: id, d, lead: "left", faults };
  if (id === "high-knees") return { exerciseId: id, d, dL: d, dR: 0, faults };
  return { exerciseId: id, d, faults };
}

export function Figure({
  exerciseId,
  className = "",
  speed = 1,
  faults,
  title,
  view,
}: {
  exerciseId: string;
  className?: string;
  speed?: number;
  faults?: Record<string, number>;
  title?: string;
  view?: View;
}) {
  const v = view ?? DEMO_VIEW[exerciseId] ?? "side";
  const frames = useMemo(() => {
    const out = [];
    for (let k = 0; k < FRAMES; k++) out.push(scenePose(specAt(exerciseId, k, faults), v));
    // High knees alternate legs: second half of the loop mirrors the first.
    if (exerciseId === "high-knees") for (let k = 0; k < FRAMES; k++) out.push(scenePose({ exerciseId, d: 0, dL: 0, dR: specAt(exerciseId, k).d }, v));
    return out;
  }, [exerciseId, faults, v]);

  const box = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const f of frames) for (const p of f) {
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, -p.y);
      y1 = Math.max(y1, -p.y);
    }
    const pad = 0.18;
    const floor = Math.max(y1, 0);
    return { x: x0 - pad, y: y0 - pad - 0.1, w: x1 - x0 + 2 * pad, h: floor - y0 + 2 * pad + 0.1, floor: Math.min(0, -0) };
  }, [frames]);

  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const bones = [...svg.querySelectorAll<SVGLineElement>("line[data-bone]")];
    const head = svg.querySelector<SVGCircleElement>("circle[data-head]");
    let raf = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const draw = (now: number) => {
      const period = (exerciseId === "jumping-jack" || exerciseId === "high-knees" ? 1100 : 2400) / speed;
      const loop = frames.length / FRAMES;
      const k = reduce ? Math.floor(FRAMES * 0.45) : Math.floor((((now - start) / (period * loop)) % 1) * frames.length);
      const f = frames[k] ?? frames[0]!;
      // Depth: points nearer the camera (larger z) are brighter.
      bones.forEach((el, i) => {
        const [a, b] = BONES[i]!;
        const pa = f[a]!;
        const pb = f[b]!;
        el.setAttribute("x1", String(pa.x));
        el.setAttribute("y1", String(-pa.y));
        el.setAttribute("x2", String(pb.x));
        el.setAttribute("y2", String(-pb.y));
        const z = (pa.z + pb.z) / 2;
        el.setAttribute("stroke-opacity", String(v === "front" ? 1 : z < -0.02 ? 0.38 : 1));
      });
      if (head) {
        const n = f[0]!;
        const le = f[7]!;
        const re = f[8]!;
        head.setAttribute("cx", String((n.x + le.x + re.x) / 3));
        head.setAttribute("cy", String(-(n.y + le.y + re.y) / 3));
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [frames, speed, exerciseId, v]);

  return (
    <svg ref={svgRef} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className={className} role="img" aria-label={title ?? `Animated demonstration of the exercise`}>
      <defs>
        <linearGradient id={`floor-${exerciseId}`} x1="0" x2="1">
          <stop offset="0" stopColor="#d4ff3a" stopOpacity="0" />
          <stop offset="0.5" stopColor="#d4ff3a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#d4ff3a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={box.x} x2={box.x + box.w} y1={0.005} y2={0.005} stroke={`url(#floor-${exerciseId})`} strokeWidth={0.012} />
      <g stroke="#d4ff3a" strokeWidth={0.045} strokeLinecap="round">
        {BONES.map((_, i) => (
          <line key={i} data-bone="" />
        ))}
      </g>
      <circle data-head="" r={0.1} fill="#0b0e05" stroke="#d4ff3a" strokeWidth={0.04} />
    </svg>
  );
}
