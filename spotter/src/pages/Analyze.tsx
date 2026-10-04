import { useRef, useState } from "react";
import { coachReport } from "../engine/coach";
import { EXERCISES, exercise } from "../engine/exercises";
import type { SetSummary } from "../engine/session";
import { scoreFrames } from "../engine/replay";
import type { PoseFrame } from "../engine/types";
import { finishWorkout } from "../lib/finish";
import { navigate } from "../lib/router";
import { useData } from "../lib/store";
import { analyzeVideo } from "../vision/analyzeVideo";
import { DepthTrace, RepBars } from "../ui/charts";
import { Icon } from "../ui/icons";
import { PageTitle } from "../ui/Layout";
import { ScoreRing } from "./Summary";

declare global {
  interface Window {
    __spotterTrace?: PoseFrame[];
  }
}


/**
 * Analyze a recorded video: the original PushBot flow (record, then get
 * feedback), now running fully on the device with the same engine as live
 * coaching.
 */
export function Analyze() {
  const { settings } = useData();
  const [exId, setExId] = useState("pushup");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ summary: SetSummary; frames: number } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const ex = exercise(exId);

  const run = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    setProgress(0);
    abort.current = new AbortController();
    try {
      // ?fps= is for testing: analyse at a lower rate to imitate a slow camera.
      const fps = Number(new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("fps")) || 30;
      const { frames } = await analyzeVideo(file, { variant: settings.model, fps, onProgress: setProgress, signal: abort.current.signal });
      window.__spotterTrace = frames;
      setResult({ summary: scoreFrames(exId, frames), frames: frames.length });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  };

  const report = result ? coachReport(ex, result.summary) : null;

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Analyze" title="Analyze a video">
        Recorded a set on your phone? Spotter can go through it frame by frame and give you the same rep-by-rep breakdown. The video is processed on this device and never uploaded.
      </PageTitle>
      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Exercise in the video</span>
            <select className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={exId} onChange={(e) => setExId(e.target.value)} data-testid="analyze-exercise">
              {EXERCISES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Video file</span>
            <input type="file" accept="video/*" className="mt-1 block w-full text-sm file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-raised file:px-4 file:font-semibold file:text-ink" onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="analyze-file" />
          </label>
        </div>
        <p className="mt-3 text-sm text-muted">{ex.setup.placement}</p>
        <div className="mt-4 flex gap-3">
          <button className="btn btn-volt" onClick={() => void run()} disabled={!file || progress !== null} data-testid="analyze-run">
            <Icon.brain size={18} /> Analyze
          </button>
          {progress !== null && (
            <button className="btn btn-ghost" onClick={() => abort.current?.abort()}>
              Cancel
            </button>
          )}
        </div>
        {progress !== null && (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-raised" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Analysis progress">
              <div className="h-2 rounded-full bg-cyan transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-1 text-sm text-muted">Finding your body in every frame… {Math.round(progress * 100)}%</p>
          </div>
        )}
        {error && (
          <p className="mt-3 text-bad-ink" role="alert">
            {error}
          </p>
        )}
      </div>

      {result && report && (
        <div className="card p-5" data-testid="analyze-result">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h2 className="display text-4xl" data-testid="analyze-count">
                {ex.kind === "hold" ? `${Math.round(result.summary.goodHoldMs / 1000)} s` : `${result.summary.repCount} reps`}
              </h2>
              <p className="text-ink-2">
                {ex.kind === "hold" ? `${Math.round(result.summary.holdMs / 1000)} s in position` : `${result.summary.cleanCount} clean`} · {result.frames} frames analyzed
              </p>
            </div>
            <ScoreRing score={result.summary.score} />
          </div>
          <p className="mt-4 text-lg font-semibold">{report.headline}</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
            {report.points.map((p, i) => (
              <li key={i}>• {p.text}</li>
            ))}
          </ul>
          {result.summary.reps.length > 0 && (
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <RepBars reps={result.summary.reps} />
              {ex.kind === "reps" && <DepthTrace trace={result.summary.trace} depthAt={ex.depthAt} reps={result.summary.reps} />}
            </div>
          )}
          <button
            className="btn btn-ghost mt-5"
            onClick={() => {
              const id = finishWorkout({ title: `${ex.name} (from video)`, kind: "single", sets: [result.summary], startedAt: Date.now() });
              navigate(`/summary/${id}`);
            }}
          >
            Save to my history
          </button>
        </div>
      )}
    </div>
  );
}
