import { useEffect, useMemo, useRef, useState } from "react";
import { exercise, getExercise } from "../engine/exercises";
import type { SetSummary } from "../engine/session";
import { finishWorkout } from "../lib/finish";
import { getWorkout, singleSet, type Workout } from "../lib/plans";
import { navigate } from "../lib/router";
import { sfx } from "../lib/sounds";
import { speak } from "../lib/speech";
import { useData, type SetRecord } from "../lib/store";
import { Figure } from "../ui/Figure";
import { Icon } from "../ui/icons";
import { LiveSet } from "../ui/LiveSet";

/**
 * Runs a workout hands-free: set, rest (with a preview of what's next), next
 * set, then the summary. A single exercise is just a one-set workout.
 */
export function Runner({ query }: { query: URLSearchParams }) {
  const data = useData();
  const workout: Workout | null = useMemo(() => {
    const ex = query.get("ex");
    if (ex && getExercise(ex)) {
      const reps = Number(query.get("reps")) || undefined;
      const ms = Number(query.get("ms")) || undefined;
      return { ...singleSet(ex, { reps, ms }), title: getExercise(ex)!.name };
    }
    const w = query.get("workout");
    if (w) return getWorkout(w, data.customWorkouts) ?? null;
    const p = query.get("plan");
    if (p && data.plan) return data.plan.days.find((d) => d.id === p) ?? null;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"set" | "rest">("set");
  const sets = useRef<SetRecord[]>([]);
  const startedAt = useRef(Date.now());

  if (!workout) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-ink-2">That workout couldn't be found.</p>
          <a className="btn btn-volt" href="#/plans">
            Choose a workout
          </a>
        </div>
      </div>
    );
  }

  const items = workout.items;
  const item = items[index]!;
  const ex = exercise(item.exerciseId);
  const isSingle = items.length === 1;

  const save = () => {
    const kind = query.get("plan") ? "plan" : isSingle ? "single" : "plan";
    const id = finishWorkout({ title: workout.title, kind, planId: query.get("plan") ?? undefined, sets: sets.current, startedAt: startedAt.current });
    navigate(`/summary/${id}`);
  };

  const onDone = (summary: SetSummary) => {
    sets.current.push({ ...summary, target: { reps: item.reps, ms: item.ms } });
    if (index >= items.length - 1) {
      window.setTimeout(save, 700);
    } else {
      window.setTimeout(() => setPhase("rest"), 700);
    }
  };

  const onExit = () => {
    if (sets.current.some((s) => s.reps.length || s.holdMs > 2000)) save();
    else history.length > 1 ? history.back() : navigate("/");
  };

  if (phase === "rest") {
    return (
      <Rest
        workout={workout}
        index={index}
        last={sets.current[sets.current.length - 1]}
        onNext={() => {
          setIndex((i) => i + 1);
          setPhase("set");
        }}
        onQuit={save}
      />
    );
  }

  return (
    <LiveSet
      key={index}
      exercise={ex}
      target={{ reps: item.reps, ms: item.ms }}
      eyebrow={isSingle ? undefined : `${workout.title} · Set ${index + 1} of ${items.length}`}
      onDone={onDone}
      onExit={onExit}
    />
  );
}

function Rest({ workout, index, last, onNext, onQuit }: { workout: Workout; index: number; last?: SetRecord; onNext: () => void; onQuit: () => void }) {
  const item = workout.items[index]!;
  const next = workout.items[index + 1]!;
  const nextEx = exercise(next.exerciseId);
  const prevEx = exercise(item.exerciseId);
  const [left, setLeft] = useState(Math.max(5000, item.restMs));
  const { settings } = useData();
  const changesView = nextEx.setup.view !== "any" && nextEx.setup.view !== prevEx.setup.view;

  useEffect(() => {
    if (settings.voice) speak(`Rest. Next up: ${nextEx.name}${next.reps ? `, ${next.reps} reps` : next.ms ? `, ${Math.round(next.ms / 1000)} seconds` : ""}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (left <= 0) {
      onNext();
      return;
    }
    if (left <= 3000) sfx.tick();
    const id = window.setTimeout(() => setLeft((l) => l - 1000), 1000);
    return () => window.clearTimeout(id);
  }, [left, onNext]);

  const pctDone = (index + 1) / workout.items.length;
  return (
    <div className="app-glow fixed inset-0 z-40 flex flex-col overflow-y-auto p-6 pt-[max(24px,env(safe-area-inset-top))]" data-testid="rest">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-muted">{workout.title}</div>
          <button className="btn btn-ghost h-10 text-sm" onClick={onQuit}>
            End workout
          </button>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-raised">
          <div className="h-1.5 rounded-full bg-volt" style={{ width: `${pctDone * 100}%` }} />
        </div>
        <div className="mt-10 text-center">
          <div className="text-sm font-bold tracking-[0.2em] text-cyan uppercase">Rest</div>
          <div className="display tabular text-[26vmin] leading-none text-ink sm:text-[180px]">{Math.ceil(left / 1000)}</div>
          {last && (
            <p className="text-ink-2">
              Last set: {last.kind === "hold" ? `${Math.round(last.goodHoldMs / 1000)} s good form` : `${last.reps.length} reps, ${last.cleanCount} clean`} · score {last.score}
            </p>
          )}
        </div>
        <div className="card mt-8 flex items-center gap-5 p-5">
          <Figure exerciseId={nextEx.id} className="h-32 w-32 shrink-0 rounded-xl bg-raised/70" />
          <div>
            <div className="text-xs font-bold tracking-[0.14em] text-volt uppercase">
              Next · set {index + 2} of {workout.items.length}
            </div>
            <div className="display mt-1 text-4xl">{nextEx.name}</div>
            <div className="mt-1 text-ink-2">{next.reps ? `${next.reps} reps` : next.ms ? `${Math.round(next.ms / 1000)} seconds` : "Free set"}</div>
            {changesView && (
              <p className="mt-2 text-sm text-warn">
                <Icon.camera className="mr-1 inline" size={16} />
                {nextEx.setup.placement}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-3 pb-6">
          <button className="btn btn-ghost" onClick={() => setLeft((l) => l + 15000)}>
            +15 s
          </button>
          <button className="btn btn-volt" onClick={onNext} data-testid="skip-rest">
            Skip rest <Icon.next size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
