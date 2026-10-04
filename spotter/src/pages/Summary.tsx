import { useEffect, useMemo } from "react";
import { coachReport, type CoachPoint } from "../engine/coach";
import { getExercise } from "../engine/exercises";
import { href } from "../lib/router";
import { makeShareCard, shareOrDownload } from "../lib/shareCard";
import { sfx } from "../lib/sounds";
import { ACHIEVEMENTS, levelOf, totalXp } from "../lib/progress";
import { useData, type SetRecord } from "../lib/store";
import { DepthTrace, RepBars } from "../ui/charts";
import { Figure } from "../ui/Figure";
import { Icon } from "../ui/icons";
import { PoseSnapshot } from "../ui/PoseSnapshot";

const POINT_STYLE: Record<CoachPoint["kind"], { label: string; cls: string }> = {
  win: { label: "Nice", cls: "bg-good/20 text-good-ink" },
  fix: { label: "Fix", cls: "bg-warn/15 text-warn" },
  trend: { label: "Trend", cls: "bg-cyan/15 text-cyan" },
  tip: { label: "Tip", cls: "bg-raised text-ink-2" },
};

export function Summary({ id }: { id: string }) {
  const data = useData();
  const w = data.workouts.find((x) => x.id === id);
  const fresh = w && Date.now() - w.endedAt < 15_000;

  useEffect(() => {
    if (fresh && (w.prs?.length || w.achievements?.length)) sfx.fanfare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const earlierSets = useMemo(() => {
    if (!w) return [];
    return data.workouts.filter((x) => x.startedAt < w.startedAt).flatMap((x) => x.sets);
  }, [data.workouts, w]);

  if (!w) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-ink-2">This workout isn't on this device.</p>
        <a className="btn btn-volt" href={href("/")}>
          Home
        </a>
      </div>
    );
  }

  const reps = w.sets.reduce((s, x) => s + x.reps.length, 0);
  const clean = w.sets.reduce((s, x) => s + x.cleanCount, 0);
  const holdS = Math.round(w.sets.reduce((s, x) => s + x.goodHoldMs, 0) / 1000);
  const scored = w.sets.filter((s) => s.reps.length || s.holdMs);
  const form = scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : 0;
  const mins = Math.max(1, Math.round((w.endedAt - w.startedAt) / 60000));
  const xpNow = totalXp(data);
  const lvlNow = levelOf(xpNow);
  const lvlBefore = levelOf(xpNow - w.xp);
  const single = w.sets.length === 1 ? w.sets[0] : null;
  const singleEx = single ? getExercise(single.exerciseId) : null;
  const again = single ? `/go?ex=${single.exerciseId}${single.target?.reps ? `&reps=${single.target.reps}` : ""}${single.target?.ms ? `&ms=${single.target.ms}` : ""}` : w.planId ? "/plans" : null;

  const share = async () => {
    const big = single && single.kind === "hold" ? String(Math.round(single.goodHoldMs / 1000)) : String(reps || holdS);
    const unit = single && single.kind === "hold" ? "seconds" : reps ? "reps" : "seconds";
    const blob = await makeShareCard({
      headline: singleEx ? singleEx.name : w.title,
      big,
      unit,
      lines: [`Form score ${form}/100`, reps ? `${clean} clean reps of ${reps}` : `${holdS} s in good form`, `${mins} min · +${w.xp} XP`],
      date: new Date(w.startedAt),
    });
    if (blob) await shareOrDownload(blob, `cadence-${w.id}.png`);
  };

  return (
    <div className="space-y-6" data-testid="summary">
      <a href={href("/progress")} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon.back size={18} /> Progress
      </a>
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-28 -right-20 h-80 w-80 rounded-full bg-volt/12 blur-3xl" />
        <div className="relative">
          <div className="text-xs font-bold tracking-[0.14em] text-volt uppercase">{fresh ? "Workout complete" : new Date(w.startedAt).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
          <h1 className="display mt-1 text-5xl sm:text-6xl">{w.title}</h1>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Big label={reps ? "Reps" : "Seconds held"} value={String(reps || holdS)} testid="summary-reps" />
            <Big label="Clean reps" value={reps ? `${clean}` : "–"} />
            <Big label="Form score" value={String(form)} accent />
            <Big label="Time" value={`${mins} min`} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="chip border-volt/40 text-volt">
              <Icon.bolt size={14} /> +{w.xp} XP
            </span>
            {lvlNow.level > lvlBefore.level && fresh && (
              <span className="chip animate-pop border-volt bg-volt text-black">
                <Icon.star size={14} /> Level {lvlNow.level}!
              </span>
            )}
            <span className="chip" title="Estimated from MET values; a rough guide only">
              ~{Math.round(w.kcal)} kcal (estimate)
            </span>
          </div>
          {(w.prs?.length ?? 0) > 0 && (
            <div className="mt-5 flex flex-wrap gap-2" data-testid="prs">
              {w.prs!.map((p) => (
                <span key={p} className="inline-flex animate-pop items-center gap-2 rounded-full bg-warn/15 px-3 py-1.5 text-sm font-semibold text-warn">
                  <Icon.trophy size={16} /> {p}
                </span>
              ))}
            </div>
          )}
          {(w.achievements?.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {w.achievements!.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                return a ? (
                  <span key={id} className="inline-flex animate-pop items-center gap-2 rounded-full bg-volt/15 px-3 py-1.5 text-sm font-semibold text-volt">
                    <Icon.medal size={16} /> Unlocked: {a.title}
                  </span>
                ) : null;
              })}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {again && (
              <a className="btn btn-volt" href={href(again)}>
                <Icon.refresh size={18} /> {single ? "Go again" : "Back to plan"}
              </a>
            )}
            <button className="btn btn-ghost" onClick={() => void share()}>
              <Icon.share size={18} /> Share card
            </button>
            <a className="btn btn-ghost" href={href("/")}>
              Done
            </a>
          </div>
        </div>
      </section>

      {w.sets.map((s, i) => (
        <SetCard key={i} set={s} index={i} total={w.sets.length} previous={earlierSets.filter((p) => p.exerciseId === s.exerciseId).sort((a, b) => b.startedAt - a.startedAt)} />
      ))}
    </div>
  );
}

function Big({ label, value, accent, testid }: { label: string; value: string; accent?: boolean; testid?: string }) {
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-0.5 text-4xl font-semibold sm:text-5xl ${accent ? "text-volt" : ""}`} data-testid={testid}>
        {value}
      </div>
    </div>
  );
}

function SetCard({ set, index, total, previous }: { set: SetRecord; index: number; total: number; previous: SetRecord[] }) {
  const ex = getExercise(set.exerciseId);
  if (!ex) return null;
  const report = coachReport(ex, set, previous);
  return (
    <section className="card p-5 sm:p-6" aria-label={`${ex.name} set`}>
      <div className="flex items-center gap-4">
        <Figure exerciseId={ex.id} className="h-16 w-16 shrink-0 rounded-xl bg-raised/70" speed={0.7} />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">{total > 1 ? `Set ${index + 1} of ${total}` : "Set"}</div>
          <h2 className="truncate text-xl font-bold">{ex.name}</h2>
          <div className="text-sm text-ink-2">
            {set.kind === "hold"
              ? `${Math.round(set.holdMs / 1000)} s held · ${Math.round(set.goodHoldMs / 1000)} s good form`
              : `${set.reps.length} reps · ${set.cleanCount} clean${set.target?.reps ? ` · target ${set.target.reps}` : ""}`}
          </div>
        </div>
        <ScoreRing score={set.score} />
      </div>

      <div className="mt-5 rounded-2xl bg-raised/50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-volt">
          <Icon.brain size={18} /> Coach
        </div>
        <p className="mt-1 text-lg font-semibold">{report.headline}</p>
        <ul className="mt-3 space-y-2">
          {report.points.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className={`mt-0.5 h-fit shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase ${POINT_STYLE[p.kind].cls}`}>{POINT_STYLE[p.kind].label}</span>
              <span className="text-ink-2">{p.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-sm">
          <span className="font-semibold text-ink">Next time: </span>
          <span className="text-ink-2">{report.next}</span>
        </p>
      </div>

      {set.kind === "reps" && set.reps.length > 0 && (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-2">Form score, rep by rep</h3>
            <RepBars reps={set.reps} />
          </div>
          {ex.kind === "reps" && set.trace.length > 5 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-2">Depth through the set</h3>
              <DepthTrace trace={set.trace} depthAt={ex.depthAt} reps={set.reps} />
            </div>
          )}
        </div>
      )}
      {set.bestRep && set.worstRep && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-ink-2">Your best rep vs your weakest, at the bottom</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { snap: set.bestRep, title: `Rep ${set.bestRep.index} · ${set.bestRep.score}`, tone: "text-good-ink", note: "Best" },
              {
                snap: set.worstRep,
                title: `Rep ${set.worstRep.index} · ${set.worstRep.score}`,
                tone: "text-warn",
                note:
                  set.reps
                    .find((r) => r.index === set.worstRep!.index)
                    ?.faults.map((id) => ex.checks.find((c) => c.id === id)?.title)
                    .filter(Boolean)
                    .join(", ") || "Not as deep",
              },
            ].map(({ snap, title, tone, note }) => (
              <figure key={title} className="rounded-2xl bg-raised/50 p-3">
                <PoseSnapshot pose={snap.pose} joints={snap.joints} className="mx-auto h-32 w-full" label={`Skeleton of rep ${snap.index}`} />
                <figcaption className="mt-2 text-center text-sm">
                  <span className={`font-semibold ${tone}`}>{title}</span>
                  <span className="block text-xs text-muted">{note}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      {Object.keys(set.faultCounts).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(set.faultCounts).map(([id, n]) => {
            const c = ex.checks.find((x) => x.id === id);
            return c ? (
              <span key={id} className="chip">
                <i className={`inline-block h-2 w-2 rounded-full ${c.major ? "bg-serious" : "bg-warn"}`} /> {c.title} · {n}
                {set.kind === "hold" ? " s" : "×"}
                {c.beta && <span className="text-faint"> (beta)</span>}
              </span>
            ) : null;
          })}
        </div>
      )}
    </section>
  );
}

export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "#0ca30c" : score >= 55 ? "#fab219" : "#ec835a";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Form score ${score} out of 100`} role="img">
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="#232a35" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} transform="rotate(-90 32 32)" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-bold">{score}</span>
    </div>
  );
}
