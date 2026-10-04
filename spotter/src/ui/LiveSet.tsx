import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercise } from "../engine/exercise";
import { ISSUE_TEXT } from "../engine/framing";
import { ExerciseSession, type LiveState, type RepResult, type SetSummary } from "../engine/session";
import type { PoseFrame } from "../engine/types";
import { sfx, setSoundsEnabled, unlockAudio } from "../lib/sounds";
import { speak, stopSpeaking } from "../lib/speech";
import { setSettings, useData } from "../lib/store";
import { useWakeLock } from "../lib/wakeLock";
import { cameraMessage, useCamera } from "../vision/useCamera";
import { usePoseTracker } from "../vision/usePoseTracker";
import { Figure } from "./Figure";
import { Icon } from "./icons";
import { drawSkeleton } from "./overlay";

/**
 * One live set: camera, pose tracking, setup checks, a hands-free start,
 * counting and coaching. Used by single sets, guided workouts, the fitness
 * test, the Arcade and the Data Lab.
 */

export type Phase = "setup" | "countdown" | "active" | "done";

/** Exercises where both hands go overhead as part of the movement, so "hands up" can't mean "I'm done". */
const HANDS_UP_EXEMPT = new Set(["jumping-jack", "press", "lateral-raise", "situp"]);

export interface LiveSetProps {
  exercise: Exercise;
  target?: { reps?: number; ms?: number };
  /** Only clean reps count (Arcade). */
  formGate?: boolean;
  /** End the set after a few seconds without a rep (max-rep tests). */
  untilFailure?: boolean;
  /** Holds: end once the person has held for a while and then left the position (max-hold tests). */
  holdUntilBreak?: boolean;
  /** Start the countdown automatically once the person holds the start position. */
  autoStart?: boolean;
  countdownSec?: number;
  /** Shown above the exercise name, e.g. "Set 2 of 5". */
  eyebrow?: string;
  onDone: (summary: SetSummary) => void;
  onExit: () => void;
  onRep?: (rep: RepResult, state: LiveState) => void;
  onFrame?: (frame: PoseFrame, state: LiveState, phase: Phase) => void;
  /** Big arcade-style HUD. */
  arcade?: boolean;
  /** Hide the exit button (kiosk). */
  kiosk?: boolean;
}

interface Toast {
  key: number;
  text: string;
  tone: "good" | "warn" | "bad";
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function LiveSet(props: LiveSetProps) {
  const { exercise: ex, target, formGate, untilFailure, holdUntilBreak, autoStart = true, countdownSec = 3, arcade } = props;
  const { settings } = useData();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef);
  const [phase, setPhase] = useState<Phase>("setup");
  const phaseRef = useRef<Phase>("setup");
  const sessionRef = useRef<ExerciseSession>(new ExerciseSession(ex, { formGate, strictness: settings.strictness }));
  const [hud, setHud] = useState<LiveState | null>(null);
  const [count, setCount] = useState(countdownSec);
  const [toast, setToast] = useState<Toast | null>(null);
  const [cue, setCue] = useState<{ text: string; key: number; major: boolean } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [xray, setXray] = useState(false);
  const startedAt = useRef<number | null>(null);
  const lastHud = useRef(0);
  const lastRepAt = useRef(0);
  const outOfPositionSince = useRef<number | null>(null);
  const handsUpSince = useRef<number | null>(null);
  const finished = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useWakeLock(phase === "active" || phase === "countdown");

  useEffect(() => {
    setSoundsEnabled(settings.sounds);
  }, [settings.sounds]);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Open the camera on mount.
  useEffect(() => {
    void camera.start();
    return () => {
      camera.stop();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setPhaseBoth("done");
    sfx.finish();
    stopSpeaking();
    props.onDone(sessionRef.current.summary());
  }, [props]);

  const say = (text: string) => {
    if (settingsRef.current.voice) speak(text);
  };

  const beginCountdown = useCallback(() => {
    if (phaseRef.current !== "setup") return;
    unlockAudio();
    setPhaseBoth("countdown");
    setCount(countdownSec);
  }, [countdownSec]);

  // Countdown ticks.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      sfx.go();
      say("Go");
      const now = performance.now();
      sessionRef.current.begin(now);
      startedAt.current = now;
      lastRepAt.current = now;
      setPhaseBoth("active");
      return;
    }
    sfx.tick();
    const id = window.setTimeout(() => setCount((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  // Elapsed / remaining clock.
  useEffect(() => {
    if (phase !== "active") return;
    const id = window.setInterval(() => {
      if (startedAt.current === null) return;
      const e = performance.now() - startedAt.current;
      setElapsed(e);
      const s = sessionRef.current;
      if (target?.ms && ex.kind === "reps" && e >= target.ms) finish();
      // Max-rep test: stop once reps have dried up.
      if (untilFailure && s.summary().reps.length > 0 && performance.now() - lastRepAt.current > 6000) finish();
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, target, ex.kind, finish, untilFailure]);

  const onFrame = useCallback(
    (frame: PoseFrame) => {
      const s = sessionRef.current;
      const state = s.push(frame);
      const canvas = canvasRef.current;
      if (canvas) drawSkeleton(canvas, { ...frame, landmarks: state.subject }, { highlight: state.highlight });
      props.onFrame?.(frame, state, phaseRef.current);

      if (phaseRef.current === "setup" && autoStart && state.ready && state.readyForMs > 900) beginCountdown();

      for (const e of s.drain()) {
        if (e.type === "rep") {
          lastRepAt.current = performance.now();
          const r = e.rep;
          const faultTitle = r.faults.map((id) => ex.checks.find((c) => c.id === id)).find((c) => c && !c.beta)?.title;
          const counted = !formGate || r.clean;
          if (!counted) {
            sfx.miss();
            setToast({ key: r.index, text: !faultTitle ? "Too shallow · not counted" : `${faultTitle} · not counted`, tone: "bad" });
          } else if (r.clean && r.quality === "perfect") {
            sfx.clean();
            setToast({ key: r.index, text: "Perfect", tone: "good" });
          } else if (r.clean) {
            sfx.clean();
            setToast({ key: r.index, text: r.rushed ? "Good · slow down" : "Good", tone: "good" });
          } else {
            sfx.fault();
            setToast({ key: r.index, text: faultTitle ?? "Shallow", tone: "warn" });
          }
          const reps = formGate ? state.cleanReps : state.reps;
          if (counted && !arcade) {
            const t = target?.reps;
            // A coach counts, and calls the moments that matter.
            if (t && reps === t - 1 && t >= 4) say(`${reps}. Last one!`);
            else if (t && t >= 8 && reps === Math.floor(t / 2)) say(`${reps}. Halfway!`);
            else if (settingsRef.current.countAloud) say(String(reps));
          }
          props.onRep?.(r, state);
          if (target?.reps && reps >= target.reps) window.setTimeout(finish, 600);
        } else if (e.type === "cue" || e.type === "shallow") {
          setCue({ text: e.text, key: performance.now(), major: e.type === "cue" ? e.major : true });
          say(e.text);
        } else if (e.type === "lost") {
          setCue({ text: "I can't see you. Step back into view", key: performance.now(), major: true });
        }
      }

      if (ex.kind === "hold" && target?.ms && phaseRef.current === "active" && state.holdMs >= target.ms) finish();
      // Hands-free finish: both hands above the head for 1.5 s ends the set,
      // so nobody has to walk back to the phone. Not for exercises where the
      // arms go overhead anyway.
      if (phaseRef.current === "active" && !HANDS_UP_EXEMPT.has(ex.id) && (state.reps > 0 || state.holdMs > 3000) && !state.inRep) {
        const lm = state.subject;
        const up = lm.length >= 33 && [15, 16].every((i) => (lm[i]?.visibility ?? 0) > 0.6 && lm[i]!.y < lm[0]!.y) && (lm[0]?.visibility ?? 0) > 0.5;
        if (up) {
          handsUpSince.current ??= frame.t;
          if (frame.t - handsUpSince.current > 1500) {
            handsUpSince.current = null;
            say("Set done");
            finish();
          }
        } else handsUpSince.current = null;
      }
      if (ex.kind === "hold" && holdUntilBreak && phaseRef.current === "active") {
        if (state.inPosition) outOfPositionSince.current = null;
        else if (state.holdMs > 2000) {
          outOfPositionSince.current ??= frame.t;
          if (frame.t - outOfPositionSince.current > 2500) finish();
        }
      }

      const now = performance.now();
      if (now - lastHud.current > 80) {
        lastHud.current = now;
        setHud(state);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ex, formGate, autoStart, beginCountdown, target, finish, arcade, holdUntilBreak],
  );

  const tracker = usePoseTracker({ videoRef, enabled: camera.status.kind === "live", variant: settings.model, onFrame });

  // Clear the cue after a few seconds.
  useEffect(() => {
    if (!cue) return;
    const id = window.setTimeout(() => setCue(null), 2600);
    return () => window.clearTimeout(id);
  }, [cue]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1300);
    return () => window.clearTimeout(id);
  }, [toast]);

  const facingUser = camera.status.kind === "live" ? camera.status.facing !== "environment" : true;
  const mirror = settings.mirror && facingUser;
  const camMsg = cameraMessage(camera.status);
  const reps = hud ? (formGate ? hud.cleanReps : hud.reps) : 0;
  const isHold = ex.kind === "hold";
  const remaining = target?.ms ? target.ms - (isHold ? (hud?.holdMs ?? 0) : elapsed) : null;
  const issue = hud?.issues[0];
  const loading = tracker.status === "loading" || camera.status.kind === "starting";

  const flipCamera = () => {
    if (camera.devices.length < 2) return;
    const i = camera.devices.findIndex((d) => d.deviceId === camera.deviceId);
    const next = camera.devices[(i + 1) % camera.devices.length]!;
    void camera.start(next.deviceId);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black text-ink select-none" data-testid="live-set" data-phase={phase}>
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" style={{ transform: mirror ? "scaleX(-1)" : undefined }} muted playsInline />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain" style={{ transform: mirror ? "scaleX(-1)" : undefined }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        {!props.kiosk && (
          <button className="grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" onClick={() => (phase === "active" && reps > 0 ? finish() : props.onExit())} aria-label="Close">
            <Icon.x />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {props.eyebrow && <div className="text-xs font-semibold tracking-wide text-volt uppercase">{props.eyebrow}</div>}
          <div className="truncate text-lg font-bold" data-testid="exercise-name">
            {ex.name}
            {target?.reps ? <span className="text-muted"> · {target.reps} reps</span> : target?.ms ? <span className="text-muted"> · {Math.round(target.ms / 1000)} s</span> : null}
          </div>
        </div>
        {settings.showDebug && <span className="chip tabular">{tracker.fps} fps · {tracker.delegate}</span>}
        <button className={`grid h-11 w-11 place-items-center rounded-full backdrop-blur ${xray ? "bg-cyan text-black" : "bg-black/50"}`} onClick={() => setXray((x) => !x)} aria-label={xray ? "Hide measurements" : "Show what the AI measures"} aria-pressed={xray} data-testid="xray">
          <Icon.eye />
        </button>
        <button className="grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" onClick={() => setSettings({ voice: !settings.voice })} aria-label={settings.voice ? "Turn voice off" : "Turn voice on"} aria-pressed={settings.voice}>
          {settings.voice ? <Icon.volume /> : <Icon.mute />}
        </button>
        {camera.devices.length > 1 && (
          <button className="grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" onClick={flipCamera} aria-label="Switch camera">
            <Icon.flip />
          </button>
        )}
      </div>

      {xray && hud && <XRay state={hud} exercise={ex} fps={tracker.fps} />}

      {/* For screen readers: each rep and its verdict. */}
      <div className="sr-only" aria-live="polite">
        {toast ? `${formGate ? hud?.cleanReps : hud?.reps} reps. ${toast.text}` : ""}
      </div>

      {/* Camera problems */}
      {camMsg && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="card max-w-md p-6 text-center">
            <Icon.camera className="mx-auto mb-3 text-volt" size={36} />
            <p className="mb-4 text-ink-2" role="alert">{camMsg}</p>
            <button className="btn btn-volt" onClick={() => void camera.start()}>Try again</button>
          </div>
        </div>
      )}
      {tracker.status === "error" && (
        <div className="absolute inset-x-0 top-24 mx-auto max-w-md p-4">
          <div className="card p-4 text-sm text-bad-ink" role="alert">The pose model couldn't start: {tracker.error}</div>
        </div>
      )}
      {loading && !camMsg && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-3 rounded-full bg-black/60 px-5 py-3 text-sm">
            <span className="h-3 w-3 animate-ping rounded-full bg-volt" /> {tracker.status === "loading" ? "Loading the AI model…" : "Starting camera…"}
          </div>
        </div>
      )}

      {/* Setup */}
      {phase === "setup" && !camMsg && !loading && (
        <div className="absolute inset-x-0 bottom-0 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="card mx-auto flex max-w-2xl animate-rise items-center gap-4 bg-surface/90 p-4 backdrop-blur" data-testid="setup-card">
            <Figure exerciseId={ex.id} className="h-28 w-28 shrink-0 sm:h-32 sm:w-32" />
            <div className="min-w-0 flex-1">
              <SetupStatus state={hud} exercise={ex} />
              <p className="mt-1 text-sm text-muted">{ex.setup.placement}</p>
              {ex.setup.viewTip && hud?.view === ex.setup.viewTip.when && <p className="mt-1 text-sm text-cyan">{ex.setup.viewTip.text}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-volt" onClick={beginCountdown} data-testid="start-now">
                  <Icon.play size={18} /> Start now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Countdown */}
      {phase === "countdown" && (
        <div className="absolute inset-0 grid place-items-center">
          <div key={count} className="display animate-pop text-[34vmin] text-volt drop-shadow-[0_0_40px_rgba(212,255,58,0.5)]">{count > 0 ? count : "GO"}</div>
        </div>
      )}

      {/* Active HUD */}
      {(phase === "active" || phase === "done") && (
        <>
          {!isHold && hud && ex.kind === "reps" && <DepthGauge p={hud.p} depthAt={ex.depthAt} countAt={ex.countAt} />}
          <div className="absolute top-20 right-4 text-right sm:right-8">
            {isHold ? (
              <div data-testid="hold-timer">
                <div className={`display tabular text-[22vmin] ${hud?.inPosition ? (hud.activeFaults.length ? "text-warn" : "text-volt") : "text-ink/50"}`}>{fmt(hud?.holdMs ?? 0)}</div>
                <div className="text-sm font-semibold text-ink-2">{hud?.inPosition ? (hud.activeFaults.length ? "Fix your position" : "Holding · good form") : "Get into position"}</div>
              </div>
            ) : (
              <div data-testid="rep-counter">
                <div key={reps} className={`display tabular ${arcade ? "text-[30vmin]" : "text-[24vmin]"} text-volt drop-shadow-[0_0_30px_rgba(212,255,58,0.35)] [animation:bump_300ms_ease-out]`}>{reps}</div>
                <div className="text-sm font-semibold text-ink-2">
                  {target?.reps ? `of ${target.reps} reps` : formGate ? "clean reps" : "reps"}
                  {hud && hud.reps > 0 && !formGate ? ` · ${hud.cleanReps} clean` : ""}
                </div>
              </div>
            )}
          </div>
          {remaining !== null && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-4 py-1.5 text-center backdrop-blur" data-testid="time-left">
              <span className={`display tabular text-4xl ${remaining < 5000 ? "text-bad-ink" : "text-ink"}`}>{fmt(remaining)}</span>
            </div>
          )}
          {toast && (
            <div className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center">
              <div key={toast.key} className={`display animate-pop rounded-2xl px-6 py-2 text-5xl uppercase sm:text-6xl ${toast.tone === "good" ? "bg-good/85 text-white" : toast.tone === "warn" ? "bg-warn/90 text-black" : "bg-bad/90 text-white"}`} data-testid="rep-toast">
                {toast.text}
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
            {cue && (
              <div key={cue.key} className={`animate-rise rounded-2xl px-5 py-3 text-xl font-bold ${cue.major ? "bg-bad text-white" : "bg-warn text-black"}`} role="status" data-testid="cue">
                {cue.text}
              </div>
            )}
            {!issue || phase !== "active" ? null : hud && !hud.found ? (
              <div className="rounded-full bg-black/60 px-4 py-2 text-sm">{ISSUE_TEXT[issue]}</div>
            ) : null}
            {phase === "active" && !props.kiosk && !HANDS_UP_EXEMPT.has(ex.id) && !target && (
              <div className="rounded-full bg-black/50 px-3 py-1 text-xs text-ink-2">Done? Raise both hands over your head</div>
            )}
            {phase === "active" && !props.kiosk && (
              <div className="flex items-center gap-3">
                <span className="chip tabular bg-black/50">{fmt(elapsed)}</span>
                <button className="btn btn-ghost bg-black/50" onClick={finish} data-testid="finish">
                  <Icon.stop size={16} /> Finish set
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SetupStatus({ state, exercise }: { state: LiveState | null; exercise: Exercise }) {
  if (!state || state.issues.includes("no-person")) {
    return <p className="text-lg font-bold" data-testid="setup-status">Step into view</p>;
  }
  const issue = state.issues[0];
  if (issue) {
    return (
      <p className="text-lg font-bold text-warn" data-testid="setup-status">
        {ISSUE_TEXT[issue]}
      </p>
    );
  }
  if (!state.framing.ok) return <p className="text-lg font-bold" data-testid="setup-status">Hold on…</p>;
  if (state.ready) {
    return (
      <p className="text-lg font-bold text-volt" data-testid="setup-status">
        <span className="mr-2 inline-block h-3 w-3 animate-ping rounded-full bg-volt" />
        Perfect. Hold still…
      </p>
    );
  }
  return (
    <p className="text-lg font-bold" data-testid="setup-status">
      <Icon.check className="mr-1 inline text-volt" size={20} /> I can see you. {exercise.setup.startHint}
    </p>
  );
}

function DepthGauge({ p, depthAt, countAt }: { p: number | null; depthAt: number; countAt: number }) {
  const v = Math.max(0, Math.min(1.2, p ?? 0));
  const h = (x: number) => `${(x / 1.2) * 100}%`;
  const deep = v >= depthAt;
  return (
    <div className="absolute top-1/2 left-4 h-[46vh] w-4 -translate-y-1/2 rounded-full bg-white/12 sm:left-8 sm:w-5" aria-hidden="true" data-testid="depth-gauge">
      <div className="absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-75" style={{ height: h(v), background: deep ? "#d4ff3a" : "#38e1ff", boxShadow: deep ? "0 0 18px rgba(212,255,58,0.7)" : undefined }} />
      <div className="absolute -inset-x-1.5 h-0.5 bg-volt" style={{ bottom: h(depthAt) }} />
      <div className="absolute -inset-x-1 h-px bg-white/50" style={{ bottom: h(countAt) }} />
      <div className="absolute -right-12 text-[10px] font-bold tracking-wide text-volt uppercase" style={{ bottom: `calc(${h(depthAt)} - 6px)` }}>
        depth
      </div>
    </div>
  );
}

/** Labels for the measurements, for the X-ray panel. Unlisted ones are shown by their key. */
const METRIC_LABEL: Record<string, [string, string]> = {
  p: ["Rep depth", "%"],
  elbow: ["Elbow angle", "°"],
  knee: ["Knee angle", "°"],
  hip: ["Hip angle", "°"],
  line: ["Body line", "%"],
  lean: ["Torso lean", "°"],
  hipKnee: ["Hip above knee", "×shin"],
  cave: ["Knee gap / ankle gap", "×"],
  flare: ["Elbow flare (3D)", "°"],
  drift: ["Upper arm drift", "°"],
  arms: ["Arms raised", "°"],
  spread: ["Feet apart", "×shin"],
  raise: ["Arm raise", "°"],
  torso: ["Torso angle", "°"],
  uneven: ["Arm difference", ""],
  flat: ["Body tilt", "°"],
  pL: ["Left side depth", "%"],
  pR: ["Right side depth", "%"],
};
const HIDDEN = new Set(["kneeling", "supported", "front", "hipW", "armP", "legP", "shoulderW", "level"]);

/**
 * "X-ray": the numbers the engine is working from, live. Useful for showing
 * judges what the AI actually measures, and for debugging a camera position.
 */
function XRay({ state, exercise, fps }: { state: LiveState; exercise: Exercise; fps: number }) {
  const m = state.metrics;
  const fmt = (k: string, v: number) => {
    const [, unit] = METRIC_LABEL[k] ?? [k, ""];
    if (!Number.isFinite(v)) return "–";
    if (unit === "%") return `${Math.round((k === "p" || k === "pL" || k === "pR" ? Math.max(0, v) : v) * 100)}%`;
    if (unit === "°") return `${Math.round(v)}°`;
    return v.toFixed(2);
  };
  return (
    <div className="absolute top-20 left-12 z-10 w-64 rounded-2xl border border-cyan/40 bg-black/70 p-3 text-xs backdrop-blur sm:left-16" data-testid="xray-panel">
      <div className="mb-2 flex items-center justify-between font-bold text-cyan">
        <span>What the AI measures</span>
        <span className="tabular text-muted">{fps} fps</span>
      </div>
      {!m ? (
        <p className="text-muted">Looking for {exercise.name.toLowerCase()} joints…</p>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 tabular">
          {Object.entries(m)
            .filter(([k]) => !HIDDEN.has(k))
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-2">{METRIC_LABEL[k]?.[0] ?? k}</dt>
                <dd className="text-right font-semibold text-ink">{fmt(k, v)}</dd>
              </div>
            ))}
        </dl>
      )}
      <div className="mt-2 border-t border-white/10 pt-2 text-muted">
        33 body points · {state.activeFaults.length ? `faults: ${state.activeFaults.join(", ")}` : "no faults right now"}
      </div>
    </div>
  );
}
