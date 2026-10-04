import { useRef, useState } from "react";
import { exercise } from "../engine/exercises";
import type { SetSummary } from "../engine/session";
import { buildPlan, OWN_BANDS_NOTE, overall, plankRating, PUSHUP_SOURCE, pushupRating, RATINGS, squatRating, type Rating } from "../lib/assessment";
import { finishWorkout } from "../lib/finish";
import { href, navigate } from "../lib/router";
import { addAssessment, setPlan, setProfile, uid, useData, type Assessment } from "../lib/store";
import { Figure } from "../ui/Figure";
import { Icon } from "../ui/icons";
import { LiveSet } from "../ui/LiveSet";
import { PageTitle } from "../ui/Layout";

const TESTS = [
  { exerciseId: "pushup", title: "Max push-ups", how: "As many good push-ups as you can. Knee push-ups are fine; Spotter notices. The test ends a few seconds after your last rep." },
  { exerciseId: "squat", title: "60-second squats", how: "As many full-depth squats as you can in one minute." },
  { exerciseId: "plank", title: "Max plank", how: "Hold a plank as long as you can in good form. The test ends when you drop out of position." },
] as const;

const RATING_COLOR: Record<Rating, string> = {
  "Needs improvement": "text-serious",
  Fair: "text-warn",
  Good: "text-good-ink",
  "Very good": "text-good-ink",
  Excellent: "text-volt",
};

export function Assess() {
  const data = useData();
  const [step, setStep] = useState<"intro" | 0 | 1 | 2 | "between" | "results">("intro");
  const results = useRef<SetSummary[]>([]);
  const startedAt = useRef(Date.now());
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const nextTest = useRef(0);

  const onDone = (i: number) => (s: SetSummary) => {
    results.current[i] = s;
    if (i < 2) {
      nextTest.current = i + 1;
      window.setTimeout(() => setStep("between"), 600);
    } else {
      const [p, q, r] = results.current;
      const a: Assessment = {
        id: uid(),
        at: Date.now(),
        pushups: p ? p.cleanCount + Math.round((p.reps.length - p.cleanCount) * 0.5) : null,
        squats: q ? q.cleanCount + Math.round((q.reps.length - q.cleanCount) * 0.5) : null,
        plankMs: r ? r.goodHoldMs : null,
        form: { pushup: p?.score, squat: q?.score, plank: r?.score },
      };
      addAssessment(a);
      finishWorkout({ title: "Fitness test", kind: "assessment", sets: results.current.filter(Boolean), startedAt: startedAt.current });
      setAssessment(a);
      window.setTimeout(() => setStep("results"), 600);
    }
  };

  if (step === 0 || step === 1 || step === 2) {
    const t = TESTS[step];
    const ex = exercise(t.exerciseId);
    return (
      <LiveSet
        key={step}
        exercise={ex}
        eyebrow={`Fitness test · ${step + 1} of 3 · ${t.title}`}
        target={step === 1 ? { ms: 60_000 } : step === 2 ? { ms: 300_000 } : undefined}
        untilFailure={step === 0}
        holdUntilBreak={step === 2}
        onDone={onDone(step)}
        onExit={() => setStep("intro")}
      />
    );
  }

  if (step === "between") {
    const t = TESTS[nextTest.current]!;
    const last = results.current[nextTest.current - 1]!;
    return (
      <div className="mx-auto max-w-xl py-6 text-center" data-testid="assess-between">
        <div className="text-sm font-bold tracking-[0.2em] text-cyan uppercase">Test {nextTest.current} done</div>
        <p className="mt-2 text-ink-2">
          {last.kind === "hold" ? `${Math.round(last.goodHoldMs / 1000)} s` : `${last.reps.length} reps (${last.cleanCount} clean)`}. Catch your breath.
        </p>
        <div className="card mt-6 p-6">
          <Figure exerciseId={t.exerciseId} className="mx-auto h-40 w-56" />
          <div className="display mt-3 text-4xl">
            Next: {t.title}
          </div>
          <p className="mt-2 text-ink-2">{t.how}</p>
          <p className="mt-2 text-sm text-muted">{exercise(t.exerciseId).setup.placement}</p>
          <button className="btn btn-volt mt-5 h-12 px-8" onClick={() => setStep(nextTest.current as 1 | 2)} data-testid="assess-next">
            I'm ready <Icon.next size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (step === "results" && assessment) return <Results a={assessment} profile={data.profile} />;

  const last = data.assessments[0];
  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Fitness test" title="Find your starting point">
        Three short tests, coached and counted by Spotter. Then you get a rating for each one and a 4-week plan built from your results.
      </PageTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {TESTS.map((t, i) => (
          <div key={t.exerciseId} className="card p-5">
            <Figure exerciseId={t.exerciseId} className="h-28 w-full" />
            <div className="mt-2 text-xs font-bold text-volt">TEST {i + 1}</div>
            <h2 className="text-xl font-bold">{t.title}</h2>
            <p className="mt-1 text-sm text-muted">{t.how}</p>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h2 className="font-bold">For accurate ratings (optional)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-muted">Age</span>
            <select className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={data.profile.ageBand} onChange={(e) => setProfile({ ageBand: e.target.value as typeof data.profile.ageBand })}>
              <option value="">Prefer not to say</option>
              <option value="under20">Under 20</option>
              <option value="20-29">20 to 29</option>
              <option value="30-39">30 to 39</option>
              <option value="40-49">40 to 49</option>
              <option value="50-59">50 to 59</option>
              <option value="60+">60 or over</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-muted">Push-up norms</span>
            <select className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={data.profile.sex} onChange={(e) => setProfile({ sex: e.target.value as typeof data.profile.sex })}>
              <option value="">Average of both tables</option>
              <option value="female">Female table (knee push-ups)</option>
              <option value="male">Male table (full push-ups)</option>
            </select>
          </label>
        </div>
        <button
          className="btn btn-volt mt-5 h-12 px-8 text-base"
          onClick={() => {
            startedAt.current = Date.now();
            results.current = [];
            setStep(0);
          }}
          data-testid="assess-start"
        >
          <Icon.play size={18} /> Start the test
        </button>
        <p className="mt-3 text-xs text-muted">Stop if anything hurts. This is a fitness guide, not a medical assessment.</p>
      </div>
      {last && (
        <div className="card p-5">
          <h2 className="font-bold">Your last test · {new Date(last.at).toLocaleDateString()}</h2>
          <p className="mt-1 text-sm text-ink-2">
            {last.pushups ?? "–"} push-ups · {last.squats ?? "–"} squats · {last.plankMs !== null ? Math.round(last.plankMs / 1000) : "–"} s plank
          </p>
        </div>
      )}
    </div>
  );
}

function Results({ a, profile }: { a: Assessment; profile: ReturnType<typeof useData>["profile"] }) {
  const ratings: [string, string, Rating | null][] = [
    ["Push-ups", a.pushups !== null ? `${a.pushups}` : "–", a.pushups !== null ? pushupRating(a.pushups, profile) : null],
    ["Squats in 60 s", a.squats !== null ? `${a.squats}` : "–", a.squats !== null ? squatRating(a.squats) : null],
    ["Plank", a.plankMs !== null ? `${Math.round(a.plankMs / 1000)} s` : "–", a.plankMs !== null ? plankRating(a.plankMs) : null],
  ];
  const all = overall(ratings.map((r) => r[2]).filter((r): r is Rating => !!r));
  const startPlan = () => {
    setPlan({ planId: `plan-${a.id}`, title: `${all} level plan`, startedAt: Date.now(), days: buildPlan(a), done: [] });
    navigate("/plans");
  };
  return (
    <div className="space-y-6" data-testid="assess-results">
      <PageTitle eyebrow="Fitness test results" title={`Overall: ${all}`} />
      <div className="grid gap-4 md:grid-cols-3">
        {ratings.map(([name, value, r]) => (
          <div key={name} className="card p-5">
            <div className="text-sm text-muted">{name}</div>
            <div className="mt-1 text-5xl font-semibold">{value}</div>
            {r && (
              <>
                <div className={`mt-2 font-bold ${RATING_COLOR[r]}`}>{r}</div>
                <div className="mt-2 flex gap-1" aria-hidden="true">
                  {RATINGS.map((x, i) => (
                    <div key={x} className={`h-1.5 flex-1 rounded-full ${i <= RATINGS.indexOf(r) ? "bg-volt" : "bg-raised"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="card p-6">
        <h2 className="display text-3xl">Your 4-week plan is ready</h2>
        <p className="mt-2 text-ink-2">3 workouts a week (upper, lower, full body). Working sets start at about half of your max and grow 10% a week. Retest after week 4 to see how far you've come.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn btn-volt h-12 px-6" onClick={startPlan} data-testid="start-plan">
            Start my plan
          </button>
          <a className="btn btn-ghost h-12" href={href("/progress")}>
            See progress
          </a>
        </div>
      </div>
      <p className="text-xs text-muted">
        {PUSHUP_SOURCE} {OWN_BANDS_NOTE} Reps that weren't clean count as half.
      </p>
    </div>
  );
}
