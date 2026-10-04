# Handoff

Everything below was built and tested locally. Committing, pushing and deploying are done by hand; the commands are at the end.

## What's here

- `spotter/`: the new app (Cadence), with its own docs:
  - [README.md](README.md): what it does and how to run it
  - [DEMO_SCRIPT.md](DEMO_SCRIPT.md): what to say at the convention, and answers for judges
  - [BOOTH_SETUP.md](BOOTH_SETUP.md): hardware, camera placement, offline prep, troubleshooting
  - [VALIDATION.md](VALIDATION.md): how accurate it is and how that was measured
  - [FINDINGS.md](FINDINGS.md): a review of the original PushBot code and data
  - [BUILDLOG.md](BUILDLOG.md): what was built and the bugs real footage exposed
- `.github/workflows/spotter-pages.yml`: builds and publishes Cadence to GitHub Pages.
- `README.md` (repository root): one paragraph added at the top pointing to Cadence. Nothing else outside `spotter/` changed.

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

1. **The name.** Decided 2026-10-04: the app is **Cadence**, at getcadence.cc (it was "Spotter" before). The name is `APP_NAME` in `src/config.ts` and also written into interface text, `index.html`, `public/manifest.webmanifest` and the docs, so a future rename means a search across those. The folder is still `spotter/`, and the browser storage keys still start with `spotter.` so nobody's saved history is lost.
2. **The Expo app.** Cadence replaces the website and the Flask/Ollama setup. The Expo app in `MobileApp/` still works the old way (upload to a laptop). Cadence installs on phones as a web app, so it may not be needed for the convention. If you want to keep it, its trainer tab can show Cadence in a WebView later.
3. **Where to host.** GitHub Pages is free and the workflow is ready, but turning it on needs a repo admin (Nidhish). Alternative: host it from your own fork or on Vercel/Netlify (also free).
4. **Recording real fault data.** Spend 20 minutes with the Data Lab: each teammate does 10 reps of each push-up fault, on purpose, from the side. That gives real-world test data for the form checks and fills the empty `elbowswide.csv`.

## Before the convention, test with real people

Everything was verified in desktop Chrome and Safari's engine with recorded footage as the camera, and the real-footage numbers are in VALIDATION.md. But no one has used it live yet. Spend 15 minutes with the team: each person tries Squat Sprint, a push-up set from the side and a Duel, on the booth laptop and on a phone. That will catch anything about your room, lighting or devices that recorded clips can't.

## Known limitations (also in VALIDATION.md)

- Plank, wall sit, glute bridge, lateral raise and high knees are tested on synthetic data only (no usable real footage was found).
- A press filmed from behind can hide the hands at the bottom; the app asks for a front view for presses.
- Elbow flare is a beta check and doesn't affect scores.
- Squat and plank fitness-test ratings are Cadence's own bands; push-ups use published norms.

## Where it's hosted

- **https://getcadence.cc** is the main address, on Cloudflare. It's the domain that used to be the Cadence task app. app.getcadence.cc and www.getcadence.cc redirect to it.
- **https://nidhish-senthilkumar.github.io/Pushup_Ai/** is a mirror on GitHub Pages. The "Deploy GitHub Pages mirror" workflow rebuilds it on every push to `main` that touches `spotter/`. Its QR code also sends people to getcadence.cc.

Everyone's history lives in their own browser, separately for each address, which is why the QR code and the old addresses all point at getcadence.cc.

### Deploying getcadence.cc

Cloudflare doesn't watch GitHub, so getcadence.cc only changes when someone with the Cloudflare account runs this (after pulling the latest `main`):

```
cd ~/terminalais/Pushup_Ai/spotter
```
```
npm run build
npx wrangler@4 deploy
```

The first time, log in first (`npx wrangler@4 login` opens the browser) and also deploy the redirects:

```
npx wrangler@4 deploy -c deploy/redirects/wrangler.jsonc
```

What wrangler asks the first time: getcadence.cc is already used by the worker "cadence-landing" (and app.getcadence.cc by "cadence"); update them to point to this one? Answer **y**. If it says a DNS record conflicts, also **y**. A warning about `expo/tsconfig.base` comes from the repository's root `tsconfig.json` and doesn't matter.

- `wrangler.jsonc`: the main site, worker "cadence-fitness", serving the built files in `dist/`. No server code.
- `deploy/redirects/`: worker "cadence-fitness-redirects" for app.getcadence.cc and www. It also retires the old Cadence task app for anyone who installed it on their phone or computer; the comment in `worker.js` explains how.
- Rolling back: the old Cadence workers ("cadence", "cadence-landing") stay in the Cloudflare account, only without their domains. Deploying them again from the old Cadence repository takes the domains back.

Checked before handing over (2026-10-04): both configs pass `wrangler deploy --dry-run`. Run in Cloudflare's local runtime (`wrangler dev`), the site loads, counts a live squat set, works offline, makes no outside request and its QR code encodes https://getcadence.cc/. The real old Cadence web build, installed with its service worker and then switched to the redirect worker, lands on the new app with no service worker or cache left behind (5 runs of 5).

### Committing changes

Work on a branch and open a pull request, as with the first version:

```
cd ~/terminalais/Pushup_Ai
```
```
git add -A spotter .github README.md
git commit -m "Your message"
git push -u origin <branch>
gh pr create --fill
gh pr merge <branch> --merge
```

The pose models (`spotter/public/models/*.task`, 14 MB) are committed on purpose: the app serves them itself so it works offline and never calls a CDN.
