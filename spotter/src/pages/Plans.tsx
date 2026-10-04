import { getExercise } from "../engine/exercises";
import { href } from "../lib/router";
import { WORKOUTS, workoutMinutes } from "../lib/plans";
import { useState } from "react";
import { deleteCustomWorkout, setPlan, useData } from "../lib/store";
import { WorkoutBuilder } from "../ui/WorkoutBuilder";
import type { Workout } from "../lib/plans";
import { Icon } from "../ui/icons";
import { PageTitle } from "../ui/Layout";

export function Plans() {
  const data = useData();
  const plan = data.plan;
  const nextDay = plan?.days.find((d) => !plan.done.includes(d.id));
  const [building, setBuilding] = useState<Workout | "new" | null>(null);
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="Workouts" title="Guided workouts">
        Hands-free: Spotter counts each set, rests you, tells you what's next and starts the next set when you're in position.
      </PageTitle>

      <section className="card relative overflow-hidden p-6" aria-labelledby="myplan">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-volt/10 blur-3xl" />
        {plan ? (
          <div className="relative">
            <div className="text-xs font-bold tracking-[0.14em] text-volt uppercase">Your 4-week plan</div>
            <h2 id="myplan" className="display mt-1 text-4xl">
              {plan.title}
            </h2>
            <p className="mt-1 text-ink-2">
              {plan.done.length} of {plan.days.length} workouts done
            </p>
            <div className="mt-4 grid grid-cols-12 gap-1" aria-hidden="true">
              {plan.days.map((d) => (
                <div key={d.id} className={`h-2 rounded-full ${plan.done.includes(d.id) ? "bg-volt" : d.id === nextDay?.id ? "bg-cyan" : "bg-raised"}`} />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {nextDay ? (
                <a className="btn btn-volt" href={href(`/go?plan=${nextDay.id}`)}>
                  <Icon.play size={18} /> {nextDay.title}: {nextDay.subtitle}
                </a>
              ) : (
                <a className="btn btn-volt" href={href("/assess")}>
                  Plan complete! Retest to see your progress
                </a>
              )}
              <button className="btn btn-ghost" onClick={() => setPlan(null)}>
                Leave plan
              </button>
            </div>
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-muted">All 12 workouts</summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {plan.days.map((d) => (
                  <li key={d.id} className="rounded-xl bg-raised/60 p-3 text-sm">
                    <div className="flex items-center justify-between font-semibold">
                      {d.title} {plan.done.includes(d.id) && <Icon.check className="text-volt" size={18} />}
                    </div>
                    <div className="text-muted">{d.items.map((i) => `${getExercise(i.exerciseId)?.name} ${i.reps ? `×${i.reps}` : `${Math.round((i.ms ?? 0) / 1000)}s`}`).join(" · ")}</div>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : (
          <div className="relative grid items-center gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="text-xs font-bold tracking-[0.14em] text-volt uppercase">Personal plan</div>
              <h2 id="myplan" className="display mt-1 text-4xl">
                Get a plan built for you
              </h2>
              <p className="mt-1 max-w-xl text-ink-2">Take the 5-minute fitness test (push-ups, squats, plank). Spotter rates each one and builds a 4-week, 3-days-a-week plan that starts where you are.</p>
            </div>
            <a className="btn btn-volt h-12" href={href("/assess")}>
              <Icon.target size={18} /> Take the test
            </a>
          </div>
        )}
      </section>

      <section aria-labelledby="mine">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="mine" className="text-xl font-bold">
            Your workouts
          </h2>
          {!building && (
            <button className="btn btn-ghost h-10 text-sm" onClick={() => setBuilding("new")} data-testid="builder-open">
              + Build your own
            </button>
          )}
        </div>
        {building && <WorkoutBuilder key={building === "new" ? "new" : building.id} initial={building === "new" ? undefined : building} onClose={() => setBuilding(null)} />}
        {data.customWorkouts.length === 0 && !building ? (
          <p className="text-sm text-muted">Mix any exercises, reps or timed sets, and rests. Spotter runs it hands-free like the ones below.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.customWorkouts.map((w) => (
              <li key={w.id} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{w.title}</h3>
                  <span className="text-xs text-muted">~{workoutMinutes(w)} min</span>
                </div>
                <p className="mt-1 text-sm text-muted">{w.items.map((i) => `${getExercise(i.exerciseId)?.name} ${i.reps ? `×${i.reps}` : `${Math.round((i.ms ?? 0) / 1000)}s`}`).join(" · ")}</p>
                <div className="mt-3 flex gap-2">
                  <a className="btn btn-volt h-10 flex-1 text-sm" href={href(`/go?workout=${w.id}`)}>
                    <Icon.play size={14} /> Start
                  </a>
                  <button className="btn btn-ghost h-10 text-sm" onClick={() => setBuilding(w)}>
                    Edit
                  </button>
                  <button className="btn btn-ghost h-10 text-sm text-bad-ink" onClick={() => deleteCustomWorkout(w.id)} aria-label={`Delete ${w.title}`}>
                    <Icon.x size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Workouts</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORKOUTS.map((w) => (
            <article key={w.id} className="card flex flex-col p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>{w.level}</span>
                <span>
                  ~{workoutMinutes(w)} min · {w.items.length} sets
                </span>
              </div>
              <h3 className="display mt-2 text-3xl">{w.title}</h3>
              <p className="mt-1 text-sm text-ink-2">{w.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...new Set(w.items.map((i) => i.exerciseId))].map((id) => (
                  <span key={id} className="chip text-[11px]">
                    {getExercise(id)?.name}
                  </span>
                ))}
                {w.standing && <span className="chip border-cyan/40 text-[11px] text-cyan">No floor</span>}
              </div>
              {w.credit && <p className="mt-3 text-xs text-muted">{w.credit}</p>}
              <div className="mt-auto pt-4">
                <a className="btn btn-ghost w-full" href={href(`/go?workout=${w.id}`)} data-testid={`workout-${w.id}`}>
                  <Icon.play size={16} /> Start
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
