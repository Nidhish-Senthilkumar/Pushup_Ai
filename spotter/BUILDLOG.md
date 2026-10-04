# Build log

Autonomous build, 2026-10-03 evening. Newest entries at the bottom.

## Done

- Scaffold: Vite + React + TS + Tailwind 4. MediaPipe runtime and pose models self-hosted (copied from Recoil, content-hashed). PWA manifest, icons, service worker.
- Engine (`src/engine`): One Euro smoothing, framing checks, generic rep and hold state machines, per-rep scoring, cue scheduling, coach report, person selection by activity, 12 exercise definitions.
- Synthetic 3D skeleton (`synthetic.ts`) that performs all 12 (later 13) exercises with adjustable faults. Used by unit tests and by the animated figures in the UI.
- 66 unit tests passing: clean reps, shallow reps, every fault on the right reps, alternating sides, holds, noise, 12 fps, rushed reps, leaving the frame, bystanders, starting mid-rep.
- Real footage: 13 openly licensed clips hand-counted from frame strips. All 13 match (25 reps, 0 off). See VALIDATION.md.
- UI: Home, Train library, Exercise detail, live set, guided workout runner with rests, Summary with coach report and charts, Workouts, Fitness test (CPAFLA push-up norms) with 4-week plan, Progress (heatmap, day bars, trend, PRs, achievements, history), Arcade booth mode (raise-hands gestures, form-gated challenges, leaderboard, QR), Analyze a video, Data Lab (team CSV format), How it works, Settings, onboarding, sample history.

## Engine fixes found by real footage

1. Starting mid-rep counted a phantom rep: a rep now has to begin from the start position ("armed").
2. Analysis started on the first frame and counted wall push-ups: analysis now starts like the live hands-free start (framing OK for 0.3 s), and floor exercises ignore frames with the torso upright.
3. Jumping jacks: waving one arm came within 0.04 of a rep. Now both arms must rise; foot spread recalibrated.
4. Bystander standing nearer the camera was followed instead of the person curling: the session now follows whoever is doing the exercise (selector.ts), and keeps a rep that was already under way when it switches.
5. "Too far" fired at the bottom of front-view squats (thighs foreshortened) and paused counting: distance is now a setup-only check.

## Later the same night

- 16 browser tests pass (Chrome + WebKit): live squats and push-ups through the fake camera, Arcade, Duel, guided workout with rests, Data Lab CSV, every page, offline after one visit, accessibility (axe), WebKit pose model.
- Held-out check: 2 clips counted before running: 1 of 2 correct (rear-view barbell press hides the hands). Recorded as a known miss, no engine change.
- Offline bug fixed: files loaded before the service worker took control weren't cached, and cached JS didn't match because of `Vary: Origin`. The page now hands the worker its loaded files plus the pose model, and matching ignores Vary.
- Added: X-ray measurement panel, best-vs-weakest rep skeletons on the summary, Arcade Duel mode (two players, split screen), install-app button, QR-code hint when running on localhost.
- FINDINGS.md: one claim removed after checking (MobileApp/app.py does call app.run on line 196) and one corrected after measuring (the original data's split doesn't inflate accuracy; the real issue is one person, one camera).
- Docs: README, DEMO_SCRIPT, BOOTH_SETUP, VALIDATION, FINDINGS, HANDOFF, e2e/VIDEO_CREDITS.

## Third round

- MediaPipe's runtime posts usage statistics to Google every 60 s (found with a network capture). Blocked with a fetch guard in `src/vision/poseLandmarker.ts`; `e2e/privacy.spec.ts` checks a whole live set plus a minute makes no outside request. Recoil (another project) has the same unblocked request.
- Head-on push-ups now count (3D elbow angle, posture from the 3D torso angle); body-line checks only run from the side, and the setup card says so.
- Stress tests (dark, 12 fps, far) on three clips: 8 of 9 exact. The "come closer" threshold went from 20% to 14% of the frame on that evidence.
- Added: form strictness (Easy/Standard/Strict), custom workout builder, leaderboard CSV export, coach insights and a weekly goal, per-exercise trend, built-in presentation at #/pitch, TV scaling for the Arcade, error screen, attract-screen wake lock and sound unlock, hands-up gesture to finish a set, spoken "Halfway / Last one", screen-reader rep announcements.
- Tests: 90 engine (2 recorded known misses), 25 browser. Burpee added as the 13th exercise (6/6 on its first real-footage run).

## Not verified / open

- Plank and wall sit have no usable real footage (the Navy plank video is a montage); validated by synthetic tests only.
- Glute bridge, lateral raise and high knees have no real footage either; synthetic only.
- Elbow flare is a beta check (from the 3D estimate) and doesn't change scores.
- The first 13 validation clips were used while fixing the engine; 3 were held out (2 of 3 correct, including 6/6 burpees).
- Real devices: everything ran in desktop Chrome and WebKit with recorded footage. Nobody has yet tried it with a live person on a real phone; do that before the convention.

## Hosting (2026-10-04)

- Pages was switched on in branch mode, which serves the old repository and fails on an empty folder committed as a broken submodule in June. HANDOFF.md now has the setting to change and the exact commands, including removing that entry.
- The Arcade's QR code defaults to the hosted address (`HOSTED_URL`) when the app runs on the laptop, so the booth needs no setup for it.
- Checked the exact commit contents in a clean copy with Node 22 (install, 65 tests, build), then served the build at `/Pushup_Ai/` and ran a live squat set, offline reload, privacy and QR checks in Chrome. Arcade, Duel, page and accessibility browser tests still pass.

## Renamed to Cadence, moved to getcadence.cc (2026-10-04)

- The team retired the Cadence task app and gave its domain to this one, so the app is now called Cadence (folder and storage keys unchanged, so saved history survives).
- Cloudflare: `wrangler.jsonc` serves the build at getcadence.cc; `deploy/redirects/` sends app.getcadence.cc and www there and retires the old task app's service worker for people who installed it.
- The Arcade's QR code now always points at https://getcadence.cc, including from the GitHub Pages mirror. Removed a repeated "Your AI spotter." on the welcome screen.
- Checked: typecheck, 90 engine tests, both configs through `wrangler deploy --dry-run`, the site in `wrangler dev` (live squat set, offline, privacy, QR), and the old Cadence web build retired and redirected (5 of 5).
