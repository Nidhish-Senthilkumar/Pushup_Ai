# Handoff

Everything below was built and tested locally. Nothing has been committed, pushed or deployed: the commands to do that are at the end, for you to run.

## What's here

- `spotter/`: the new app (Spotter), with its own docs:
  - [README.md](README.md): what it does and how to run it
  - [DEMO_SCRIPT.md](DEMO_SCRIPT.md): what to say at the convention, and answers for judges
  - [BOOTH_SETUP.md](BOOTH_SETUP.md): hardware, camera placement, offline prep, troubleshooting
  - [VALIDATION.md](VALIDATION.md): how accurate it is and how that was measured
  - [FINDINGS.md](FINDINGS.md): a review of the original PushBot code and data
  - [BUILDLOG.md](BUILDLOG.md): what was built and the bugs real footage exposed
- `.github/workflows/spotter-pages.yml`: builds and publishes Spotter to GitHub Pages.
- `README.md` (repository root): one paragraph added at the top pointing to Spotter. Nothing else outside `spotter/` changed.

## Try it now (2 minutes)

```
cd ~/terminalais/Pushup_Ai/spotter
npm install
npm run dev
```

Open http://localhost:5173. Allow the camera. Suggested tour: Train → Squat → Start with camera; then Arcade (try Duel with a friend); then Settings → Load sample history → Progress. The convention slides are at http://localhost:5173/#/pitch.

## Checks that pass

```
cd ~/terminalais/Pushup_Ai/spotter
npm test                          # 90 engine tests; on a fresh clone 65 run and the 25 real-footage replays skip
./scripts/fetch-test-videos.sh    # test footage, once (needs ffmpeg; about 1.4 GB, mostly raw fake-camera video, all in the ignored e2e/.cache)
npm run build
npm run e2e                       # 25 browser tests: live camera, Arcade, duel, fitness test, phone size, offline, privacy, WebKit, accessibility
```

To run the 25 real-footage replays too, trace the clips once (about 15 minutes), then `npm test` runs all 90:

```
TRACE_CLIPS="$(python3 -c "import json;d=json.load(open('scripts/validation/truth.json'));print(','.join(c['clip']+'.webm:'+c['exercise']+(':12' if c['clip'].endswith('12fps') else '') for c in d['clips']+d['stress']))")" npx playwright test traceClip --project=chrome
```

Checked on a clean copy (only the files git would commit): `npm ci && npm run check` passes.

## Decisions for the team

1. **The name.** "Spotter" is a working name. It lives in `src/config.ts` (one line), plus `index.html`, `public/manifest.webmanifest` and the docs.
2. **The Expo app.** Spotter replaces the website and the Flask/Ollama setup. The Expo app in `MobileApp/` still works the old way (upload to a laptop). Spotter installs on phones as a web app, so it may not be needed for the convention. If you want to keep it, its trainer tab can show Spotter in a WebView later.
3. **Where to host.** GitHub Pages is free and the workflow is ready, but turning it on needs a repo admin (Nidhish). Alternative: host it from your own fork or on Vercel/Netlify (also free).
4. **Recording real fault data.** Spend 20 minutes with the Data Lab: each teammate does 10 reps of each push-up fault, on purpose, from the side. That gives real-world test data for the form checks and fills the empty `elbowswide.csv`.

## Before the convention, test with real people

Everything was verified in desktop Chrome and Safari's engine with recorded footage as the camera, and the real-footage numbers are in VALIDATION.md. But no one has used it live yet. Spend 15 minutes with the team: each person tries Squat Sprint, a push-up set from the side and a Duel, on the booth laptop and on a phone. That will catch anything about your room, lighting or devices that recorded clips can't.

## Known limitations (also in VALIDATION.md)

- Plank, wall sit, glute bridge, lateral raise and high knees are tested on synthetic data only (no usable real footage was found).
- A press filmed from behind can hide the hands at the bottom; the app asks for a front view for presses.
- Elbow flare is a beta check and doesn't affect scores.
- Squat and plank fitness-test ratings are Spotter's own bands; push-ups use published norms.

## Put it online (GitHub Pages)

Pages is already switched on, but in the old "Deploy from a branch" mode, which publishes the repository as it is (and currently fails, see below). Two steps:

**1. A repo admin (Nidhish) changes one setting:** GitHub → Pushup_Ai → Settings → Pages → Build and deployment → Source → **GitHub Actions**. Collaborators can't change this; only the owner can.

**2. You commit, push and merge:**

```
cd ~/terminalais/Pushup_Ai
```
```
git checkout -b spotter
git rm --cached Pushup_Ai
git add spotter .github README.md
git commit -m "Add Spotter: real-time in-browser fitness coach with Arcade booth mode"
git push -u origin spotter
gh pr create --title "Spotter: real-time AI fitness coach" --body "New in-browser version of PushBot. See spotter/HANDOFF.md."
gh pr merge spotter --merge
```

The last line merges straight away. Leave it out if you want Nidhish and Surzom to review the pull request first; the site goes live when it's merged either way.

Merging into `main` starts the "Deploy Spotter" workflow: it installs, runs the tests, builds and publishes, in about 2 minutes. Watch it with `gh run watch`. If it ran before step 1 was done, its deploy step fails; run it again once the setting is changed:

```
cd ~/terminalais/Pushup_Ai
```
```
gh workflow run "Deploy Spotter"
```

The site will be at **https://nidhish-senthilkumar.github.io/Pushup_Ai/**. The Arcade's QR code already points there (`HOSTED_URL` in `src/config.ts`), so there's nothing to set on the booth laptop.

Notes:

- `git rm --cached Pushup_Ai` removes an empty folder that was committed by accident in June as a broken submodule (no `.gitmodules`). It is what makes GitHub's default Pages build fail with "No url found for submodule path 'Pushup_Ai'". Nothing is in it.
- The pose models (`spotter/public/models/*.task`, 14 MB) are committed on purpose: the app serves them itself so it works offline and never calls a CDN.
- Checked before handing over (2026-10-04): exactly the files these commands commit (117 new, 15.8 MB, no caches or build output), installed and built with Node 22 like the workflow, 65 tests pass (25 replays skip without local footage, as on GitHub), and the build served at `/Pushup_Ai/` loads, counts a live squat set, works offline, makes no outside request and shows the right QR code.
