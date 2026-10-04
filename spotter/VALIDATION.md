# Validation

How we know Cadence counts and coaches correctly, what was tested, and where it's weak. Short version: it matched a hand count on 15 of 16 real clips and on 8 of 9 darkened, slowed-down or shrunk versions, every exercise passes synthetic tests with known reps and known faults, and the full app runs end to end with real footage as the camera.

## 1. Synthetic sets (every exercise, every fault)

`src/engine/synthetic.ts` builds a 3D skeleton that can perform all 13 exercises, projected onto a camera image like MediaPipe's output, with adjustable faults (sagging or piked hips, knees caving, chest falling forward, elbows drifting, swinging, uneven arms, half reps, rushing, knee push-ups, flared elbows). `src/engine/engine.test.ts` generates sets with a known number of reps and known faults and checks that the engine finds exactly those:

- every rep exercise counts clean full-depth reps from the views it supports;
- the start position is recognised for all 13;
- half reps count but aren't clean, tiny movements aren't reps, and Arcade mode only counts clean reps;
- each fault is flagged on exactly the reps that have it (for example `[false, true, false, true]` when only reps 2 and 4 cave);
- alternating curls count each arm, two-arm curls count once, fast high knees count every knee;
- holds: a sagging plank loses good-form time in proportion to the sag;
- robustness: 4 px of landmark noise, a 12 fps camera, leaving the frame, a bigger bystander standing still, starting a set at the bottom of a rep.

Run with `npm test` (90 tests including the real-footage replays, a few seconds).

## 2. Real footage

**Method.** 19 clips cut from openly licensed videos on Wikimedia Commons (16 scored below, 3 excluded as described at the end) (credits in `e2e/VIDEO_CREDITS.md`). The true count for each was made by eye from frame strips at 3 to 6 frames a second, never from the model's output. Counting rule: a rep counts when the person goes from the start position to depth and back to the start position; partial reps cut off by the start or end of a clip don't count. Each clip was run through the real pose model in real Chrome (`e2e/traceClip.spec.ts`, the same code as "Analyze a video"), and the recorded landmarks are replayed through the engine (`src/engine/realClips.eval.test.ts`).

**Results.**

| Clip | Exercise | View | Hand count | Cadence |
|---|---|---|---|---|
| pushup-side | Push-up (slow, silhouetted) | Side | 6 | 6 |
| pushup-angled | Knee push-up (after wall push-ups in close-up) | Angled | 3 | 3 |
| pushup-army-a | Lying still, 2 bystanders | Side | 0 | 0 |
| pushup-army-b | Holding a plank, 2 bystanders | Side | 0 | 0 |
| squat-front-a | Half squat | Front | 2 | 2 |
| squat-front-b | Half squat, starts at the bottom | Front | 1 | 1 |
| squat-rear | Barbell squat | Rear 3/4 | 2 | 2 |
| jj-cgi | Jumping jack, then waving (animated figure) | Front | 3 | 3 |
| lunge-side-a | Lunge, head leaves frame | Side | 1 | 1 |
| lunge-side-b | Lunge | Side | 1 | 1 |
| curl-two-people | Curl, bigger bystander beside her | Front | 2 | 2 |
| press-seated | Seated press, starts overhead | Front | 2 | 2 |
| situp-side | Sit-up, handheld camera | Side | 2 | 2 |
| **press-demo-rear** (held out) | Barbell press | Rear | 1 | **0** |
| **pushpress-front** (held out) | Kettlebell press | Front | 1 | 1 |
| **burpee-side** (held out) | Burpee (squat-thrust style) | Side | 6 | 6 |

33 reps by hand, Cadence off by 1 in total. No false form faults on any scored check. The beta elbow-flare check fired on the angled knee push-ups, where flaring is plausible but unconfirmed.

**Be clear about what this is.** The first 13 clips were used *while building the engine*: each mismatch led to a fix (listed below), so they are not an independent test. The last 3 were **held out**: counted by hand and written to `scripts/validation/truth.json` before the engine saw them, with no engine change afterwards. On those the score is 2 of 3 clips (7 of 8 reps). The burpee clip was counted before the burpee detector was even written, and it scored 6 of 6 on its first run. The miss is a barbell press filmed from behind: at the bottom, the head and the bar hide both hands, so the start position is never seen. That's a real limitation for presses filmed from behind; the app's setup screen asks for a front view for presses.

One hand count was corrected: `squat-front-b` was first counted 0, the engine said 1, and re-checking at full resolution showed the person standing back up in the last half second, so the truth is 1. It's noted in `truth.json`.

**Fixes the real footage forced** (each is a general rule, not a per-clip tweak):

1. Starting a set mid-rep counted a phantom rep → a rep must begin from the start position.
2. Wall push-ups in a close-up counted as push-ups → floor exercises ignore frames where the torso is upright (from the 3D estimate), and video analysis starts the way the live hands-free start does.
3. Waving one arm came within 0.04 of a jumping jack → both arms must rise; foot spread recalibrated against shin length.
4. A bigger bystander was followed instead of the person curling, and nothing was counted → the session tracks everyone in view and follows whoever is actually doing the exercise; a rep already under way when it switches still counts.
5. Someone in the start position just before the set began couldn't start a rep on the first frame → being in the start position during setup counts.
6. "Too far" fired at the bottom of front-view squats (the thighs point at the camera and look short) → distance is only checked during setup.

**Excluded clips, decided before running them:** `situp-far` (the camera pans and the person is too small to count by eye), `pushup-army-c` (a hand-release push-up that starts lying on the floor, a different counting rule), `plank-navy` (a montage of cuts, no continuous side-view plank), a Spanish squat animation (the only squat is in a close-up with the body cut off), and a two-person push-up race (no single correct count).

## 2b. Stress tests: a dark hall, a slow camera, a far camera

Convention halls are dim, booth laptops can be slow, and visitors stand wherever they like. Three clips with known counts were re-made three ways each (`scripts/fetch-test-videos.sh`) and run through the real pose model:

| Clip (true count) | Dark (a third of the light, sensor noise) | 12 fps camera | Person at 40% size |
|---|---|---|---|
| squat-front-a (2) | 2 | 2 | 2 |
| pushup-side (6) | 6 | 6 | **0** |
| press-seated (2) | 2 | 2 | 2 |

8 of 9 match. The miss is the pose model's own limit: a dark silhouette shrunk to 40% isn't detected at all, so the setup screen keeps asking the person to step into view rather than counting wrongly. The far squat first came out as 0 too, but for a different reason: Cadence's "come closer" check refused to start even though the model tracked the person in 551 of 570 frames. Allowed to start, it counted both squats, so the check was relaxed from 20% to 14% of the frame (the clip sits at 16%). That threshold change was made using these stress clips, so they're not held out for it.

These run with the rest in `src/engine/realClips.eval.test.ts`; the far push-up is recorded as a known miss.

## 3. The whole app, in a browser

`npm run e2e` (Playwright, the system Chrome plus WebKit):

- **Live squats:** Chrome's fake camera plays real squat footage; the set starts hands-free, counts 2 reps and lands on the summary.
- **Live push-ups** from the side: counts 2 and finishes.
- **Arcade:** a 30-second jumping-jack challenge scores at least 3 clean reps, the name is saved and appears on the leaderboard.
- **Guided workout:** squats, then the rest screen previews "Shoulder press", skip rest, the next set starts, and leaving saves the workout.
- **Arcade duel:** two people side by side (the squat clip twice, offset in time) are counted separately and a winner is shown.
- **X-ray:** the live measurement panel shows the elbow angle during push-ups.
- **Data Lab:** a recording downloads as a 5-column CSV in the original training-data format.
- **Safari's engine (WebKit):** the pose model loads and counts the 2 squats in the rear-view clip correctly.
- **Pages:** every page renders without errors in Chrome and WebKit.
- **Offline:** after one visit, the app, the pose runtime and the model all load with the network off.
- **Privacy:** during a live set and the minute after it, the page makes no request to any server but its own. (MediaPipe's runtime has a built-in usage logger that posts performance statistics to Google every 60 seconds; this test found it, and Cadence now blocks it.)
- **Accessibility:** axe finds no WCAG 2.1 A/AA violations on the main pages.

## 4. Not validated

- **Plank, wall sit, glute bridge, lateral raise and high knees** have no usable real footage yet; they're covered by synthetic tests only.
- **Form-fault accuracy on real people** is only checked indirectly (no false alarms on 15 clips of good form). We have no real clips of, say, sagging hips with a known answer. Recording teammates doing each fault on purpose, from the recommended camera position, is the next step and takes about 20 minutes with the Data Lab.
- **Elbow flare** relies on the model's depth estimate and is shown as Beta; it never changes a score.
- **Calories** are estimates from standard MET values.
- **Fitness-test ratings:** push-ups use published norms (CSEP's CPAFLA, as reproduced by ACSM; women's norms assume knee push-ups). Squat and plank ratings are Cadence's own bands and are labelled that way in the app.

## Reproduce

```
cd spotter
npm install
./scripts/fetch-test-videos.sh            # downloads and cuts the clips (needs ffmpeg)
npm run build
TRACE_CLIPS="pushup-side.webm:pushup,squat-front-a.webm:squat" npx playwright test traceClip --project=chrome
npx vitest run src/engine/realClips.eval.test.ts --silent=false
npm run e2e
```

The clip list with exercises is in `scripts/validation/truth.json`.
