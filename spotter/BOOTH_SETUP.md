# Booth setup

Everything you need to run Cadence at a convention table, including when the Wi-Fi dies.

## Hardware

- **A laptop** with Chrome (Edge works too). Any laptop from the last five years runs the pose model in real time.
- **A big screen**, if you can get one: plug in an external monitor or TV and drag the Arcade onto it. People watch from a distance.
- **The camera:** the laptop's webcam works. An external USB webcam on a small tripod is better, because you can put it where the exercise needs it (see below) without moving the laptop.
- **Optional:** a yoga mat for push-ups and planks, and a phone running Cadence to pass around.

## Camera placement

The setup screen tells each visitor what's wrong ("Step back", "Turn sideways", "Your feet are out of frame"), but you'll save time by setting the camera up right:

| Challenge | Camera | Distance |
|---|---|---|
| Squat Sprint, Jack Blitz | Facing the visitor, at waist height | 2.5 to 3.5 m, whole body in view with room above the head |
| Push-up Showdown, Plank Standoff | At floor level, to the visitor's side | About 2 m, head to feet in view |

**For a busy booth, lead with Squat Sprint and Jack Blitz.** Nobody has to get on the floor in their convention clothes, and they look great on a big screen. Keep the push-up mat for the brave.

- Light the person from the front. A bright window behind them turns them into a silhouette (Cadence still works, but less reliably).
- Mark the standing spot on the floor with tape: "Stand here".
- Spectators in the background are fine. Cadence follows whoever is doing the exercise, not whoever is biggest. Still, keep the area directly behind the player clear if you can.

## Before the doors open

1. **Load it once with internet.** Open the app (`npm run booth` on the laptop, or the hosted link) and wait about 10 seconds on the home page. The service worker caches the app, the pose runtime and the model. After that it works with no network at all. Test it: turn Wi-Fi off and reload.
2. **Settings → Arcade:** choose the challenge length (30 s is a good default). The QR code on the Arcade screen always points at https://getcadence.cc, even when the laptop runs its own copy. Only change **QR code link** if you host it somewhere else.
3. **Settings → Coaching:** turn voice on if the booth isn't too loud. Turn it off if you're next to another team's demo. Set **Form strictness**: *Easy* keeps casual visitors happy (three-quarter-depth reps count), *Standard* is the real thing, *Strict* is for the gym crowd and the final round.
4. **Clear the leaderboard** from any practice runs (Settings → Arcade → Clear leaderboard).
5. **For the Progress pages in your pitch:** Settings → Your data → *Load sample history*. It's clearly labelled as sample data, and you can remove it in one tap.
6. Plug the laptop in and turn off sleep. Cadence keeps the screen awake during a set, but not on the attract screen.

## No Node on the booth laptop?

Build once on any computer that has it (`npm install && npm run build`), copy the `spotter/dist` folder to the booth laptop, then:

```
cd dist
python3 -m http.server 4180
```

Open http://localhost:4180/#/arcade in Chrome. The camera works because it's `localhost`. (Opening `index.html` directly as a file won't work: browsers block loading the pose model from `file://`.)

## Running the Arcade

- Open `#/arcade`. It's a full-screen loop: attract screen, then challenge, then result, then back to the attract screen after 45 seconds of nobody touching it.
- Visitors can play without touching anything: **raise your right hand** to switch challenge, **both hands** to start. You can also click, or use the arrow keys and Enter.
- Only clean reps count. A rep that's too shallow or has a major fault flashes "Not counted" with the reason. That's the moment people get hooked; point it out.
- At the end the visitor gets a fun name ("Turbo Falcon") on the board; they can type their own.
- **Duel mode** (Squat Sprint and Jack Blitz): two players face the camera side by side, one on each side of the line in the middle of the screen. The camera needs to see both whole bodies, so put it about 4 m back. Each player is counted separately; ties go to the better form score.
- **Esc** returns to the attract screen at any time.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Camera access is blocked" | Click the camera icon in Chrome's address bar → Allow, then reload. |
| "Another app is using the camera" | Close Zoom, Teams, FaceTime or OBS. |
| Black camera on a Mac | System Settings → Privacy & Security → Camera → allow Chrome. |
| Counting feels off | Check the setup card: the whole body has to be in view, sideways for floor exercises. Step back. |
| It's slow (under 15 fps) | Settings → Coaching → Pose model → **Lite**. Plug in the laptop. |
| Someone in the background gets tracked | They're probably moving a lot. Ask them to step aside; Cadence switches back within a second or two. |
| Wi-Fi is down | Nothing to do if you loaded it once (step 1). |
| Need to start over | Settings → Your data → Export backup (to keep it), then Erase all data. |
