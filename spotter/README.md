# Cadence

**A free AI fitness coach that runs entirely in your browser.** Point any camera at yourself and Cadence counts every rep, catches bad form the moment it happens, tells you how to fix it, and keeps track of your progress. Your video never leaves your device, there's no account, and it works offline.

**Try it: https://getcadence.cc** (open it in Chrome or Safari and allow the camera). A mirror runs on GitHub Pages at https://nidhish-senthilkumar.github.io/Pushup_Ai/.

Cadence grew out of PushBot, the push-up form checker in the rest of this repository (see [FINDINGS.md](FINDINGS.md) for what changed and why).

## What it does

- **Live coaching for 13 exercises:** push-up, squat, jumping jack, plank, lunge, burpee, bicep curl, shoulder press, lateral raise, glute bridge, sit-up, high knees and wall sit. Skeleton overlay, a depth gauge, a big rep counter, instant "Perfect / Good / Shallow" feedback on every rep, faulty joints lit red, spoken cues.
- **Form checks measured, not guessed:** sagging or piked hips, knees caving, chest falling forward, swinging, drifting elbows, uneven arms, half reps and rushing. Every check says what to do about it.
- **Hands-free:** get into the start position and the set starts itself. Guided workouts rest you, preview what's next and start the next set when you're in position.
- **A coach report after every set:** rep-by-rep scores, a depth chart, your best rep next to your weakest one as skeletons, your fatigue point, tempo, comparison with last time and one thing to focus on next. Written from your own numbers, instantly, with no AI service and no cost.
- **Your own workouts:** a builder for any mix of exercises, reps or timed sets, and rests, run hands-free like the built-in ones.
- **Fitness test and a 4-week plan:** max push-ups (rated against published norms), 60 seconds of squats and a max plank, then a plan that starts at half your max and grows 10% a week.
- **Progress:** coach insights (what's improving, your most common fault and its fix), a weekly goal, streaks, levels and XP, personal records, 15 achievements, a 12-week activity calendar, form-score trends overall and per exercise, full history and shareable result cards.
- **Arcade booth mode:** 30-second challenges where only perfect-form reps count, a live leaderboard, hands-free challenge selection by raising your hands, a **Duel mode** where two people side by side are counted separately, and a QR code so visitors can take Cadence home on their phone.
- **X-ray view:** one tap on the live screen shows the numbers the AI is working from (joint angles, body line, depth, frame rate). Great for explaining it to judges.
- **Analyze a video:** upload a recorded set for the same breakdown (the original PushBot flow, now on-device).
- **A built-in presentation** at `#/pitch`: nine slides for the convention, with a button that jumps straight into the live demo.
- **Data Lab:** record labelled reps from many people and export them in the exact format of `data/TRAINING_SET/*.csv`, so the team's LSTM can be retrained.

## How it works

Camera → MediaPipe Pose Landmarker (33 body points, 2D and 3D, on the device's GPU) → One Euro smoothing → joint angles and body line per exercise → a rep state machine with hysteresis → form checks → coach. All of it is TypeScript in `src/engine/`, which has no browser dependencies and is tested under Node.

Accuracy and testing: [VALIDATION.md](VALIDATION.md). In short, it matched a hand count on 15 of 16 real exercise clips (33 reps, off by 1), and 90 automated engine tests and 25 browser tests pass.

## Run it

Needs Node 20 or newer.

```
cd spotter
npm install
npm run dev            # http://localhost:5173 on this computer
```

On a phone (the camera needs https, so this uses a self-signed certificate; accept the warning):

```
npm run dev:phone      # then open https://<this computer's IP>:5173 on the phone, same Wi-Fi
```

For the booth (production build, served locally, opens the Arcade):

```
npm run booth
```

See [BOOTH_SETUP.md](BOOTH_SETUP.md) for the convention checklist and [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for what to say.

## Test it

```
npm test               # engine unit tests (a second)
./scripts/fetch-test-videos.sh   # once: downloads openly licensed test footage (needs ffmpeg)
npm run build && npm run e2e     # browser tests with real footage as the camera
RECORD_DEMO=1 npx playwright test recordDemo --project=chrome   # records a demo video into test-results/
```

## Project layout

```
src/engine/        pose maths, exercises, rep counting, scoring, coach (no DOM)
src/engine/exercises/  the 12 exercise definitions
src/vision/        camera, MediaPipe loader, video analysis
src/ui/            live set screen, charts, skeleton overlay, animated figures
src/pages/         one file per screen
src/lib/           storage, plans, progress, fitness test, sounds, speech
public/            pose model and runtime (self-hosted), icons, service worker
e2e/               Playwright tests
scripts/           asset sync, test footage, validation data
```

## Privacy

The pose model runs inside the browser tab. Frames go in, 33 points come out, and nothing is uploaded. MediaPipe's runtime normally sends Google anonymous performance statistics every minute; Cadence answers that request locally instead, and `e2e/privacy.spec.ts` checks that a whole live set makes no request to any other server. History, records and the leaderboard are stored in the browser's local storage on that device only, and can be exported or erased in Settings.

## Credits

Built by Nidhish Senthilkumar, Sagar Raut and Surzom. Pose estimation: Google MediaPipe (Apache 2.0). Fonts: Inter and Barlow Condensed (SIL OFL). Push-up norms: CSEP's Canadian Physical Activity, Fitness & Lifestyle Approach. Test footage: see `e2e/VIDEO_CREDITS.md`.
