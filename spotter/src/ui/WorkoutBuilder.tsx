import { useState } from "react";
import { EXERCISES, exercise } from "../engine/exercises";
import type { PlanItem, Workout } from "../lib/plans";
import { saveCustomWorkout, uid } from "../lib/store";
import { Icon } from "./icons";

/** Build your own workout: exercises in order, reps or seconds each, and the rest after. */
export function WorkoutBuilder({ onClose, initial }: { onClose: () => void; initial?: Workout }) {
  const [title, setTitle] = useState(initial?.title ?? "My workout");
  const [items, setItems] = useState<PlanItem[]>(initial?.items ?? [{ exerciseId: "squat", reps: 10, restMs: 30000 }]);
  const set = (i: number, patch: Partial<PlanItem>) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });
  const save = () => {
    saveCustomWorkout({
      id: initial?.id ?? `custom-${uid()}`,
      title: title.trim() || "My workout",
      subtitle: `${items.length} sets you built`,
      level: "All levels",
      standing: items.every((i) => exercise(i.exerciseId).setup.posture !== "lying" && !exercise(i.exerciseId).floor),
      items: items.map((x, k) => ({ ...x, restMs: k === items.length - 1 ? 0 : x.restMs })),
    });
    onClose();
  };
  return (
    <div className="card p-5" data-testid="builder">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Build your own</h2>
        <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-raised" onClick={onClose} aria-label="Close the builder">
          <Icon.x size={18} />
        </button>
      </div>
      <label className="mt-3 block">
        <span className="text-sm font-semibold">Name</span>
        <input className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={title} maxLength={32} onChange={(e) => setTitle(e.target.value)} data-testid="builder-name" />
      </label>
      <ol className="mt-4 space-y-2">
        {items.map((it, i) => {
          const ex = exercise(it.exerciseId);
          const timed = it.ms !== undefined;
          return (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-raised/60 p-2">
              <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>
              <select
                className="h-10 min-w-36 flex-1 rounded-lg border border-line-2 bg-surface px-2"
                value={it.exerciseId}
                aria-label={`Exercise for set ${i + 1}`}
                onChange={(e) => {
                  const next = exercise(e.target.value);
                  set(i, next.kind === "hold" ? { exerciseId: next.id, ms: it.ms ?? 30000, reps: undefined } : { exerciseId: next.id });
                }}
              >
                {EXERCISES.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {ex.kind === "reps" && (
                <select className="h-10 rounded-lg border border-line-2 bg-surface px-2" value={timed ? "time" : "reps"} aria-label="Reps or time" onChange={(e) => set(i, e.target.value === "time" ? { ms: 30000, reps: undefined } : { reps: 10, ms: undefined })}>
                  <option value="reps">reps</option>
                  <option value="time">seconds</option>
                </select>
              )}
              <input
                type="number"
                min={1}
                max={timed ? 600 : 200}
                className="h-10 w-20 rounded-lg border border-line-2 bg-surface px-2"
                aria-label={timed ? "Seconds" : "Reps"}
                value={timed ? Math.round((it.ms ?? 30000) / 1000) : (it.reps ?? 10)}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 1);
                  set(i, timed ? { ms: v * 1000 } : { reps: v });
                }}
              />
              <span className="text-xs text-muted">{timed ? "s" : "reps"}</span>
              {i < items.length - 1 && (
                <select className="h-10 rounded-lg border border-line-2 bg-surface px-2 text-sm" value={it.restMs} aria-label="Rest after this set" onChange={(e) => set(i, { restMs: Number(e.target.value) })}>
                  {[10, 20, 30, 45, 60, 90].map((r) => (
                    <option key={r} value={r * 1000}>
                      rest {r}s
                    </option>
                  ))}
                </select>
              )}
              <span className="ml-auto flex">
                <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>
                  <Icon.back size={16} className="rotate-90" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === items.length - 1}>
                  <Icon.next size={16} className="rotate-90" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-bad-ink" onClick={() => setItems((xs) => xs.filter((_, k) => k !== i))} aria-label={`Remove set ${i + 1}`} disabled={items.length === 1}>
                  <Icon.x size={16} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-ghost" onClick={() => setItems((xs) => [...xs, { exerciseId: "pushup", reps: 10, restMs: 30000 }])} disabled={items.length >= 20} data-testid="builder-add">
          + Add a set
        </button>
        <button className="btn btn-volt" onClick={save} data-testid="builder-save">
          Save workout
        </button>
      </div>
    </div>
  );
}
