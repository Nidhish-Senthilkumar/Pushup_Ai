import { BONES } from "../engine/types";

/** Draws a stored skeleton snapshot (33 points scaled to a unit box), with some joints marked as faulty. */
export function PoseSnapshot({ pose, joints = [], className = "", label }: { pose: number[]; joints?: number[]; className?: string; label: string }) {
  if (pose.length < 66) return null;
  const P = (i: number) => ({ x: pose[2 * i]!, y: pose[2 * i + 1]! });
  const bad = new Set(joints);
  let w = 0;
  let h = 0;
  for (let i = 0; i < 33; i++) {
    w = Math.max(w, P(i).x);
    h = Math.max(h, P(i).y);
  }
  const pad = 0.08;
  const head = P(0);
  return (
    <svg viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`} className={className} role="img" aria-label={label}>
      <g strokeLinecap="round" strokeWidth={0.025}>
        {BONES.map(([a, b], i) => {
          const p = P(a);
          const q = P(b);
          const isBad = bad.has(a) || bad.has(b);
          return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={isBad ? "#ff6b6b" : "#d4ff3a"} />;
        })}
      </g>
      {[...bad].map((j) => (
        <circle key={j} cx={P(j).x} cy={P(j).y} r={0.05} fill="rgba(255,92,92,0.35)" />
      ))}
      <circle cx={head.x} cy={head.y} r={0.045} fill="none" stroke="#d4ff3a" strokeWidth={0.02} />
    </svg>
  );
}
