import { useRef, useState } from "react";
import { teamFeatures } from "../engine/body";
import { EXERCISES, exercise } from "../engine/exercises";
import { angle } from "../engine/geometry";
import type { PoseFrame } from "../engine/types";
import { addLabSample, clearLab, useData } from "../lib/store";
import { Icon } from "../ui/icons";
import { PageTitle } from "../ui/Layout";
import { LiveSet } from "../ui/LiveSet";

/** The team's original classes, as in data/pushupcamera.py. */
const PUSHUP_LABELS = [
  { id: 0, name: "good", title: "Good push-up" },
  { id: 1, name: "elbowswide", title: "Elbows wide" },
  { id: 2, name: "hipshigh", title: "Hips too high" },
  { id: 3, name: "sagging", title: "Sagging" },
];
const GENERIC_LABELS = [
  { id: 0, name: "good", title: "Good form" },
  { id: 1, name: "bad", title: "Bad form" },
];

/** Right elbow angle in normalised coordinates, the filter data/pushupcamera.py records with. */
function rightElbow(f: PoseFrame): number {
  const P = (i: number) => ({ x: f.landmarks[i]!.x / f.width, y: f.landmarks[i]!.y / f.height });
  return angle(P(16), P(14), P(12));
}

function toCsv(rows: [number, number, number, number][], label: number) {
  return rows.map((r) => [...r.map((v) => (Number.isFinite(v) ? v : 0)), label].join(",")).join("\n");
}

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = name;
  a.click();
}

export function Lab() {
  const data = useData();
  const [exId, setExId] = useState("pushup");
  const [label, setLabel] = useState(0);
  const [recording, setRecording] = useState(false);
  const rows = useRef<[number, number, number, number][]>([]);
  const labels = exId === "pushup" ? PUSHUP_LABELS : GENERIC_LABELS;
  const labelInfo = labels.find((l) => l.id === label) ?? labels[0]!;

  if (recording) {
    return (
      <LiveSet
        exercise={exercise(exId)}
        eyebrow={`Data Lab · recording "${labelInfo.title}"`}
        onFrame={(f, _state, phase) => {
          if (phase !== "active" || f.landmarks.length < 33) return;
          // Same rule as the team's recorder: push-up frames only while the elbow is bent.
          if (exId === "pushup" && !(rightElbow(f) < 140)) return;
          const feats = teamFeatures(f);
          if (feats) rows.current.push(feats);
        }}
        onDone={() => {
          if (rows.current.length) addLabSample({ exerciseId: exId, label: labelInfo.id, labelName: labelInfo.name, at: Date.now(), rows: rows.current });
          rows.current = [];
          setRecording(false);
        }}
        onExit={() => {
          rows.current = [];
          setRecording(false);
        }}
      />
    );
  }

  const byLabel = new Map<string, { label: number; rows: [number, number, number, number][] }>();
  for (const s of data.lab) {
    const key = `${s.exerciseId}-${s.labelName}`;
    const cur = byLabel.get(key) ?? { label: s.label, rows: [] };
    cur.rows.push(...s.rows);
    byLabel.set(key, cur);
  }

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Data Lab" title="Teach the model">
        Record labelled reps from many people (with their permission) and export them in exactly the format of the original PushBot training data, <code className="text-ink">data/TRAINING_SET/*.csv</code>, so <code className="text-ink">ML/LSTM.py</code> can retrain on them unchanged. Only joint angles are saved: no video, no images.
      </PageTitle>

      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Exercise</span>
            <select
              className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3"
              value={exId}
              onChange={(e) => {
                setExId(e.target.value);
                setLabel(0);
              }}
            >
              {EXERCISES.filter((e) => e.kind === "reps").map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Label for this recording</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {labels.map((l) => (
                <button key={l.id} onClick={() => setLabel(l.id)} aria-pressed={label === l.id} className={`chip px-3 py-1.5 text-sm ${label === l.id ? "border-volt bg-volt text-black" : ""}`}>
                  {l.id} · {l.title}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="mt-4 text-sm text-muted">
          Do the movement the label describes (for "Elbows wide", flare your elbows on purpose) for 10 to 20 reps, then tap Finish. Each frame becomes one CSV row: hip angle, shoulder angle, elbow angle, knee angle, label. The original data had no elbows-wide recordings at all (that file is empty), so it's the most useful one to record.
        </p>
        <button className="btn btn-volt mt-4" onClick={() => setRecording(true)} data-testid="lab-record">
          <Icon.camera size={18} /> Record
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Recorded on this device</h2>
          {data.lab.length > 0 && (
            <button className="btn btn-ghost h-9 text-sm" onClick={clearLab}>
              Clear
            </button>
          )}
        </div>
        {byLabel.size === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing yet.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line">
              {[...byLabel.entries()].map(([key, v]) => (
                <li key={key} className="flex items-center justify-between py-2.5">
                  <span>
                    <span className="font-semibold">{key.replace("-", " · ")}</span>
                    <span className="ml-2 text-sm text-muted">
                      {v.rows.length} frames · label {v.label}
                    </span>
                  </span>
                  <button className="btn btn-ghost h-9 text-sm" onClick={() => download(`${key.split("-").slice(1).join("-")}.csv`, toCsv(v.rows, v.label))}>
                    <Icon.download size={16} /> CSV
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn btn-volt mt-4" onClick={() => download("cadence_lab_all.csv", [...byLabel.values()].map((v) => toCsv(v.rows, v.label)).join("\n"))}>
              <Icon.download size={18} /> Download everything (one CSV)
            </button>
            <p className="mt-3 text-xs text-muted">To retrain: put the CSVs in data/TRAINING_SET/ and run <code>python ML/LSTM.py</code> from the repository root.</p>
          </>
        )}
      </div>
    </div>
  );
}
