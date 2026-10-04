import type { Exercise } from "./exercise";
import { mean, std } from "./geometry";
import type { SetSummary } from "./session";

/**
 * The post-set coach. Every sentence comes from what was measured on this set
 * (and the person's own history), so it's specific, instant, free and works
 * offline: no language model, nothing sent anywhere.
 */

export interface CoachPoint {
  kind: "win" | "fix" | "trend" | "tip";
  text: string;
}

export interface CoachReport {
  headline: string;
  points: CoachPoint[];
  next: string;
}

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const seconds = (ms: number) => Math.round(ms / 1000);

export function coachReport(ex: Exercise, s: SetSummary, previous: SetSummary[] = []): CoachReport {
  return ex.kind === "hold" ? holdReport(ex, s, previous) : repReport(ex, s, previous);
}

function topFaults(ex: Exercise, s: SetSummary) {
  return Object.entries(s.faultCounts)
    .map(([id, n]) => ({ check: ex.checks.find((c) => c.id === id), n }))
    .filter((f): f is { check: NonNullable<typeof f.check>; n: number } => !!f.check)
    .sort((a, b) => Number(!!a.check.beta) - Number(!!b.check.beta) || Number(b.check.major) - Number(a.check.major) || b.n - a.n);
}

function repReport(ex: Exercise & { kind: "reps" }, s: SetSummary, previous: SetSummary[]): CoachReport {
  const reps = s.reps;
  const n = reps.length;
  const points: CoachPoint[] = [];
  if (n === 0) {
    return {
      headline: "No full reps yet",
      points: [
        { kind: "tip", text: `${ex.setup.placement}` },
        { kind: "tip", text: `Start from the start position: ${ex.setup.startHint.toLowerCase()}. A rep counts once your ${ex.depthLabel} gets at least halfway.` },
      ],
      next: "Try again with the whole body in view. The setup screen turns green when Spotter can see everything it needs.",
    };
  }
  const clean = reps.filter((r) => r.clean).length;
  const headline =
    s.score >= 90 ? "Textbook set." : s.score >= 75 ? "Strong set." : s.score >= 55 ? "Solid effort. A few things to tighten." : "Let's clean this up.";

  // What went well.
  if (clean === n && n >= 3) points.push({ kind: "win", text: `All ${n} reps were clean: full ${ex.depthLabel} and no form faults.` });
  else if (clean > 0) points.push({ kind: "win", text: `${clean} of ${n} reps were clean (${pct(clean, n)}%).` });
  const peaks = reps.map((r) => r.peak);
  if (n >= 4 && std(peaks) < 0.07 && mean(peaks) >= ex.depthAt) points.push({ kind: "win", text: `Very consistent: every rep reached the same ${ex.depthLabel}.` });

  // The one thing to fix.
  const faults = topFaults(ex, s);
  const shallow = reps.filter((r) => r.peak < ex.depthAt).length;
  const main = faults[0];
  if (main && (!shallow || main.n >= shallow || main.check.major)) {
    points.push({ kind: "fix", text: `${main.check.title} on ${plural(main.n, "rep")}. ${main.check.tip}${main.check.beta ? " (This check is in beta.)" : ""}` });
    if (shallow >= Math.max(2, n / 3)) points.push({ kind: "fix", text: `${shallow} of ${n} reps stopped short. ${ex.shallowTip}` });
  } else if (shallow) {
    points.push({ kind: "fix", text: `${shallow} of ${n} reps stopped short of full ${ex.depthLabel}. ${ex.shallowTip}` });
    if (main) points.push({ kind: "fix", text: `Also watch for: ${main.check.title.toLowerCase()} (${plural(main.n, "rep")}).` });
  }

  // Fatigue: where form fell off.
  if (n >= 6) {
    const third = Math.floor(n / 3);
    const early = mean(reps.slice(0, third).map((r) => r.score));
    const late = mean(reps.slice(-third).map((r) => r.score));
    if (early - late >= 12) {
      const firstBad = reps.findIndex((r, i) => i >= third && r.score < early - 12);
      const at = firstBad >= 0 ? firstBad + 1 : n - third + 1;
      points.push({
        kind: "fix",
        text: `Your form dropped from rep ${at} on (scores ${Math.round(early)} to ${Math.round(late)}). That's your fatigue point today. Stopping at ${Math.max(1, at - 1)} good reps and adding a set builds more strength than grinding out bad ones.`,
      });
    }
  }

  // Tempo.
  const rushed = reps.filter((r) => r.rushed).length;
  const down = mean(reps.map((r) => r.downMs));
  const avg = mean(reps.map((r) => r.durationMs));
  if (rushed >= Math.max(2, n / 3)) points.push({ kind: "tip", text: `${rushed} reps were rushed (average ${(avg / 1000).toFixed(1)} s per rep). Slow down: about 2 seconds down and 1 second up gives your muscles more time under tension.` });
  else if (["pushup", "squat", "lunge", "curl", "press"].includes(ex.id) && down < 650 && n >= 3)
    points.push({ kind: "tip", text: `You're dropping fast (${(down / 1000).toFixed(1)} s on the way down). Try a 2-second lowering phase for the next set.` });
  else if (n >= 3) points.push({ kind: "tip", text: `Tempo: ${(avg / 1000).toFixed(1)} s per rep on average. Nicely controlled.` });

  // Compared with last time.
  const last = previous[0];
  if (last && last.reps.length) {
    const dScore = s.score - last.score;
    const dReps = n - last.reps.length;
    const parts: string[] = [];
    if (dReps) parts.push(`${dReps > 0 ? "+" : ""}${dReps} reps`);
    if (Math.abs(dScore) >= 3) parts.push(`form score ${dScore > 0 ? "up" : "down"} ${Math.abs(dScore)} points`);
    if (parts.length) points.push({ kind: "trend", text: `Compared with your last ${ex.name.toLowerCase()} set: ${parts.join(", ")}.` });
    else points.push({ kind: "trend", text: `Right in line with your last ${ex.name.toLowerCase()} set. Consistency is how progress happens.` });
  }

  let next: string;
  if (s.score >= 90 && clean === n) next = n >= 12 ? `You've mastered this. Try the harder version: ${ex.harder}` : `Next time, go for ${n + 2} reps with the same form.`;
  else if (s.score < 55) next = `Make it easier while you groove the movement: ${ex.easier}`;
  else if (main) next = `Next set, think only about one thing: "${main.check.cue}".`;
  else next = `Next set, focus on full ${ex.depthLabel} on every rep.`;

  return { headline, points: points.slice(0, 5), next };
}

function holdReport(ex: Exercise & { kind: "hold" }, s: SetSummary, previous: SetSummary[]): CoachReport {
  const points: CoachPoint[] = [];
  if (s.holdMs < 1000) {
    return {
      headline: "The timer didn't start",
      points: [{ kind: "tip", text: ex.setup.placement }, { kind: "tip", text: `The timer runs while you're in position: ${ex.setup.startHint.toLowerCase()}.` }],
      next: "Try again with your whole body in view, side-on to the camera.",
    };
  }
  const good = pct(s.goodHoldMs, s.holdMs);
  const headline = good >= 90 ? "Rock solid." : good >= 70 ? "Strong hold." : good >= 45 ? "Good effort. Let's tighten the position." : "Hold the line, not just the time.";
  points.push({ kind: "win", text: `${seconds(s.holdMs)} seconds held, ${seconds(s.goodHoldMs)} of them in good form (${good}%).` });
  const main = topFaults(ex, s)[0];
  if (main) points.push({ kind: "fix", text: `${main.check.title} for about ${plural(main.n, "second")}. ${main.check.tip}` });
  const last = previous[0];
  if (last && last.holdMs) {
    const d = seconds(s.goodHoldMs) - seconds(last.goodHoldMs);
    points.push({ kind: "trend", text: d > 0 ? `${d} more good-form seconds than last time.` : d < 0 ? `${-d} fewer good-form seconds than last time. Rest well and come back stronger.` : "Same as last time. Steady." });
  }
  const next = good >= 85 ? `Add 10 seconds next time, or try: ${ex.harder}` : `Shorter holds with perfect form beat long sloppy ones. Try ${Math.max(15, Math.round(seconds(s.goodHoldMs) / 5) * 5)} seconds of perfect form.`;
  return { headline, points, next };
}
