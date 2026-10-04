import { useState } from "react";
import { getExercise } from "../engine/exercises";
import { href } from "../lib/router";
import { allSets, records } from "../lib/progress";
import { TrendLine } from "../ui/charts";
import { useData } from "../lib/store";
import { Figure } from "../ui/Figure";
import { Icon } from "../ui/icons";

const REP_TARGETS = [5, 10, 15, 20];
const TIME_TARGETS = [20, 30, 45, 60];

export function ExerciseDetail({ id }: { id: string }) {
  const ex = getExercise(id);
  const data = useData();
  const [mode, setMode] = useState<"reps" | "time" | "free">(ex?.kind === "hold" ? "time" : "reps");
  const [reps, setReps] = useState(10);
  const [secs, setSecs] = useState(30);
  if (!ex) return <p>Unknown exercise.</p>;
  const rec = records(data).get(ex.id);
  const go = mode === "reps" ? `/go?ex=${ex.id}&reps=${reps}` : mode === "time" ? `/go?ex=${ex.id}&ms=${secs * 1000}` : `/go?ex=${ex.id}`;

  return (
    <div className="space-y-6">
      <a href={href("/train")} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon.back size={18} /> Library
      </a>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="card relative flex items-center justify-center overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-x-10 bottom-0 h-40 rounded-full bg-volt/10 blur-3xl" />
          <Figure exerciseId={ex.id} className="relative h-72 w-full max-w-md" title={`${ex.name} demonstration`} />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold tracking-[0.14em] text-volt uppercase">
            {ex.category} {ex.beta && "· Beta"}
          </div>
          <h1 className="display text-6xl">{ex.name}</h1>
          <p className="mt-2 text-lg text-ink-2">{ex.blurb}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ex.muscles.map((m) => (
              <span key={m} className="chip">
                {m}
              </span>
            ))}
          </div>

          <div className="card mt-6 p-4">
            <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Set type">
              {(ex.kind === "hold" ? (["time", "free"] as const) : (["reps", "time", "free"] as const)).map((m) => (
                <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`chip px-3.5 py-1.5 text-sm ${mode === m ? "border-volt bg-volt text-black" : ""}`}>
                  {m === "reps" ? "Rep target" : m === "time" ? (ex.kind === "hold" ? "Hold for" : "Timed") : ex.kind === "hold" ? "As long as I can" : "Free set"}
                </button>
              ))}
            </div>
            {mode === "reps" && (
              <div className="flex gap-2">
                {REP_TARGETS.map((n) => (
                  <button key={n} onClick={() => setReps(n)} aria-pressed={reps === n} className={`h-12 flex-1 rounded-xl border text-lg font-bold ${reps === n ? "border-volt text-volt" : "border-line-2 text-ink-2"}`}>
                    {n}
                  </button>
                ))}
              </div>
            )}
            {mode === "time" && (
              <div className="flex gap-2">
                {TIME_TARGETS.map((n) => (
                  <button key={n} onClick={() => setSecs(n)} aria-pressed={secs === n} className={`h-12 flex-1 rounded-xl border text-lg font-bold ${secs === n ? "border-volt text-volt" : "border-line-2 text-ink-2"}`}>
                    {n}s
                  </button>
                ))}
              </div>
            )}
            {mode === "free" && <p className="text-sm text-muted">Go until you're done, then tap Finish. Cadence counts and coaches the whole way.</p>}
            <a href={href(go)} className="btn btn-volt mt-4 h-13 w-full text-base" data-testid="start-set">
              <Icon.camera size={20} /> Start with camera
            </a>
            {rec && (rec.bestReps > 0 || rec.longestHoldMs > 0) && (
              <p className="mt-3 text-center text-sm text-muted">
                Your best: {ex.kind === "hold" ? `${Math.round(rec.bestGoodHoldMs / 1000)} s in good form` : `${rec.bestReps} reps, ${rec.bestClean} clean`}
              </p>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const mine = allSets(data)
          .filter((s) => s.exerciseId === ex.id && (s.reps.length > 0 || s.holdMs > 5000))
          .sort((a, b) => a.startedAt - b.startedAt)
          .slice(-16);
        if (mine.length < 2) return null;
        return (
          <section className="card p-5">
            <h2 className="font-bold">Your {ex.name.toLowerCase()} form over time</h2>
            <p className="mb-3 text-sm text-muted">Form score of your last {mine.length} sets.</p>
            <TrendLine points={mine.map((s) => ({ v: s.score, label: `${new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${s.kind === "hold" ? `${Math.round(s.goodHoldMs / 1000)} s` : `${s.reps.length} reps`}` }))} />
          </section>
        );
      })()}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card p-5 md:col-span-2">
          <h2 className="mb-3 text-lg font-bold">How to do it</h2>
          <ol className="space-y-3">
            {ex.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised text-sm font-bold text-volt">{i + 1}</span>
                <span className="pt-0.5 text-ink-2">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-raised/60 p-3">
              <div className="text-xs font-bold text-muted uppercase">Easier</div>
              <p className="mt-1 text-sm text-ink-2">{ex.easier}</p>
            </div>
            <div className="rounded-xl bg-raised/60 p-3">
              <div className="text-xs font-bold text-muted uppercase">Harder</div>
              <p className="mt-1 text-sm text-ink-2">{ex.harder}</p>
            </div>
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">What Cadence checks</h2>
          <ul className="space-y-3 text-sm">
            {ex.kind === "reps" && (
              <li>
                <div className="font-semibold">Full {ex.depthLabel}</div>
                <div className="text-muted">{ex.shallowTip}</div>
              </li>
            )}
            {ex.checks.map((c) => (
              <li key={c.id}>
                <div className="font-semibold">
                  {c.title} {c.beta && <span className="chip ml-1 text-[10px]">Beta</span>}
                </div>
                <div className="text-muted">{c.tip}</div>
              </li>
            ))}
            {ex.kind === "reps" && (
              <li>
                <div className="font-semibold">Tempo</div>
                <div className="text-muted">Reps faster than {(ex.minRepMs / 1000).toFixed(1)} s are flagged as rushed.</div>
              </li>
            )}
          </ul>
          <div className="mt-4 rounded-xl border border-line-2 p-3 text-sm text-ink-2">
            <Icon.camera className="mr-1 inline text-cyan" size={16} /> {ex.setup.placement}
          </div>
        </section>
      </div>
    </div>
  );
}
