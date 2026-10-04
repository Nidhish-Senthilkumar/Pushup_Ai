import { useRef, useState } from "react";
import { HOSTED_URL } from "../config";
import { clearSampleHistory, hasSampleHistory, loadSampleHistory } from "../lib/sampleData";
import { clearArcade, exportAll, importAll, resetAll, setProfile, setSettings, useData } from "../lib/store";
import { Icon } from "../ui/icons";
import { PageTitle } from "../ui/Layout";

function Toggle({ label, detail, on, onChange, testid }: { label: string; detail?: string; on: boolean; onChange: (v: boolean) => void; testid?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block font-semibold">{label}</span>
        {detail && <span className="text-sm text-muted">{detail}</span>}
      </span>
      <button role="switch" aria-checked={on} onClick={() => onChange(!on)} data-testid={testid} className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-volt" : "bg-line-2"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

export function Settings() {
  const { settings, profile, workouts, arcade } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const sample = hasSampleHistory();

  const download = () => {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cadence-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Settings" title="Settings" />

      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold">Profile</h2>
        <p className="mb-4 text-sm text-muted">Used for fitness-test ratings and calorie estimates. Stays on this device.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Name</span>
            <input className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={profile.name} onChange={(e) => setProfile({ name: e.target.value.slice(0, 24) })} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Age</span>
            <select className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={profile.ageBand} onChange={(e) => setProfile({ ageBand: e.target.value as typeof profile.ageBand })}>
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
            <span className="text-sm font-semibold">Push-up norms</span>
            <select className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={profile.sex} onChange={(e) => setProfile({ sex: e.target.value as typeof profile.sex })}>
              <option value="">Average of both tables</option>
              <option value="female">Female table (knee push-ups)</option>
              <option value="male">Male table (full push-ups)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Body weight (kg)</span>
            <input type="number" min={25} max={250} className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={profile.weightKg} onChange={(e) => setProfile({ weightKg: Math.max(25, Math.min(250, Number(e.target.value) || 70)) })} />
          </label>
        </div>
      </section>

      <section className="card divide-y divide-line px-5 py-2">
        <h2 className="pt-3 pb-2 text-lg font-bold">Coaching</h2>
        <Toggle label="Voice coaching" detail="Spoken cues through your device's own speech engine" on={settings.voice} onChange={(v) => setSettings({ voice: v })} testid="toggle-voice" />
        <Toggle label="Count reps out loud" on={settings.countAloud} onChange={(v) => setSettings({ countAloud: v })} />
        <Toggle label="Sounds" detail="A chirp for clean reps, a low note for faults" on={settings.sounds} onChange={(v) => setSettings({ sounds: v })} />
        <Toggle label="Mirror the camera" detail="Like a mirror when using the front camera" on={settings.mirror} onChange={(v) => setSettings({ mirror: v })} />
        <div className="flex items-center justify-between gap-4 py-3">
          <span>
            <span className="block font-semibold">Pose model</span>
            <span className="text-sm text-muted">Full is more accurate; Lite is faster on older phones</span>
          </span>
          <div className="flex gap-1">
            {(["full", "lite"] as const).map((m) => (
              <button key={m} onClick={() => setSettings({ model: m })} aria-pressed={settings.model === m} className={`chip px-3 py-1.5 text-sm capitalize ${settings.model === m ? "border-volt bg-volt text-black" : ""}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <span>
            <span className="block font-semibold">Form strictness</span>
            <span className="text-sm text-muted">How deep a rep must go to count as clean. Easy suits beginners and busy booths.</span>
          </span>
          <div className="flex gap-1" role="radiogroup" aria-label="Form strictness">
            {(["easy", "standard", "strict"] as const).map((m) => (
              <button key={m} role="radio" aria-checked={settings.strictness === m} onClick={() => setSettings({ strictness: m })} className={`chip px-3 py-1.5 text-sm capitalize ${settings.strictness === m ? "border-volt bg-volt text-black" : ""}`} data-testid={`strict-${m}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <Toggle label="Show debug info" detail="Frame rate and processor while training" on={settings.showDebug} onChange={(v) => setSettings({ showDebug: v })} />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold">Arcade (booth mode)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Challenge length</span>
            <select className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" value={settings.arcadeSeconds} onChange={(e) => setSettings({ arcadeSeconds: Number(e.target.value) })}>
              {[20, 30, 45, 60].map((s) => (
                <option key={s} value={s}>
                  {s} seconds
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">QR code link</span>
            <input className="mt-1 h-11 w-full rounded-xl border border-line-2 bg-raised px-3" placeholder={HOSTED_URL} value={settings.shareUrl} onChange={(e) => setSettings({ shareUrl: e.target.value.trim() })} />
            <span className="mt-1 block text-xs text-muted">Where the Arcade's QR code sends visitors. Leave empty to use the team's hosted app.</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn btn-ghost"
            disabled={!arcade.length}
            onClick={() => {
              const rows = [["date", "time", "challenge", "name", "score", "clean reps", "attempts", "form score"], ...[...arcade].sort((a, b) => a.challengeId.localeCompare(b.challengeId) || b.score - a.score).map((a) => {
                const d = new Date(a.at);
                return [d.toLocaleDateString(), d.toLocaleTimeString(), a.challengeId, a.name, a.score, a.clean, a.attempts, a.form];
              })];
              const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
              const el = document.createElement("a");
              el.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              el.download = `cadence-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
              el.click();
            }}
          >
            <Icon.download size={18} /> Download leaderboard (CSV)
          </button>
          <button className="btn btn-ghost" onClick={() => clearArcade()} disabled={!arcade.length}>
            Clear leaderboard ({arcade.length})
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold">Your data</h2>
        <p className="mb-4 text-sm text-muted">
          {workouts.length} workouts saved on this device. Nothing is uploaded anywhere. Back it up or move it to another device with a file.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={download}>
            <Icon.download size={18} /> Export backup
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setMsg(importAll(await f.text()) ? "Backup imported." : "That file isn't a Cadence backup.");
            }}
          />
          {sample ? (
            <button className="btn btn-ghost" onClick={clearSampleHistory}>
              Remove sample history
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={loadSampleHistory} data-testid="load-sample">
              Load sample history (for demos)
            </button>
          )}
          {confirmReset ? (
            <button
              className="btn bg-bad text-white"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                setMsg("Everything was erased.");
              }}
            >
              Tap again to erase everything
            </button>
          ) : (
            <button className="btn btn-ghost text-bad-ink" onClick={() => setConfirmReset(true)}>
              Erase all data
            </button>
          )}
        </div>
        {msg && (
          <p className="mt-3 text-sm text-volt" role="status">
            {msg}
          </p>
        )}
      </section>
    </div>
  );
}
