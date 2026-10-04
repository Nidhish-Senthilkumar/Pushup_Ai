import { useState } from "react";
import { APP_NAME } from "../config";
import { href } from "../lib/router";
import { setProfile, type Profile } from "../lib/store";
import { Figure } from "../ui/Figure";
import { Icon } from "../ui/icons";

/** First visit: what Cadence is, then three optional questions. Everything can be skipped. */
export function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Profile["goal"]>("fitness");

  if (step === 0) {
    return (
      <div className="grid min-h-[75vh] items-center gap-10 lg:grid-cols-2" data-testid="onboarding">
        <div className="animate-rise">
          <div className="mb-3 text-xs font-bold tracking-[0.2em] text-volt uppercase">Free · private · works offline</div>
          <h1 className="display text-6xl sm:text-7xl">
            Meet {APP_NAME}.
            <br />
            <span className="text-volt">Your AI spotter.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-ink-2">Real-time form coaching from any camera. It counts every rep, catches bad form the moment it happens and tells you how to fix it. Your video never leaves your device.</p>
          <ul className="mt-6 space-y-2 text-ink-2">
            {["13 exercises, coached live", "Hands-free guided workouts", "A fitness test that builds your plan", "Arcade challenges with a leaderboard"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Icon.check className="text-volt" size={18} /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn btn-volt h-12 px-6 text-base" onClick={() => setStep(1)} data-testid="get-started">
              Get started <Icon.next size={18} />
            </button>
            <a className="btn btn-ghost h-12" href={href("/arcade")}>
              <Icon.joystick size={18} /> Try the Arcade
            </a>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <div className="pointer-events-none absolute inset-10 rounded-full bg-volt/15 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-4">
            {["pushup", "squat", "jumping-jack", "lunge"].map((id) => (
              <div key={id} className="card p-4">
                <Figure exerciseId={id} className="h-40 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const finish = () => {
    setProfile({ name: name.trim().slice(0, 24), goal, onboarded: true });
  };

  return (
    <div className="mx-auto max-w-lg animate-rise py-6">
      <h1 className="display text-5xl">Quick setup</h1>
      <p className="mt-2 text-ink-2">Optional. Stays on this device.</p>
      <label className="mt-6 block">
        <span className="text-sm font-semibold">What should your coach call you?</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className="mt-2 h-12 w-full rounded-xl border border-line-2 bg-raised px-4 text-lg outline-none focus:border-volt" data-testid="name-input" />
      </label>
      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">What's your main goal?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ["strength", "Get stronger"],
              ["fitness", "Get fitter"],
              ["form", "Learn good form"],
              ["fun", "Just for fun"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => setGoal(id)} aria-pressed={goal === id} className={`h-12 rounded-xl border font-semibold ${goal === id ? "border-volt bg-volt/10 text-volt" : "border-line-2 text-ink-2"}`}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="mt-6 text-sm text-muted">Age and body weight (for fitness-test ratings and calorie estimates) can be added later in Settings.</p>
      <button className="btn btn-volt mt-6 h-12 w-full text-base" onClick={finish} data-testid="finish-onboarding">
        Let's go
      </button>
    </div>
  );
}
