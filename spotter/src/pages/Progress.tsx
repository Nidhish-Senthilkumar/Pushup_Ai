import { useState } from "react";
import { EXERCISES, getExercise } from "../engine/exercises";
import { href } from "../lib/router";
import { ACHIEVEMENTS, allSets, dailyReps, insights, levelOf, levelTitle, records, streak, totalXp, totals } from "../lib/progress";
import { hasSampleHistory, loadSampleHistory } from "../lib/sampleData";
import { deleteWorkout, useData } from "../lib/store";
import { DayBars, Heatmap, TrendLine } from "../ui/charts";
import { Icon } from "../ui/icons";
import { PageTitle } from "../ui/Layout";

export function Progress() {
  const data = useData();
  const [exFilter, setExFilter] = useState<string>("all");
  const t = totals(data);
  const xp = totalXp(data);
  const lvl = levelOf(xp);
  const recs = records(data);
  const sets = allSets(data)
    .filter((s) => (exFilter === "all" ? true : s.exerciseId === exFilter))
    .filter((s) => s.reps.length >= 3 || s.holdMs >= 10000)
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-24);
  const trend = sets.map((s) => ({ v: s.score, label: `${getExercise(s.exerciseId)?.name} · ${new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` }));
  const earned = new Set(ACHIEVEMENTS.filter((a) => a.earned(data)).map((a) => a.id));
  const tried = [...recs.keys()];

  if (!data.workouts.length) {
    return (
      <div>
        <PageTitle eyebrow="Progress" title="Your progress" />
        <div className="card p-8 text-center">
          <Icon.chart className="mx-auto text-volt" size={40} />
          <p className="mx-auto mt-3 max-w-md text-ink-2">Your streaks, personal records, form trend and achievements will live here. Do your first set to get started.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a className="btn btn-volt" href={href("/train")}>
              Do a set
            </a>
            {!hasSampleHistory() && (
              <button className="btn btn-ghost" onClick={loadSampleHistory}>
                See it with sample data
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Progress" title="Your progress">
        {hasSampleHistory() && <span className="chip border-warn/40 text-warn">Includes sample history · remove it in Settings</span>}
      </PageTitle>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Totals">
        <Tile label="Total reps" value={t.reps.toLocaleString()} sub={`${t.cleanReps.toLocaleString()} clean`} />
        <Tile label="Average form score" value={String(t.formScore)} sub="across all sets" />
        <Tile label="Day streak" value={String(streak(data.workouts))} sub={`${t.workouts} workouts in total`} />
        <Tile label={`Level ${lvl.level} · ${levelTitle(lvl.level)}`} value={`${xp.toLocaleString()} XP`} sub={`${lvl.span - lvl.into} XP to level ${lvl.level + 1}`} />
      </section>

      {insights(data).length > 0 && (
        <section className="card p-5" aria-labelledby="insights">
          <h2 id="insights" className="flex items-center gap-2 font-bold">
            <Icon.brain className="text-volt" size={20} /> Coach insights
          </h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {insights(data).map((x) => (
              <li key={x.title} className="rounded-xl bg-raised/60 p-3">
                <div className="font-semibold">{x.title}</div>
                <p className="mt-1 text-sm text-ink-2">{x.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold">Reps per day</h2>
          <p className="mb-3 text-sm text-muted">Last 14 days. Holds count one rep per 3 seconds.</p>
          <DayBars days={dailyReps(data, 14)} height={190} />
        </section>
        <section className="card p-5">
          <h2 className="font-bold">Consistency</h2>
          <p className="mb-3 text-sm text-muted">Every day for the last 12 weeks.</p>
          <Heatmap days={dailyReps(data, 84)} />
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold">Form score trend</h2>
            <p className="text-sm text-muted">Your last {trend.length} sets{exFilter !== "all" ? ` of ${getExercise(exFilter)?.name}` : ""}.</p>
          </div>
          <select className="h-10 rounded-xl border border-line-2 bg-raised px-3 text-sm" value={exFilter} onChange={(e) => setExFilter(e.target.value)} aria-label="Exercise">
            <option value="all">All exercises</option>
            {EXERCISES.filter((e) => recs.has(e.id)).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <TrendLine points={trend} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold">Personal records</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="pb-2 font-medium">Exercise</th>
                <th className="pb-2 text-right font-medium">Best set</th>
                <th className="pb-2 text-right font-medium">Best form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular">
              {tried.map((id) => {
                const r = recs.get(id)!;
                const ex = getExercise(id);
                return (
                  <tr key={id}>
                    <td className="py-2 font-semibold">{ex?.name}</td>
                    <td className="py-2 text-right">{ex?.kind === "hold" ? `${Math.round(r.bestGoodHoldMs / 1000)} s` : `${r.bestReps} reps`}</td>
                    <td className="py-2 text-right">{r.bestScore || "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">
            {tried.length} of {EXERCISES.length} exercises tried.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-bold">
            Achievements <span className="text-muted">· {earned.size} of {ACHIEVEMENTS.length}</span>
          </h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
            {ACHIEVEMENTS.map((a) => {
              const got = earned.has(a.id);
              const I = Icon[(a.icon in Icon ? a.icon : "star") as keyof typeof Icon];
              return (
                <li key={a.id} className={`flex flex-col items-center rounded-xl p-2 text-center ${got ? "bg-volt/10" : ""}`} title={a.detail}>
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${got ? "bg-volt text-black" : "border border-dashed border-line-2 text-faint"}`}>{got ? <I size={20} /> : <Icon.lock size={18} />}</span>
                  <span className={`mt-1 text-[11px] leading-tight font-semibold ${got ? "" : "text-muted"}`}>{a.title}</span>
                  <span className="sr-only">{got ? "Unlocked" : "Locked"}: {a.detail}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">History</h2>
        <ul className="divide-y divide-line">
          {data.workouts.slice(0, 40).map((w) => (
            <li key={w.id} className="flex items-center gap-3 py-2.5">
              <a href={href(`/summary/${w.id}`)} className="min-w-0 flex-1 hover:text-volt">
                <span className="block truncate font-semibold">{w.title}</span>
                <span className="text-xs text-muted">
                  {new Date(w.startedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {w.sets.map((s) => getExercise(s.exerciseId)?.name).join(", ")}
                </span>
              </a>
              <span className="text-sm text-ink-2 tabular">+{w.xp} XP</span>
              <button className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-bad-ink" onClick={() => deleteWorkout(w.id)} aria-label={`Delete ${w.title}`}>
                <Icon.x size={16} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </div>
  );
}
