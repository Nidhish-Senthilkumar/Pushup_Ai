import { EXERCISES, getExercise } from "../engine/exercises";
import { href } from "../lib/router";
import { getWorkout, WORKOUTS, workoutMinutes } from "../lib/plans";
import { dailyReps, earnedAchievements, levelOf, levelTitle, streak, totalXp, workoutsThisWeek } from "../lib/progress";
import { useData } from "../lib/store";
import { Figure } from "../ui/Figure";
import { Icon } from "../ui/icons";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Home() {
  const data = useData();
  const xp = totalXp(data);
  const lvl = levelOf(xp);
  const days = streak(data.workouts);
  const week = dailyReps(data, 7);
  const weekReps = week.reduce((s, d) => s + d.reps, 0);
  const nextDay = data.plan?.days.find((d) => !data.plan!.done.includes(d.id));
  const suggested = nextDay ?? getWorkout(data.workouts.length ? "desk-break" : "quick-start")!;
  const earned = earnedAchievements(data);
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const topArcade = data.arcade.filter((a) => a.at >= dayStart).sort((a, b) => b.score - a.score)[0];

  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <p className="text-sm font-semibold text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="display mt-1 text-5xl sm:text-6xl">
          {greeting()}
          {data.profile.name ? `, ${data.profile.name}` : ""}.
        </h1>
      </section>

      {/* Today's workout */}
      <section className="card relative overflow-hidden p-6 sm:p-8" aria-labelledby="today">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-volt/10 blur-3xl" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 text-xs font-bold tracking-[0.14em] text-volt uppercase">{nextDay ? `Your plan · ${data.plan!.title}` : "Today's pick"}</div>
            <h2 id="today" className="display text-4xl sm:text-5xl">
              {suggested.title}
            </h2>
            <p className="mt-2 max-w-md text-ink-2">{nextDay ? `${nextDay.subtitle} · ${nextDay.items.length} sets` : suggested.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip">
                <Icon.timer size={14} /> ~{workoutMinutes(suggested)} min
              </span>
              <span className="chip">{suggested.items.length} sets</span>
              {suggested.items.slice(0, 4).map((i, k) => (
                <span key={k} className="chip">
                  {getExercise(i.exerciseId)?.name}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="btn btn-volt h-12 px-6 text-base" href={href(nextDay ? `/go?plan=${nextDay.id}` : `/go?workout=${suggested.id}`)} data-testid="start-today">
                <Icon.play size={18} /> Start workout
              </a>
              {!data.assessments.length && (
                <a className="btn btn-ghost h-12" href={href("/assess")}>
                  <Icon.target size={18} /> Take the 5-minute fitness test
                </a>
              )}
            </div>
          </div>
          <div className="hidden gap-2 sm:flex">
            {suggested.items.slice(0, 2).map((i, k) => (
              <Figure key={k} exerciseId={i.exerciseId} className="h-36 w-36 rounded-2xl bg-raised/70 p-2" />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Your stats">
        <Stat label="Day streak" value={String(days)} icon={<Icon.flame className="text-warn" />} />
        <WeekGoal done={workoutsThisWeek(data)} reps={weekReps} />
        <div className="card col-span-2 p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-sm text-muted">Level</div>
            <div className="text-xs text-muted tabular">
              {lvl.into} / {lvl.span} XP
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{lvl.level}</span>
            <span className="font-semibold text-volt">{levelTitle(lvl.level)}</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-raised" role="progressbar" aria-valuenow={Math.round(lvl.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
            <div className="h-2 rounded-full bg-volt" style={{ width: `${Math.max(3, lvl.progress * 100)}%` }} />
          </div>
        </div>
      </section>

      {/* Quick train */}
      <section aria-labelledby="quick">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="quick" className="text-xl font-bold">
            Jump into a set
          </h2>
          <a href={href("/train")} className="text-sm font-semibold text-cyan">
            All exercises
          </a>
        </div>
        <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {EXERCISES.map((e) => (
            <a key={e.id} href={href(`/exercise/${e.id}`)} className="card group w-36 shrink-0 snap-start p-3 transition hover:border-volt/50">
              <Figure exerciseId={e.id} className="h-24 w-full" speed={0.8} />
              <div className="mt-2 font-semibold">{e.name}</div>
              <div className="text-xs text-muted capitalize">{e.category}</div>
            </a>
          ))}
        </div>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <a href={href("/arcade")} className="card group relative overflow-hidden p-6 transition hover:border-volt/50">
          <div className="pointer-events-none absolute -right-10 -bottom-16 h-56 w-56 rounded-full bg-cyan/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex-1">
              <Icon.joystick className="text-volt" size={30} />
              <h2 className="display mt-3 text-3xl">Arcade challenge</h2>
              <p className="mt-1 text-ink-2">30 seconds. Only perfect-form reps count. Beat the leaderboard.</p>
              {topArcade && (
                <p className="mt-3 text-sm text-muted">
                  <Icon.trophy className="mr-1 inline text-warn" size={16} />
                  Today's best: <b className="text-ink">{topArcade.name}</b>, {topArcade.score}
                </p>
              )}
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-volt">
                Play <Icon.next size={18} />
              </span>
            </div>
            <Figure exerciseId="squat" className="h-36 w-28 shrink-0" speed={1.2} />
          </div>
        </a>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent workouts</h2>
            <a href={href("/progress")} className="text-sm font-semibold text-cyan">
              Progress
            </a>
          </div>
          {data.workouts.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing yet. Your first workout will show up here with a rep-by-rep breakdown.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.workouts.slice(0, 4).map((w) => (
                <li key={w.id}>
                  <a href={href(`/summary/${w.id}`)} className="flex items-center justify-between py-2.5 hover:text-volt">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{w.title}</span>
                      <span className="text-xs text-muted">{new Date(w.startedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                    </span>
                    <span className="text-sm text-ink-2 tabular">+{w.xp} XP</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {earned.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              <Icon.trophy className="mr-1 inline text-warn" size={16} /> {earned.length} of 15 achievements unlocked
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="explore">
        <h2 id="explore" className="mb-3 text-xl font-bold">
          Guided workouts
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKOUTS.slice(0, 4).map((w) => (
            <a key={w.id} href={href(`/go?workout=${w.id}`)} className="card p-4 transition hover:border-volt/50">
              <div className="text-xs font-semibold text-muted">
                {w.level} · ~{workoutMinutes(w)} min
              </div>
              <div className="mt-1 font-bold">{w.title}</div>
              <div className="mt-1 line-clamp-2 text-sm text-muted">{w.subtitle}</div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function WeekGoal({ done, reps }: { done: number; reps: number }) {
  const goal = 3;
  const r = 18;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, done / goal);
  return (
    <div className="card flex items-center gap-3 p-4" data-testid="week-goal">
      <svg viewBox="0 0 44 44" width={52} height={52} aria-hidden="true" className="shrink-0">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#232a35" strokeWidth="5" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={frac >= 1 ? "#d4ff3a" : "#38e1ff"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 22 22)" />
      </svg>
      <div>
        <div className="text-sm text-muted">Weekly goal</div>
        <div className="text-2xl font-semibold">
          {Math.min(done, 99)}/{goal}
        </div>
        <div className="text-xs text-muted">{done >= goal ? "Done! Bonus round?" : `workouts · ${reps.toLocaleString()} reps`}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        {label} {icon}
      </div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}
