import { APP_NAME, ORIGIN_NAME, REPO_URL, TEAM } from "../config";
import { EXERCISES } from "../engine/exercises";
import { href } from "../lib/router";
import { Icon, type IconName } from "../ui/icons";
import { PageTitle } from "../ui/Layout";
import { CLIP_RESULTS, VALIDATION_DATE } from "../validation";

const PIPELINE: { icon: IconName; title: string; detail: string }[] = [
  { icon: "camera", title: "Camera", detail: "30 frames a second from your phone or laptop camera" },
  { icon: "brain", title: "Pose model", detail: "MediaPipe finds 33 body points per frame, in 2D and 3D, on your device's GPU" },
  { icon: "spark", title: "Smoothing", detail: "A One Euro filter removes jitter without adding lag" },
  { icon: "target", title: "Measurements", detail: "Joint angles, body line, depth and tempo, exercise by exercise" },
  { icon: "refresh", title: "Rep engine", detail: "A state machine with hysteresis counts reps and scores each one" },
  { icon: "shield", title: "Form checks", detail: "Sagging hips, caving knees, swinging, half reps, rushing" },
  { icon: "volume", title: "Coach", detail: "Live cues, spoken feedback, and a rep-by-rep report after every set" },
];

export function About() {
  const total = CLIP_RESULTS.reduce((s, r) => s + r.truth, 0);
  const err = CLIP_RESULTS.reduce((s, r) => s + Math.abs(r.counted - r.truth), 0);
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="How it works" title={`How ${APP_NAME} sees you`}>
        Everything below happens inside your browser, about 30 times a second. No video is uploaded, there's no account, and it keeps working without internet.
      </PageTitle>

      <section aria-labelledby="pipeline">
        <h2 id="pipeline" className="sr-only">
          The pipeline
        </h2>
        <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          {PIPELINE.map((p, i) => {
            const I = Icon[p.icon];
            return (
              <li key={p.title} className="card relative p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-volt text-black">
                    <I size={18} />
                  </span>
                  <span className="text-xs font-bold text-muted">STEP {i + 1}</span>
                </div>
                <div className="mt-3 font-bold">{p.title}</div>
                <p className="mt-1 text-sm text-muted">{p.detail}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Icon.lock className="text-volt" /> Private by design
          </h2>
          <ul className="mt-3 space-y-2 text-ink-2">
            <li>The pose model runs in this tab. Frames go in, 33 points come out, and the frame is gone.</li>
            <li>Your history, records and the Arcade leaderboard are stored only on this device.</li>
            <li>No sign-up, no ads, no tracking. Export or erase your data any time in Settings.</li>
            <li>The model and app are cached after the first visit, so it works offline at a gym, a park or a convention hall.</li>
            <li>Even the AI library's own background reporting (anonymous speed statistics MediaPipe sends Google) is blocked. An automated test checks that a whole workout makes no request to any other server.</li>
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Icon.target className="text-volt" /> Does it count right?
          </h2>
          {CLIP_RESULTS.length ? (
            <>
              <p className="mt-2 text-ink-2">
                Tested on {CLIP_RESULTS.length} real, openly licensed exercise videos{VALIDATION_DATE ? ` (${VALIDATION_DATE})` : ""}: {total} reps by hand count, off by {err} in total. The first {CLIP_RESULTS.filter((r) => !r.heldOut).length} clips were used while building the engine; the last {CLIP_RESULTS.filter((r) => r.heldOut).length} were held out (counted first, engine not changed after). The miss is a barbell press filmed from behind, where the head hides the hands at the bottom. Details in VALIDATION.md.
              </p>
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="pb-1 font-medium">Exercise</th>
                    <th className="pb-1 font-medium">View</th>
                    <th className="pb-1 text-right font-medium">Hand count</th>
                    <th className="pb-1 text-right font-medium">{APP_NAME}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular">
                  {CLIP_RESULTS.map((r) => (
                    <tr key={r.clip} className={r.heldOut ? "bg-raised/40" : undefined}>
                      <td className="py-1.5">{r.exercise}</td>
                      <td className="py-1.5 text-muted">{r.view}</td>
                      <td className="py-1.5 text-right">{r.truth}</td>
                      <td className={`py-1.5 text-right font-semibold ${r.counted === r.truth ? "text-good-ink" : "text-warn"}`}>{r.counted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="mt-2 text-ink-2">Validation results are being collected.</p>
          )}
          <p className="mt-3 text-sm text-muted">Every exercise is also checked by automated tests: a synthetic 3D body performs sets with known reps and known mistakes, and the engine must find exactly those.</p>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="text-xl font-bold">
          From {ORIGIN_NAME} to {APP_NAME}
        </h2>
        <div className="mt-3 grid gap-6 text-ink-2 md:grid-cols-2">
          <p>
            {ORIGIN_NAME} started as a push-up form checker: MediaPipe on a laptop, four joint angles per frame, and an LSTM neural network trained to tell good push-ups from sagging hips, piked hips and flared elbows. Feedback came from a local language model, after the set.
          </p>
          <p>
            {APP_NAME} keeps those ideas (the same four angles, the same fault classes) and moves everything into the browser so feedback arrives during the rep, not after it. It measures each fault directly, which works for any person and any exercise without retraining, and the Data Lab collects new labelled data in the original format so the neural network can keep improving.
          </p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-bold">What to know</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
          <li>Camera placement matters. Floor exercises need a side view; jumping jacks and presses need you facing the camera. The setup screen says what it needs.</li>
          <li>Checks marked Beta (like elbow flare, which needs depth the camera can't see directly) are shown but don't change your score.</li>
          <li>Calorie numbers are estimates from standard MET values, not measurements.</li>
          <li>{APP_NAME} is a fitness guide, not medical advice. Stop if anything hurts.</li>
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-bold">Credits</h2>
        <p className="mt-2 text-ink-2">
          Built by {TEAM.join(", ")}. Source:{" "}
          <a className="text-cyan underline" href={REPO_URL} target="_blank" rel="noreferrer">
            {REPO_URL.replace("https://", "")}
          </a>
          .
        </p>
        <p className="mt-2 text-sm text-muted">
          Pose estimation: Google MediaPipe Pose Landmarker (Apache 2.0). UI: React (MIT), Tailwind CSS (MIT). Fonts: Inter and Barlow Condensed (SIL Open Font License). Push-up norms: CSEP's Canadian Physical Activity, Fitness & Lifestyle Approach. The 7-Minute Classic is adapted from Klika and Jordan (2013). {EXERCISES.length} exercises, all free.
        </p>
        <a href={href("/lab")} className="btn btn-ghost mt-4">
          <Icon.flask size={18} /> Open the Data Lab
        </a>
      </section>
    </div>
  );
}
