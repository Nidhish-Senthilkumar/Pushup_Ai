import { useEffect, useState, type ReactNode } from "react";
import { APP_NAME, ORIGIN_NAME, TEAM } from "../config";
import { EXERCISES } from "../engine/exercises";
import { href, navigate } from "../lib/router";
import { Figure } from "../ui/Figure";
import { Icon } from "../ui/icons";
import { LogoMark } from "../ui/Logo";
import { CLIP_RESULTS } from "../validation";

/**
 * A short slide deck built into the app, for presenting at the convention
 * from the same laptop that runs the demo. Arrow keys, space or a click move
 * between slides; the demo slide jumps straight into the Arcade.
 */

function Slide({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col justify-center px-8 sm:px-16">
      {eyebrow && <div className="mb-3 text-sm font-bold tracking-[0.2em] text-volt uppercase">{eyebrow}</div>}
      <h1 className="display text-5xl sm:text-7xl">{title}</h1>
      {children && <div className="mt-8 text-xl text-ink-2 sm:text-2xl">{children}</div>}
    </div>
  );
}

export function Pitch() {
  const total = CLIP_RESULTS.reduce((s, r) => s + r.truth, 0);
  const off = CLIP_RESULTS.reduce((s, r) => s + Math.abs(r.counted - r.truth), 0);
  const slides: ReactNode[] = [
    <div key="title" className="flex h-full flex-col items-center justify-center text-center">
      <LogoMark size={96} />
      <h1 className="display mt-8 text-7xl sm:text-9xl">{APP_NAME.toUpperCase()}</h1>
      <p className="mt-4 text-2xl text-ink-2 sm:text-3xl">A free AI personal trainer that runs on any camera.</p>
      <div className="mt-10 flex gap-6">
        {["pushup", "squat", "jumping-jack"].map((id) => (
          <Figure key={id} exerciseId={id} className="h-32 w-40" />
        ))}
      </div>
    </div>,
    <Slide key="problem" eyebrow="The problem" title="Bad form hides until it hurts.">
      <ul className="space-y-4">
        <li>Most people train alone, with nobody watching their form.</li>
        <li>A personal trainer often costs $50 or more an hour.</li>
        <li>Free apps count reps or play videos. They can't see you.</li>
      </ul>
    </Slide>,
    <Slide key="solution" eyebrow="Our solution" title={<>A coach that watches <span className="text-volt">every rep</span>.</>}>
      <div className="grid gap-6 sm:grid-cols-3">
        {[
          ["eye", "Sees you", "33 body points, 30 times a second, from any phone or laptop camera."],
          ["volume", "Coaches live", "\"Lift your hips.\" \"Go lower.\" Spoken and on screen, during the rep."],
          ["chart", "Explains after", "Rep-by-rep scores, your fatigue point and one thing to fix next time."],
        ].map(([icon, h, t]) => {
          const I = Icon[icon as "eye"];
          return (
            <div key={h} className="card p-6">
              <I className="text-volt" size={36} />
              <div className="mt-3 text-2xl font-bold text-ink">{h}</div>
              <p className="mt-2 text-lg">{t}</p>
            </div>
          );
        })}
      </div>
    </Slide>,
    <Slide key="how" eyebrow="How it works" title="All on the device.">
      <div className="flex flex-wrap items-center gap-3 text-lg">
        {["Camera", "Pose model (MediaPipe)", "Smoothing", "Joint angles & body line", "Rep engine", "Form checks", "Coach"].map((s, i, a) => (
          <span key={s} className="flex items-center gap-3">
            <span className={`rounded-xl px-4 py-3 font-semibold ${i === 1 ? "bg-volt text-black" : "bg-raised text-ink"}`}>{s}</span>
            {i < a.length - 1 && <Icon.next className="text-muted" />}
          </span>
        ))}
      </div>
      <p className="mt-8">No server. No uploads. No account. Works offline. Costs nothing to run.</p>
    </Slide>,
    <Slide key="features" eyebrow="What it does" title="A whole fitness guide.">
      <div className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
        {[
          `${EXERCISES.length} exercises, coached live`,
          "Hands-free guided workouts",
          "Fitness test and a 4-week plan",
          "Streaks, records, achievements",
          "Arcade mode with a leaderboard and duels",
          "Analyze a recorded video",
          "X-ray view of what the AI measures",
          "Data Lab to keep improving the model",
        ].map((t) => (
          <div key={t} className="flex items-center gap-3">
            <Icon.check className="shrink-0 text-volt" /> {t}
          </div>
        ))}
      </div>
    </Slide>,
    <Slide key="demo" eyebrow="Live demo" title="Your turn.">
      <p>Squat Sprint: 30 seconds, only perfect reps count.</p>
      <button className="btn btn-volt mt-8 h-16 px-10 text-2xl" onClick={() => navigate("/arcade")}>
        <Icon.play /> Open the Arcade
      </button>
    </Slide>,
    <Slide key="accuracy" eyebrow="Does it work?" title={<>{total} reps, off by <span className="text-volt">{off}</span>.</>}>
      <p>We counted reps by hand in {CLIP_RESULTS.length} real exercise videos, frame by frame, and compared. Three of them were held out: counted first, run once, no tuning, and two of those three were exact. The one miss was a barbell press filmed from behind, where the head hides the hands. Darkened, slowed-down and far-away versions of three clips: 8 of 9 still exact.</p>
      <p className="mt-4">Plus 90 automated engine tests (a synthetic 3D body doing known reps and known mistakes, and replays of the real videos) and 25 browser tests, including one that checks nothing leaves the device.</p>
    </Slide>,
    <Slide key="journey" eyebrow="What we learned" title={`From ${ORIGIN_NAME} to ${APP_NAME}.`}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card p-6">
          <div className="text-lg font-bold text-ink">{ORIGIN_NAME}</div>
          <ul className="mt-3 space-y-2 text-lg">
            <li>Push-ups only</li>
            <li>Record, upload to a laptop, wait</li>
            <li>LSTM trained on one person</li>
            <li>One sentence of feedback</li>
          </ul>
        </div>
        <div className="card border-volt/50 p-6">
          <div className="text-lg font-bold text-volt">{APP_NAME}</div>
          <ul className="mt-3 space-y-2 text-lg">
            <li>13 exercises</li>
            <li>Feedback during the rep, on the device</li>
            <li>Measured form checks that work for anyone</li>
            <li>A full coaching report, a plan and progress</li>
          </ul>
        </div>
      </div>
    </Slide>,
    <Slide key="team" eyebrow="Thank you" title="Try it now.">
      <p>Scan the QR code at the booth, or open the Arcade and beat the leaderboard.</p>
      <p className="mt-6 text-lg text-muted">Built by {TEAM.join(", ")}.</p>
      <a className="btn btn-ghost mt-8" href={href("/")}>
        Exit presentation
      </a>
    </Slide>,
  ];

  const [i, setI] = useState(0);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) setI((n) => Math.min(slides.length - 1, n + 1));
      if (["ArrowLeft", "PageUp"].includes(e.key)) setI((n) => Math.max(0, n - 1));
      if (e.key === "Escape") navigate("/");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [slides.length]);

  return (
    <div className="app-glow fixed inset-0 overflow-hidden text-ink" data-testid="pitch">
      <div key={i} className="h-full animate-rise">
        {slides[i]}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 pb-5">
        <button className="btn btn-ghost h-10" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} aria-label="Previous slide">
          <Icon.back size={18} />
        </button>
        <div className="flex gap-1.5" aria-label={`Slide ${i + 1} of ${slides.length}`}>
          {slides.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Go to slide ${k + 1}`} className={`h-2 rounded-full transition-all ${k === i ? "w-8 bg-volt" : "w-2 bg-line-2"}`} />
          ))}
        </div>
        <button className="btn btn-ghost h-10" onClick={() => setI((n) => Math.min(slides.length - 1, n + 1))} disabled={i === slides.length - 1} aria-label="Next slide" data-testid="pitch-next">
          <Icon.next size={18} />
        </button>
      </div>
    </div>
  );
}
