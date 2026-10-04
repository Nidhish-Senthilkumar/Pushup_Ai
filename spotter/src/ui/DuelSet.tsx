import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercise } from "../engine/exercise";
import { ExerciseSession, type LiveState, type SetSummary } from "../engine/session";
import type { Landmark, Point3, PoseFrame } from "../engine/types";
import { sfx, setSoundsEnabled, unlockAudio } from "../lib/sounds";
import { speak } from "../lib/speech";
import { useData } from "../lib/store";
import { useWakeLock } from "../lib/wakeLock";
import { cameraMessage, useCamera } from "../vision/useCamera";
import { usePoseTracker } from "../vision/usePoseTracker";
import { Icon } from "./icons";
import { drawSkeleton } from "./overlay";

/**
 * Two players side by side, each counted on their own. The picture is split
 * down the middle: whoever stands on the left half of the screen is player 1.
 * Each player gets their own engine session, fed only their own skeleton,
 * so a rep (or a bad rep) on one side can't touch the other side's count.
 */

export interface DuelResult {
  left: SetSummary;
  right: SetSummary;
}

const COLORS = ["#d4ff3a", "#38e1ff"] as const;

type Person = { landmarks: Landmark[]; world?: Point3[] };

function centerX(lm: Landmark[]): number | null {
  const seen = lm.filter((p) => p.visibility >= 0.4);
  if (seen.length < 4) return null;
  return seen.reduce((s, p) => s + p.x, 0) / seen.length;
}

export function DuelSet({ exercise: ex, seconds, onDone, onExit }: { exercise: Exercise; seconds: number; onDone: (r: DuelResult) => void; onExit: () => void }) {
  const { settings } = useData();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef);
  const sessions = useRef([new ExerciseSession(ex, { formGate: true, strictness: settings.strictness }), new ExerciseSession(ex, { formGate: true, strictness: settings.strictness })]);
  const [phase, setPhase] = useState<"setup" | "countdown" | "active" | "done">("setup");
  const phaseRef = useRef(phase);
  const [count, setCount] = useState(3);
  const [hud, setHud] = useState<(LiveState | null)[]>([null, null]);
  const [flash, setFlash] = useState<{ side: 0 | 1; text: string; good: boolean; key: number } | null>(null);
  const [left, setLeft] = useState(seconds * 1000);
  const startAt = useRef(0);
  const lastHud = useRef(0);
  const mirror = settings.mirror && (camera.status.kind !== "live" || camera.status.facing !== "environment");

  useWakeLock(phase === "active" || phase === "countdown");
  useEffect(() => setSoundsEnabled(settings.sounds), [settings.sounds]);
  useEffect(() => {
    void camera.start();
    return () => camera.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPhaseBoth = (p: typeof phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const finish = useCallback(() => {
    if (phaseRef.current === "done") return;
    setPhaseBoth("done");
    sfx.finish();
    onDone({ left: sessions.current[0]!.summary(), right: sessions.current[1]!.summary() });
  }, [onDone]);

  const begin = () => {
    if (phaseRef.current !== "setup") return;
    unlockAudio();
    setPhaseBoth("countdown");
    setCount(3);
  };

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      sfx.go();
      if (settings.voice) speak("Go");
      const now = performance.now();
      sessions.current.forEach((s) => s.begin(now));
      startAt.current = now;
      setPhaseBoth("active");
      return;
    }
    sfx.tick();
    const id = window.setTimeout(() => setCount((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "active") return;
    const id = window.setInterval(() => {
      const remaining = seconds * 1000 - (performance.now() - startAt.current);
      setLeft(remaining);
      if (remaining <= 0) finish();
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, seconds, finish]);

  const onFrame = useCallback(
    (frame: PoseFrame) => {
      const people: Person[] = frame.candidates ?? (frame.landmarks.length ? [{ landmarks: frame.landmarks, world: frame.world }] : []);
      // Screen side, not image side: with a mirrored selfie view the image's right half is on the left of the screen.
      const sideOf = (p: Person) => {
        const x = centerX(p.landmarks);
        if (x === null) return null;
        const onImageLeft = x < frame.width / 2;
        return (mirror ? !onImageLeft : onImageLeft) ? 0 : 1;
      };
      const bySide: (Person | null)[] = [null, null];
      for (const p of people) {
        const s = sideOf(p);
        if (s === null) continue;
        const cur = bySide[s];
        // Two people on one side: keep the bigger one.
        if (!cur || p.landmarks.filter((q) => q.visibility > 0.5).length > cur.landmarks.filter((q) => q.visibility > 0.5).length) bySide[s] = p;
      }
      const states = sessions.current.map((s, i) => {
        const p = bySide[i];
        return s.push({ t: frame.t, width: frame.width, height: frame.height, landmarks: p?.landmarks ?? [], world: p?.world });
      });
      const canvas = canvasRef.current;
      if (canvas) {
        drawSkeleton(canvas, { ...frame, landmarks: states[0]!.subject }, { highlight: states[0]!.highlight, color: COLORS[0] });
        drawSkeleton(canvas, { ...frame, landmarks: states[1]!.subject }, { highlight: states[1]!.highlight, color: COLORS[1], clear: false });
      }
      sessions.current.forEach((s, i) => {
        for (const e of s.drain()) {
          if (e.type !== "rep") continue;
          if (e.rep.clean) sfx.clean();
          else sfx.miss();
          setFlash({ side: i as 0 | 1, text: e.rep.clean ? "+1" : "Not counted", good: e.rep.clean, key: performance.now() });
        }
      });
      if (phaseRef.current === "setup" && states.every((st) => st.ready && st.readyForMs > 900)) begin();
      const now = performance.now();
      if (now - lastHud.current > 90) {
        lastHud.current = now;
        setHud(states);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mirror],
  );

  usePoseTracker({ videoRef, enabled: camera.status.kind === "live", variant: settings.model, onFrame });
  const msg = cameraMessage(camera.status);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 900);
    return () => window.clearTimeout(id);
  }, [flash]);

  const player = (i: 0 | 1) => {
    const st = hud[i];
    const ready = st?.ready;
    return (
      <div className={`absolute top-16 ${i === 0 ? "left-4 text-left sm:left-8" : "right-4 text-right sm:right-8"}`} data-testid={`duel-p${i + 1}`}>
        <div className="text-sm font-bold tracking-widest uppercase" style={{ color: COLORS[i] }}>
          Player {i + 1}
        </div>
        {phase === "setup" ? (
          <div className="mt-2 rounded-xl bg-black/60 px-3 py-2 text-sm">{!st?.found && !st?.ready ? "Step in on this side" : ready ? "Ready!" : st?.issues[0] ? "Adjust your position" : "Get into position"}</div>
        ) : (
          <div className="display tabular text-[22vmin] leading-none" style={{ color: COLORS[i], textShadow: `0 0 30px ${COLORS[i]}55` }}>
            {st?.cleanReps ?? 0}
          </div>
        )}
        {flash && flash.side === i && (
          <div key={flash.key} className={`display mt-1 inline-block animate-pop rounded-xl px-3 py-1 text-3xl ${flash.good ? "bg-good text-white" : "bg-bad text-white"}`}>
            {flash.text}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-black text-ink select-none" data-testid="duel" data-phase={phase}>
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" style={{ transform: mirror ? "scaleX(-1)" : undefined }} muted playsInline />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain" style={{ transform: mirror ? "scaleX(-1)" : undefined }} />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3">
        <button className="grid h-10 w-10 place-items-center rounded-full bg-black/50" onClick={onExit} aria-label="Back to the Arcade">
          <Icon.x size={18} />
        </button>
        <div className="text-sm font-bold text-volt uppercase">Duel · {ex.name}</div>
        <span className="w-10" />
      </div>
      {player(0)}
      {player(1)}
      {msg && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="card p-6 text-center" role="alert">
            {msg}
          </div>
        </div>
      )}
      {phase === "setup" && !msg && (
        <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3">
          <p className="rounded-full bg-black/60 px-4 py-2 text-center">One player on each side of the line, facing the camera. Both get ready to start.</p>
          <button className="btn btn-volt" onClick={begin} data-testid="duel-start">
            <Icon.play size={18} /> Start now
          </button>
        </div>
      )}
      {phase === "countdown" && (
        <div className="absolute inset-0 grid place-items-center">
          <div key={count} className="display animate-pop text-[30vmin] text-volt">{count > 0 ? count : "GO"}</div>
        </div>
      )}
      {phase === "active" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1">
          <span className={`display tabular text-5xl ${left < 5000 ? "text-bad-ink" : ""}`}>{Math.max(0, Math.ceil(left / 1000))}</span>
        </div>
      )}
    </div>
  );
}
