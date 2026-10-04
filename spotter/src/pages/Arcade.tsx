import { useCallback, useEffect, useRef, useState } from "react";
import { APP_NAME, HOSTED_URL } from "../config";
import { exercise } from "../engine/exercises";
import type { SetSummary } from "../engine/session";
import { LM, type PoseFrame } from "../engine/types";
import { finishWorkout } from "../lib/finish";
import { navigate } from "../lib/router";
import { audioReady, sfx, unlockAudio } from "../lib/sounds";
import { useWakeLock } from "../lib/wakeLock";
import { speak } from "../lib/speech";
import { addArcadeEntry, renameArcadeEntry, uid, useData, type ArcadeEntry } from "../lib/store";
import { Figure } from "../ui/Figure";
import { Icon } from "../ui/icons";
import { LiveSet } from "../ui/LiveSet";
import { DuelSet, type DuelResult } from "../ui/DuelSet";
import { LogoMark } from "../ui/Logo";
import { drawSkeleton } from "../ui/overlay";
import { QrCode } from "../ui/QrCode";
import { useCamera } from "../vision/useCamera";
import { usePoseTracker } from "../vision/usePoseTracker";

/**
 * Booth mode. A big-screen loop for a convention table: an attract screen
 * with the leaderboard and a QR code, hands-free challenge selection (raise a
 * hand), a 30-second challenge where only clean reps count, and a result
 * screen that puts the visitor on the board.
 */

interface Challenge {
  id: string;
  exerciseId: string;
  title: string;
  pitch: string;
  unit: string;
}

const CHALLENGES: Challenge[] = [
  { id: "squat-sprint", exerciseId: "squat", title: "Squat Sprint", pitch: "Deep squats only. Knees out, chest up.", unit: "clean squats" },
  { id: "jack-blitz", exerciseId: "jumping-jack", title: "Jack Blitz", pitch: "Hands overhead, feet wide, every time.", unit: "clean jacks" },
  { id: "pushup-showdown", exerciseId: "pushup", title: "Push-up Showdown", pitch: "Chest low, body straight. No half reps.", unit: "clean push-ups" },
  { id: "plank-standoff", exerciseId: "plank", title: "Plank Standoff", pitch: "Hold a perfect plank. Sag and the clock stops.", unit: "seconds" },
];

const ADJ = ["Swift", "Mighty", "Iron", "Turbo", "Cosmic", "Electric", "Atomic", "Rapid", "Fearless", "Golden", "Neon", "Thunder"];
const ANIMAL = ["Falcon", "Panther", "Otter", "Tiger", "Wolf", "Gecko", "Moose", "Cobra", "Lynx", "Bison", "Hawk", "Orca"];
const funName = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${ANIMAL[Math.floor(Math.random() * ANIMAL.length)]}`;

/** Scale the booth screens up on big displays (a 1080p TV is much wider than the 1440 px they're designed at). */
function useTvScale() {
  const get = () => (typeof window === "undefined" ? 1 : Math.max(1, Math.min(1.7, Math.min(window.innerWidth / 1440, window.innerHeight / 860))));
  const [scale, setScale] = useState(get);
  useEffect(() => {
    const on = () => setScale(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return scale;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function board(entries: ArcadeEntry[], challengeId: string, today: boolean) {
  const since = today ? startOfToday() : 0;
  return entries
    .filter((e) => e.challengeId === challengeId && e.at >= since)
    .sort((a, b) => b.score - a.score || b.form - a.form || a.at - b.at);
}

export function Arcade() {
  const data = useData();
  const [phase, setPhase] = useState<"attract" | "play" | "result" | "duel" | "duelResult">("attract");
  const [duel, setDuel] = useState(false);
  const [duelResult, setDuelResult] = useState<{ names: [string, string]; scores: [number, number]; forms: [number, number] } | null>(null);
  const [sel, setSel] = useState(0);
  const [result, setResult] = useState<ArcadeEntry | null>(null);
  const challenge = CHALLENGES[sel]!;
  const seconds = data.settings.arcadeSeconds;
  // The QR code sends visitors to the public address, so their history lives in one place. Without one, a copy on "localhost" can't be opened by a visitor's phone.
  const shareUrl = data.settings.shareUrl || HOSTED_URL || window.location.href.split("#")[0]!;
  const localOnly = !data.settings.shareUrl && !HOSTED_URL && /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(window.location.hostname);

  // Esc returns to the attract screen from anywhere; arrow keys and Enter drive it from a keyboard.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Escape") setPhase("attract");
      if (phase !== "attract") return;
      if (e.key === "ArrowRight") setSel((s) => (s + 1) % CHALLENGES.length);
      if (e.key === "ArrowLeft") setSel((s) => (s + CHALLENGES.length - 1) % CHALLENGES.length);
      if (e.key === "Enter" || e.key === " ") start();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const duelOk = challenge.exerciseId !== "pushup" && challenge.exerciseId !== "plank";
  const start = () => {
    unlockAudio();
    setPhase(duel && duelOk ? "duel" : "play");
  };

  const onDuelDone = (r: DuelResult) => {
    const names: [string, string] = [funName(), funName()];
    const sums = [r.left, r.right];
    sums.forEach((s, i) =>
      addArcadeEntry({ id: uid(), name: names[i]!, challengeId: challenge.id, score: s.cleanCount, clean: s.cleanCount, attempts: s.reps.length, form: s.score, at: Date.now() }),
    );
    setDuelResult({ names, scores: [r.left.cleanCount, r.right.cleanCount], forms: [r.left.score, r.right.score] });
    window.setTimeout(() => setPhase("duelResult"), 400);
  };

  const onDone = (s: SetSummary) => {
    const isHold = challenge.exerciseId === "plank";
    const entry: ArcadeEntry = {
      id: uid(),
      name: funName(),
      challengeId: challenge.id,
      score: isHold ? Math.round(s.goodHoldMs / 1000) : s.cleanCount,
      clean: s.cleanCount,
      attempts: s.reps.length,
      form: s.score,
      at: Date.now(),
    };
    addArcadeEntry(entry);
    finishWorkout({ title: `Arcade · ${challenge.title}`, kind: "arcade", sets: [s], startedAt: s.startedAt ? Date.now() - s.durationMs : Date.now() });
    setResult(entry);
    window.setTimeout(() => setPhase("result"), 400);
  };

  if (phase === "play") {
    const ex = exercise(challenge.exerciseId);
    return (
      <LiveSet
        exercise={ex}
        target={ex.kind === "hold" ? { ms: 180_000 } : { ms: seconds * 1000 }}
        holdUntilBreak={ex.kind === "hold"}
        formGate
        arcade
        kiosk
        eyebrow={`Arcade · ${challenge.title}`}
        onDone={onDone}
        onExit={() => setPhase("attract")}
      />
    );
  }

  if (phase === "duel") {
    return <DuelSet exercise={exercise(challenge.exerciseId)} seconds={seconds} onDone={onDuelDone} onExit={() => setPhase("attract")} />;
  }

  if (phase === "duelResult" && duelResult) {
    return <DuelOutcome r={duelResult} challenge={challenge} onAgain={() => setPhase("attract")} onRematch={() => setPhase("duel")} />;
  }

  if (phase === "result" && result) {
    return <Result entry={result} challenge={challenge} entries={data.arcade} shareUrl={shareUrl} localOnly={localOnly} onAgain={() => setPhase("attract")} />;
  }

  return <Attract sel={sel} setSel={setSel} onStart={start} entries={data.arcade} shareUrl={shareUrl} localOnly={localOnly} seconds={seconds} duel={duel && duelOk} setDuel={setDuel} duelOk={duelOk} />;
}

function Attract({
  sel,
  setSel,
  onStart,
  entries,
  shareUrl,
  localOnly,
  seconds,
  duel,
  setDuel,
  duelOk,
}: {
  sel: number;
  setSel: (n: number | ((n: number) => number)) => void;
  onStart: () => void;
  entries: ArcadeEntry[];
  shareUrl: string;
  localOnly: boolean;
  seconds: number;
  duel: boolean;
  setDuel: (d: boolean) => void;
  duelOk: boolean;
}) {
  const challenge = CHALLENGES[sel]!;
  const [today, setToday] = useState(true);
  const top = board(entries, challenge.id, today).slice(0, 8);
  const [gesture, setGesture] = useState<{ left: number; right: number; seen: boolean }>({ left: 0, right: 0, seen: false });
  const scale = useTvScale();
  // The booth screen stays on between players.
  useWakeLock(true);
  // Browsers block sound until someone clicks; visitors who start by raising
  // their hands never click, so ask the person running the booth to click once.
  const [soundOk, setSoundOk] = useState(audioReady());
  useEffect(() => {
    if (soundOk) return;
    const on = () => {
      unlockAudio();
      setSoundOk(true);
    };
    window.addEventListener("pointerdown", on, { once: true });
    window.addEventListener("keydown", on, { once: true });
    return () => {
      window.removeEventListener("pointerdown", on);
      window.removeEventListener("keydown", on);
    };
  }, [soundOk]);

  return (
    <div className="app-glow fixed inset-0 overflow-y-auto text-ink" data-testid="arcade-attract">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col p-5 sm:p-8" style={{ zoom: scale }}>
        <header className="flex items-center gap-3">
          <LogoMark size={44} />
          <div>
            <div className="display text-4xl leading-none sm:text-5xl">{APP_NAME.toUpperCase()} ARCADE</div>
            <div className="text-sm font-semibold text-muted">AI form judge · only perfect reps count</div>
          </div>
          {!soundOk && (
            <span className="chip ml-auto border-warn/40 text-warn" data-testid="sound-hint">
              <Icon.volume size={14} /> Click anywhere once to turn on sound
            </span>
          )}
          <button className={`btn btn-ghost h-10 text-sm ${soundOk ? "ml-auto" : ""}`} onClick={() => navigate("/")} aria-label="Leave Arcade">
            <Icon.x size={16} /> Exit
          </button>
        </header>

        <div className="mt-5 grid flex-1 items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
          <section>
            <div className="grid grid-cols-2 gap-3">
              {CHALLENGES.map((c, i) => (
                <button key={c.id} onClick={() => setSel(i)} aria-pressed={i === sel} className={`card relative overflow-hidden p-3 text-left transition sm:p-4 ${i === sel ? "border-volt shadow-[0_0_40px_rgba(212,255,58,0.18)]" : "opacity-70 hover:opacity-100"}`} data-testid={`challenge-${c.id}`}>
                  <Figure exerciseId={c.exerciseId} className="h-20 w-full sm:h-24" speed={i === sel ? 1.2 : 0.6} />
                  <div className="display mt-1 text-2xl sm:text-3xl">{c.title}</div>
                  <div className="text-xs text-muted sm:text-sm">{c.pitch}</div>
                  {i === sel && <span className="chip absolute top-3 right-3 border-volt bg-volt text-black">Selected</span>}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex rounded-full border border-line-2 bg-raised p-1" role="radiogroup" aria-label="Players">
                {[false, true].map((d) => (
                  <button
                    key={String(d)}
                    role="radio"
                    aria-checked={duel === d}
                    disabled={d && !duelOk}
                    onClick={() => setDuel(d)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${duel === d ? "bg-volt text-black" : "text-ink-2"} disabled:opacity-40`}
                    data-testid={d ? "mode-duel" : "mode-solo"}
                  >
                    {d ? "Duel · 2 players" : "Solo"}
                  </button>
                ))}
              </div>
              <button className="btn btn-volt h-16 px-8 text-2xl" onClick={onStart} data-testid="arcade-start">
                <Icon.play /> {duel ? "Duel" : "Play"}: {challenge.title}
              </button>
              <span className="text-ink-2">{challenge.exerciseId === "plank" ? "As long as you can hold it" : `${seconds} seconds`}</span>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <GestureWatcher
                onGesture={(g) => {
                  if (g === "both") onStart();
                  else if (g === "right") setSel((s) => (s + 1) % CHALLENGES.length);
                  else setSel((s) => (s + CHALLENGES.length - 1) % CHALLENGES.length);
                }}
                onState={setGesture}
              />
              <p className="text-lg text-ink-2" data-testid="gesture-hint">
                {gesture.seen ? (
                  <>
                    <span className="font-bold text-volt">I see you!</span> Raise your <b>right hand</b> to switch, <b>both hands</b> to start.
                    {(gesture.left > 0 || gesture.right > 0) && <span className="ml-2 inline-block h-3 w-3 animate-ping rounded-full bg-volt" />}
                  </>
                ) : (
                  <>
                    <b className="text-ink">No touching needed.</b> Step in front of the camera, raise your right hand to switch challenge and both hands to start.
                  </>
                )}
              </p>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="display text-3xl">
                  <Icon.trophy className="mr-2 inline text-warn" />
                  Leaderboard
                </h2>
                <div className="flex gap-1">
                  {[true, false].map((t) => (
                    <button key={String(t)} onClick={() => setToday(t)} aria-pressed={today === t} className={`chip ${today === t ? "border-volt bg-volt text-black" : ""}`}>
                      {t ? "Today" : "All time"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1 text-sm text-muted">{challenge.title}</div>
              <Board rows={top} unit={challenge.unit} />
            </div>
            <ShareQr url={shareUrl} localOnly={localOnly} title={`Train with ${APP_NAME} at home`} text="Scan to open it on your phone. Free, no sign-up, and your video never leaves your device." />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Board({ rows, unit, highlight }: { rows: ArcadeEntry[]; unit: string; highlight?: string }) {
  if (!rows.length) return <p className="mt-6 text-muted">No scores yet. Be the first on the board!</p>;
  return (
    <ol className="mt-3 space-y-1.5" data-testid="leaderboard">
      {rows.map((r, i) => (
        <li key={r.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.id === highlight ? "animate-pop bg-volt text-black" : i === 0 ? "bg-warn/12" : "bg-raised/60"}`}>
          <span className={`display w-8 text-2xl ${r.id === highlight ? "" : i === 0 ? "text-warn" : "text-muted"}`}>{i + 1}</span>
          <span className="flex-1 truncate font-semibold">{r.name}</span>
          <span className="display text-3xl tabular">{r.score}</span>
          <span className={`w-24 text-right text-xs ${r.id === highlight ? "" : "text-muted"}`}>{unit}</span>
        </li>
      ))}
    </ol>
  );
}

function Result({ entry, challenge, entries, shareUrl, localOnly, onAgain }: { entry: ArcadeEntry; challenge: Challenge; entries: ArcadeEntry[]; shareUrl: string; localOnly: boolean; onAgain: () => void }) {
  const [name, setName] = useState(entry.name);
  const rows = board(entries, challenge.id, true);
  const rank = rows.findIndex((r) => r.id === entry.id) + 1;
  const isHold = challenge.exerciseId === "plank";
  useEffect(() => {
    if (rank === 1 && rows.length > 1) sfx.fanfare();
    speak(rank === 1 ? `New high score! ${entry.score} ${challenge.unit}.` : `${entry.score} ${challenge.unit}. You're number ${rank} today.`);
    // Back to the attract loop if nobody touches anything.
    const id = window.setTimeout(onAgain, 45_000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const window5 = rows.slice(Math.max(0, Math.min(rank - 3, rows.length - 6)), Math.max(6, rank + 3));
  const scale = useTvScale();
  return (
    <div className="app-glow fixed inset-0 overflow-y-auto" data-testid="arcade-result">
      <div className="mx-auto grid min-h-full max-w-6xl items-center gap-8 p-6 sm:p-10 lg:grid-cols-2" style={{ zoom: scale }}>
        <div className="text-center lg:text-left">
          <div className="text-sm font-bold tracking-[0.2em] text-volt uppercase">{challenge.title}</div>
          <div className="display mt-2 text-[34vmin] leading-none text-volt drop-shadow-[0_0_50px_rgba(212,255,58,0.45)] lg:text-[220px]" data-testid="arcade-score">
            {entry.score}
          </div>
          <div className="display text-4xl">{challenge.unit}</div>
          <p className="mt-4 text-xl text-ink-2">
            {rank === 1 ? "New high score today!" : `Number ${rank} of ${rows.length} today.`}
            {!isHold && entry.attempts > entry.clean && ` ${entry.attempts - entry.clean} rep${entry.attempts - entry.clean === 1 ? "" : "s"} didn't count.`}
          </p>
          <p className="mt-1 text-ink-2">Form score {entry.form}/100</p>
          <label className="mx-auto mt-6 block max-w-sm text-left lg:mx-0">
            <span className="text-sm font-semibold text-muted">Name on the board</span>
            <input
              value={name}
              maxLength={18}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => renameArcadeEntry(entry.id, name.trim() || entry.name)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-1 h-14 w-full rounded-xl border border-line-2 bg-raised px-4 text-2xl font-bold outline-none focus:border-volt"
              data-testid="arcade-name"
            />
          </label>
          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <button
              className="btn btn-volt h-14 px-8 text-lg"
              onClick={() => {
                renameArcadeEntry(entry.id, name.trim() || entry.name);
                onAgain();
              }}
              data-testid="arcade-again"
            >
              Next player
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="display text-3xl">Today's board</h2>
            <Board rows={window5} unit={challenge.unit} highlight={entry.id} />
          </div>
          <ShareQr url={shareUrl} localOnly={localOnly} title="Keep training on your phone" text="Scan for the full app: 13 exercises, guided workouts and a personal plan. Free." />
        </div>
      </div>
    </div>
  );
}

function DuelOutcome({ r, challenge, onAgain, onRematch }: { r: { names: [string, string]; scores: [number, number]; forms: [number, number] }; challenge: Challenge; onAgain: () => void; onRematch: () => void }) {
  const [a, b] = r.scores;
  const winner = a === b ? (r.forms[0] === r.forms[1] ? -1 : r.forms[0] > r.forms[1] ? 0 : 1) : a > b ? 0 : 1;
  useEffect(() => {
    sfx.fanfare();
    speak(winner === -1 ? "It's a tie!" : `Player ${winner + 1} wins!`);
    const id = window.setTimeout(onAgain, 45_000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const colors = ["#d4ff3a", "#38e1ff"];
  return (
    <div className="app-glow fixed inset-0 grid place-items-center overflow-y-auto p-6" data-testid="duel-result">
      <div className="w-full max-w-4xl text-center">
        <div className="text-sm font-bold tracking-[0.2em] text-volt uppercase">Duel · {challenge.title}</div>
        <h1 className="display mt-2 text-6xl sm:text-7xl">{winner === -1 ? "It's a tie!" : `Player ${winner + 1} wins!`}</h1>
        {a === b && winner !== -1 && <p className="mt-1 text-ink-2">Same reps, so better form breaks the tie.</p>}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className={`card p-6 ${winner === i ? "border-2" : ""}`} style={winner === i ? { borderColor: colors[i] } : undefined}>
              <div className="text-sm font-bold uppercase" style={{ color: colors[i] }}>
                Player {i + 1} {winner === i && <Icon.trophy className="inline" size={16} />}
              </div>
              <div className="display text-[18vmin] leading-none sm:text-9xl" style={{ color: colors[i] }} data-testid={`duel-score-${i + 1}`}>
                {r.scores[i]}
              </div>
              <div className="text-ink-2">{challenge.unit}</div>
              <div className="mt-2 text-sm text-muted">Form {r.forms[i]}/100 · on the board as {r.names[i]}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button className="btn btn-volt h-14 px-8 text-lg" onClick={onRematch} data-testid="duel-rematch">
            Rematch
          </button>
          <button className="btn btn-ghost h-14 px-8 text-lg" onClick={onAgain}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareQr({ url, localOnly, title, text }: { url: string; localOnly: boolean; title: string; text: string }) {
  if (localOnly) {
    return (
      <div className="card flex items-center gap-4 border-warn/40 p-4" data-testid="qr-hint">
        <Icon.qr className="shrink-0 text-warn" size={40} />
        <p className="text-sm text-ink-2">
          <b className="text-ink">QR code needs a public link.</b> This copy runs on the laptop, which phones can't reach. Put your hosted address in Settings → Arcade → QR code link.
        </p>
      </div>
    );
  }
  return (
    <div className="card flex items-center gap-4 p-4">
      <QrCode text={url} label="QR code to open Cadence on your phone" className="h-28 w-28 shrink-0 rounded-lg p-1.5" margin={1} />
      <div>
        <div className="font-bold">{title}</div>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

/**
 * Watches the camera on the attract screen for raised hands, so visitors can
 * pick and start a challenge without touching the laptop. A hand counts as
 * raised when the wrist is above the nose; it has to stay up for 0.6 s.
 */
function GestureWatcher({ onGesture, onState }: { onGesture: (g: "left" | "right" | "both") => void; onState: (s: { left: number; right: number; seen: boolean }) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef);
  const { settings } = useData();
  const since = useRef<{ left: number | null; right: number | null; both: number | null; cooldown: number }>({ left: null, right: null, both: null, cooldown: 0 });
  const lastState = useRef("");

  useEffect(() => {
    void camera.start();
    return () => camera.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFrame = useCallback(
    (f: PoseFrame) => {
      if (canvasRef.current) drawSkeleton(canvasRef.current, f, { highlight: [] });
      const lm = f.landmarks;
      const seen = lm.length >= 33 && (lm[LM.nose]?.visibility ?? 0) > 0.5;
      const up = (w: number) => seen && (lm[w]?.visibility ?? 0) > 0.5 && lm[w]!.y < lm[LM.nose]!.y;
      const L = up(LM.leftWrist);
      const R = up(LM.rightWrist);
      const s = since.current;
      const t = f.t;
      s.both = L && R ? (s.both ?? t) : null;
      s.left = L && !R ? (s.left ?? t) : null;
      s.right = R && !L ? (s.right ?? t) : null;
      if (t > s.cooldown) {
        const fire = (g: "left" | "right" | "both") => {
          s.cooldown = t + (g === "both" ? 3000 : 1200);
          s.left = s.right = s.both = null;
          sfx.tick();
          onGesture(g);
        };
        if (s.both !== null && t - s.both > 700) fire("both");
        else if (s.right !== null && t - s.right > 600) fire("right");
        else if (s.left !== null && t - s.left > 600) fire("left");
      }
      const key = `${seen}${L}${R}`;
      if (key !== lastState.current) {
        lastState.current = key;
        onState({ left: L ? 1 : 0, right: R ? 1 : 0, seen });
      }
    },
    [onGesture, onState],
  );

  usePoseTracker({ videoRef, enabled: camera.status.kind === "live", variant: settings.model, onFrame });
  const mirror = settings.mirror;
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-black sm:w-56" aria-hidden="true">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover opacity-80" style={{ transform: mirror ? "scaleX(-1)" : undefined }} muted playsInline />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" style={{ transform: mirror ? "scaleX(-1)" : undefined }} />
      {camera.status.kind !== "live" && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Camera {camera.status.kind === "starting" ? "starting…" : "off"}</div>}
    </div>
  );
}

export { CHALLENGES };
