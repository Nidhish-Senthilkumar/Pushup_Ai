import { useState } from "react";
import type { Category } from "../engine/exercise";
import { EXERCISES } from "../engine/exercises";
import { href } from "../lib/router";
import { records } from "../lib/progress";
import { useData } from "../lib/store";
import { Figure } from "../ui/Figure";
import { PageTitle } from "../ui/Layout";

const FILTERS: { id: "all" | Category | "standing"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upper", label: "Upper body" },
  { id: "lower", label: "Lower body" },
  { id: "core", label: "Core" },
  { id: "cardio", label: "Cardio" },
  { id: "standing", label: "No floor needed" },
];

export function Library() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const data = useData();
  const recs = records(data);
  const list = EXERCISES.filter((e) => (filter === "all" ? true : filter === "standing" ? e.setup.posture === "standing" && !e.floor : e.category === filter));
  return (
    <div>
      <PageTitle eyebrow="Train" title="Exercise library">
        Thirteen moves Cadence can see, count and coach. Pick one and do a set; the camera does the rest.
      </PageTitle>
      <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4" role="toolbar" aria-label="Filter exercises">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={`chip shrink-0 px-3.5 py-1.5 text-sm ${filter === f.id ? "border-volt bg-volt text-black" : ""}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((e) => {
          const r = recs.get(e.id);
          return (
            <a key={e.id} href={href(`/exercise/${e.id}`)} className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-volt/50" data-testid={`exercise-${e.id}`}>
              <div className="relative rounded-xl bg-raised/70">
                <Figure exerciseId={e.id} className="h-32 w-full" />
                {e.beta && <span className="chip absolute top-2 right-2 text-[10px]">Beta</span>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <h2 className="font-bold">{e.name}</h2>
                <span className="text-xs text-muted capitalize">{e.category}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{e.blurb}</p>
              {r && (r.bestReps > 0 || r.longestHoldMs > 0) && (
                <div className="mt-2 text-xs font-semibold text-volt">
                  Best: {e.kind === "hold" ? `${Math.round(r.bestGoodHoldMs / 1000)} s` : `${r.bestReps} reps`}
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
