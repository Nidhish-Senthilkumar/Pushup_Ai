# Cadence: plan

Working name for the new version of PushBot. The name lives in one constant (`src/config.ts`) so the team can rename it in one line.

## The idea

PushBot today records 15 seconds of push-ups, uploads the video to a laptop running Flask and Ollama, and replies with one sentence. Cadence turns that into a real-time AI fitness coach that runs entirely in the browser:

- It watches you through the camera, counts every rep live and coaches your form while you move (on-screen cues, joint highlights, optional spoken cues).
- It covers a library of bodyweight exercises, not just push-ups.
- It runs guided workouts hands-free, so you never touch the screen mid-set.
- A fitness assessment sets your level and builds a 4-week plan from it.
- It tracks progress (streaks, personal records, form trend, achievements).
- A booth "Arcade" mode is built for the convention: 30-second form-checked challenges, a live leaderboard and a QR code so visitors can keep using it on their own phone.

Everything runs on the device. Video never leaves the phone or laptop, it works offline once loaded, and it costs nothing to run or host.

## Why rebuild instead of patching

The current pipeline is fragile for a live demo (phone and laptop on the same Wi-Fi, hardcoded LAN IP, Flask + TensorFlow + Ollama all running). Feedback only comes after the set. The training data cannot support the 4-class model (see FINDINGS.md). A browser app with MediaPipe on the GPU fixes all of that: real-time, offline, one URL, and it runs on the booth laptop and every visitor's phone.

Nothing existing is deleted. Cadence lives in `spotter/`. The Python ML work carries forward: the angle features match the team's training script exactly. The in-app Data Lab exports CSVs in the same format as `data/TRAINING_SET`, so the team can collect labeled reps from many people at the convention and retrain.

## Constraints

- Free only: no paid APIs, no API keys. The coach text is generated on-device from the measured rep data.
- No commits, pushes or deploys by Claude. HANDOFF.md lists the exact commands.
- Verified in a real browser with a fake camera playing real exercise footage, not just a passing build.

## Stack

Vite + React + TypeScript. Pose tracking uses `@mediapipe/tasks-vision` (PoseLandmarker), self-hosted so it works offline. Storage is local. It's a PWA with a service worker. Tests use Vitest (engine, synthetic poses, replays of real-footage traces) and Playwright (Chrome fake camera fed real clips). The camera and pose plumbing is adapted from Recoil (~/terminalais/recoil), which already passed real-footage validation.

## Phases

1. Scaffold and pose pipeline: camera, landmarker, smoothing, framing checks, skeleton overlay.
2. Exercise engine: generic rep and hold state machines, declarative exercise definitions, per-rep scoring, coach cue queue. Starting with push-up and squat.
3. Real-footage validation harness: CC-licensed clips, landmark traces, offline replay, hand-counted ground truth.
4. Exercise library: push-up, squat, lunge, plank, jumping jack, bicep curl, shoulder press, glute bridge, high knees, wall sit, lateral raise (each validated or marked beta).
5. Live workout screen and set summary (rep bars, signal chart with target band, best vs worst rep skeleton replay, coach summary, share card).
6. Guided workouts and programs: hands-free auto-advance, rest timer, voice and beep cues.
7. Progress: history, streaks, personal records, achievements, XP, charts.
8. Fitness assessment: push-up, squat and plank tests, levels, generated 4-week plan.
9. Arcade booth mode: attract screen, challenge, form-gated reps, leaderboard, QR code.
10. How it works, Data Lab export, settings, privacy.
11. Polish: design pass, phone and desktop layouts, accessibility, offline, full e2e suite.
12. Docs: README, DEMO_SCRIPT.md (what to say at the convention), BOOTH_SETUP.md, VALIDATION.md, FINDINGS.md, HANDOFF.md.
