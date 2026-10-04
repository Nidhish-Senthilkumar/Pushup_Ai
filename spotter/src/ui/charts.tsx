import { useState, type ReactNode } from "react";
import type { RepResult } from "../engine/session";

/**
 * Small SVG charts. Conventions: thin marks with rounded data ends, hairline
 * recessive grids, text in text colours (never the series colour), a hover
 * tooltip on every mark, and a hidden table so screen readers get the numbers.
 */

const INK_MUTED = "#8994a3";
const GRID = "#232a35";
const SERIES = "#38e1ff";
const QUALITY_COLOR = { perfect: "#0ca30c", good: "#0ca30c", fair: "#fab219", poor: "#ec835a" } as const;
const QUALITY_LABEL = { perfect: "Perfect", good: "Good", fair: "Fair", poor: "Poor" } as const;

/** Tooltip placed over the hovered mark, kept inside the chart. `at` is 0..1 across the chart width. */
function Tip({ at, children }: { at: number; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute -top-2 z-10 w-[150px] -translate-y-full rounded-lg border border-line-2 bg-raised px-2.5 py-1.5 text-xs shadow-xl" style={{ left: `clamp(0px, calc(${(at * 100).toFixed(2)}% - 75px), calc(100% - 150px))` }}>
      {children}
    </div>
  );
}

/** Per-rep form score, coloured by quality (with the quality named in the tooltip and table). */
export function RepBars({ reps, height = 150 }: { reps: RepResult[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const padL = 30;
  const padB = 22;
  const n = Math.max(reps.length, 1);
  const slot = (W - padL) / n;
  const bw = Math.min(24, slot * 0.62);
  const y = (v: number) => (H - padB) * (1 - v / 100) + 4;
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Form score for each of ${reps.length} reps`}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill={INK_MUTED}>
              {v}
            </text>
          </g>
        ))}
        {reps.map((r, i) => {
          const x = padL + i * slot + (slot - bw) / 2;
          const top = y(Math.max(4, r.score));
          const base = y(0);
          const rr = Math.min(4, bw / 2);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * slot} y={0} width={slot} height={H} fill="transparent" />
              <path
                d={`M${x},${base} L${x},${top + rr} Q${x},${top} ${x + rr},${top} L${x + bw - rr},${top} Q${x + bw},${top} ${x + bw},${top + rr} L${x + bw},${base} Z`}
                fill={QUALITY_COLOR[r.quality]}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              {(n <= 20 || i % Math.ceil(n / 20) === 0) && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={INK_MUTED}>
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && reps[hover] && (
        <Tip at={(padL + hover * slot + slot / 2) / W}>
          <div className="font-semibold text-ink">
            Rep {hover + 1} · {reps[hover]!.score}
          </div>
          <div className="text-muted">
            {QUALITY_LABEL[reps[hover]!.quality]}
            {reps[hover]!.faults.length ? ` · ${reps[hover]!.faults.length} fault${reps[hover]!.faults.length > 1 ? "s" : ""}` : ""}
          </div>
        </Tip>
      )}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-2" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-good" /> Clean or good</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-warn" /> Fair</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-serious" /> Poor</span>
      </div>
      <table className="sr-only">
        <caption>Rep scores</caption>
        <thead>
          <tr>
            <th>Rep</th>
            <th>Score</th>
            <th>Quality</th>
          </tr>
        </thead>
        <tbody>
          {reps.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.score}</td>
              <td>{QUALITY_LABEL[r.quality]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Rep progress over the set, with the full-depth line. One series, so no legend: the title names it. */
export function DepthTrace({ trace, depthAt, reps, height = 150 }: { trace: { t: number; p: number }[]; depthAt: number; reps: RepResult[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (trace.length < 2) return null;
  const W = 640;
  const H = height;
  const padL = 30;
  const padB = 20;
  const t1 = trace[trace.length - 1]!.t || 1;
  const x = (t: number) => padL + ((W - padL - 6) * t) / t1;
  const y = (p: number) => 6 + (H - padB - 6) * (1 - Math.max(-0.1, Math.min(1.25, p)) / 1.25);
  const d = trace.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)},${y(s.p).toFixed(1)}`).join(" ");
  const area = `${d} L${x(t1)},${y(0)} L${x(0)},${y(0)} Z`;
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width) * W;
    const tt = ((t - padL) / (W - padL - 6)) * t1;
    let best = 0;
    for (let i = 0; i < trace.length; i++) if (Math.abs(trace[i]!.t - tt) < Math.abs(trace[best]!.t - tt)) best = i;
    setHover(best);
  };
  const h = hover !== null ? trace[hover] : null;
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Depth over the set, with the full-depth line" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <line x1={padL} x2={W} y1={y(0)} y2={y(0)} stroke="#2f3846" strokeWidth={1} />
        <line x1={padL} x2={W} y1={y(depthAt)} y2={y(depthAt)} stroke={GRID} strokeWidth={1} />
        <text x={padL - 6} y={y(depthAt) + 4} textAnchor="end" fontSize={10} fill={INK_MUTED}>
          full
        </text>
        <text x={padL - 6} y={y(0) + 4} textAnchor="end" fontSize={10} fill={INK_MUTED}>
          top
        </text>
        <path d={area} fill={SERIES} opacity={0.1} />
        <path d={d} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {reps.map((r) => (
          <circle key={r.index} cx={x(r.t)} cy={y(0.05)} r={4} fill={r.clean ? "#0ca30c" : "#fab219"} stroke="#10141a" strokeWidth={2} />
        ))}
        {h && (
          <g>
            <line x1={x(h.t)} x2={x(h.t)} y1={6} y2={H - padB} stroke="#5b6574" strokeWidth={1} />
            <circle cx={x(h.t)} cy={y(h.p)} r={4.5} fill={SERIES} stroke="#10141a" strokeWidth={2} />
          </g>
        )}
        <text x={W - 4} y={H - 4} textAnchor="end" fontSize={11} fill={INK_MUTED}>
          {Math.round(t1 / 1000)} s
        </text>
      </svg>
      {h && (
        <Tip at={x(h.t) / W}>
          <div className="font-semibold text-ink">{(h.t / 1000).toFixed(1)} s</div>
          <div className="text-muted">Depth {Math.round(Math.max(0, h.p) * 100)}% of full</div>
        </Tip>
      )}
    </div>
  );
}

/** Daily activity columns for the last weeks. One series. */
export function DayBars({ days, height = 120 }: { days: { day: Date; reps: number; workouts: number }[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const padB = 20;
  const max = Math.max(10, ...days.map((d) => d.reps));
  const nice = Math.ceil(max / 10) * 10;
  const slot = W / days.length;
  const bw = Math.min(24, slot * 0.6);
  const y = (v: number) => 4 + (H - padB - 4) * (1 - v / nice);
  const label = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Reps per day">
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#2f3846" strokeWidth={1} />
        <line x1={0} x2={W} y1={y(nice)} y2={y(nice)} stroke={GRID} strokeWidth={1} />
        <text x={W} y={y(nice) + 12} textAnchor="end" fontSize={11} fill={INK_MUTED}>
          {nice}
        </text>
        {days.map((d, i) => {
          const x = i * slot + (slot - bw) / 2;
          const top = y(d.reps);
          const base = y(0);
          const rr = Math.min(4, bw / 2, base - top);
          const today = i === days.length - 1;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {d.reps > 0 && (
                <path d={`M${x},${base} L${x},${top + rr} Q${x},${top} ${x + rr},${top} L${x + bw - rr},${top} Q${x + bw},${top} ${x + bw},${top + rr} L${x + bw},${base} Z`} fill={today ? "#d4ff3a" : SERIES} opacity={hover === null || hover === i ? 1 : 0.5} />
              )}
              <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize={11} fill={today ? "#f2f5f8" : INK_MUTED}>
                {label(d.day)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && days[hover] && (
        <Tip at={((hover + 0.5) * slot) / W}>
          <div className="font-semibold text-ink">{days[hover]!.day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
          <div className="text-muted">
            {days[hover]!.reps} reps · {days[hover]!.workouts} workout{days[hover]!.workouts === 1 ? "" : "s"}
          </div>
        </Tip>
      )}
      <table className="sr-only">
        <caption>Reps per day</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={i}>
              <td>{d.day.toDateString()}</td>
              <td>{d.reps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Form score of recent sets, oldest to newest. One series, labelled at the end. */
export function TrendLine({ points, height = 130 }: { points: { label: string; v: number }[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <p className="text-sm text-muted">Do a few more sets to see your form trend.</p>;
  const W = 640;
  const H = height;
  const padL = 30;
  const padR = 40;
  const x = (i: number) => padL + ((W - padL - padR) * i) / (points.length - 1);
  const y = (v: number) => 8 + (H - 28) * (1 - v / 100);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join(" ");
  const last = points[points.length - 1]!;
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Form score over recent sets">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill={INK_MUTED}>
              {v}
            </text>
          </g>
        ))}
        <path d={d} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={x(i)} cy={y(p.v)} r={12} fill="transparent" />
            <circle cx={x(i)} cy={y(p.v)} r={hover === i || i === points.length - 1 ? 5 : 3.5} fill={SERIES} stroke="#10141a" strokeWidth={2} />
          </g>
        ))}
        <text x={x(points.length - 1) + 10} y={y(last.v) + 4} fontSize={12} fontWeight={600} fill="#f2f5f8">
          {last.v}
        </text>
      </svg>
      {hover !== null && points[hover] && (
        <Tip at={x(hover) / W}>
          <div className="font-semibold text-ink">Score {points[hover]!.v}</div>
          <div className="text-muted">{points[hover]!.label}</div>
        </Tip>
      )}
      <table className="sr-only">
        <caption>Form score per set</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{p.label}</td>
              <td>{p.v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Calendar of the last 12 weeks: one cell per day, brighter for more reps (one hue, sequential). */
export function Heatmap({ days }: { days: { day: Date; reps: number }[] }) {
  const steps = ["#171c24", "#184f95", "#256abf", "#3987e5", "#86b6ef"];
  const max = Math.max(1, ...days.map((d) => d.reps));
  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, 1 + Math.floor((3 * v) / max)));
  const first = days[0]?.day.getDay() ?? 0;
  const cells = [...Array(first).fill(null), ...days];
  const weeks = Math.ceil(cells.length / 7);
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }} role="img" aria-label="Activity calendar for the last 12 weeks">
        {cells.map((c, i) =>
          c ? <div key={i} className="aspect-square rounded-[3px]" style={{ background: steps[level(c.reps)] }} title={`${c.day.toDateString()}: ${c.reps} reps`} /> : <div key={i} />,
        )}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted" aria-hidden="true">
        Less {steps.map((s) => <i key={s} className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: s }} />)} More
      </div>
    </div>
  );
}
