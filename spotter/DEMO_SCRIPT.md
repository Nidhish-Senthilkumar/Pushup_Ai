# Demo script

What to say at the convention, how to run the demo, and answers for the questions judges and visitors ask. Adjust the wording to your own voice; the facts are all accurate.

## The one-liner (10 seconds)

> "Spotter is a free AI personal trainer that watches you through any camera, counts your reps and fixes your form live. It runs entirely on your device, so your video never leaves your phone."

## The pitch (about 60 seconds)

> "Most people who work out alone never find out their form is off until something hurts. A personal trainer often costs fifty dollars or more an hour, and most fitness apps just count reps or play videos.
>
> Spotter watches you through your phone or laptop camera. An AI pose model finds 33 points on your body thirty times a second, and our engine turns those into joint angles, a body line, depth and tempo. So it can tell you, during the rep, 'Lift your hips' or 'Go lower', and after the set it writes you a coaching report from your own numbers: which reps were clean, where your form started slipping, and the one thing to fix next time.
>
> It covers 13 exercises, runs guided workouts hands-free, builds you a 4-week plan from a 5-minute fitness test, and tracks your streaks and personal records. It's free, needs no account, and works offline, because all the AI runs on your device.
>
> We started with PushBot, a push-up checker that uploaded video to a laptop and gave one sentence of feedback after the set. Spotter is what we learned from building it."

## Slides

The app has its own slide deck: open **`#/pitch`** (More → Presentation). Arrow keys or space move between slides, Esc leaves. Slide 6 has a button that opens the Arcade, so you go from talking to live demo in one click on the same laptop.

## The live demo (2 to 3 minutes)

1. **Arcade, Squat Sprint.** Have a teammate (or the visitor) raise both hands to start. Point at the screen while they squat: the skeleton, the depth gauge filling up, the green "PERFECT" pops. Tell them to do one half squat on purpose: it flashes **"Too shallow · not counted"**. That's the moment that sells it.
2. **Result screen.** Their score goes on the leaderboard. Point at the QR code: "Scan this and it's on your phone, right now, free."
3. **Duel.** When two friends are watching, switch to *Duel · 2 players*: they stand either side of the line and race. Each is counted on their own, and a bad rep on one side doesn't help the other. Crowds love this.
4. **X-ray (for judges).** Start any set and tap the eye icon: the live elbow angle, body line and depth the AI is reading, 30 times a second. This answers "is it really measuring something?" without a slide.
5. **Progress page** (with sample history loaded): streak, personal records, the form-score trend. "This is what three weeks looks like."
6. **A summary page:** the rep-by-rep bars, the best-rep and weakest-rep skeletons side by side, and the coach report. Read one line out loud, for example "Your form dropped from rep 8 on. That's your fatigue point today."
7. **If there's time, How it works:** the pipeline and the validation table.

**If the camera misbehaves:** go to *Analyze a video* and drop in a recorded clip (keep one squat video on the desktop), or show the summary of a saved workout. Never debug live in front of a judge.

## Questions you'll get

**"How does it actually work?"**
MediaPipe Pose, a neural network from Google, finds 33 body landmarks in every camera frame, on the device's GPU. We smooth them with a One Euro filter, then compute exercise-specific measurements: elbow angle for push-ups, hip height relative to the knee for squats, a signed hip offset from the shoulder-to-ankle line for sagging. A state machine with hysteresis turns the depth signal into reps, so jitter can't fake a rep and a rep has to start from the start position. Each form check is a rule with a duration threshold, so one noisy frame can't trigger it.

**"Where's the AI? Isn't this just rules?"**
Two layers. The perception is deep learning: the pose model is a neural network, and that's the hard part. On top of it we chose explainable measurements instead of a black-box classifier, because our first version (an LSTM trained on our own recordings) only knew one person's body and one camera angle. Measured angles work for anyone on day one. The Data Lab collects labelled data from many people in the original training format, so the learned model can come back once it has enough data to be trusted.

**"How accurate is it?"**
We hand-counted reps in 16 real exercise videos, by eye, frame by frame, and compared: 33 reps, off by 1. Three of those videos were held out: counted first and run once, with no tuning afterwards. Two were exact, including 6 of 6 burpees; the miss was a barbell press filmed from behind, where the head hides the hands. We also made dark, slow-camera and far-away versions of three clips: 8 of 9 still counted exactly. Every exercise also has automated tests with a synthetic 3D body doing known reps and known mistakes. Everything is in VALIDATION.md. *(Being upfront about the miss builds more trust than claiming 100%.)*

**"What about privacy?"**
Nothing is uploaded. The model runs in the browser tab; each frame becomes 33 points and is thrown away. There's no account and no server. History is stored only on the device and can be erased in one tap. We tested it: an automated test records every network request during a workout. That's how we found that Google's AI library quietly sends usage statistics every minute, so we block it. Zero requests leave the device.

**"Does it need internet?"**
Only for the very first load. After that it works offline, which is also why it's free for us to run: there are no servers.

**"Why not use ChatGPT for the feedback?"**
Speed, cost and honesty. Feedback has to arrive during the rep, not a few seconds later. An API would cost money per user and need the internet. And every sentence in our report comes from a number we measured, so it can't make things up.

**"What was the hardest part?"**
Pick one that's true for you. Good candidates: (1) people in the background. At a booth, the biggest person in the picture usually isn't the one exercising, so Spotter tracks everyone and follows whoever is actually doing the exercise. We found that bug on real footage of a woman doing curls next to a presenter. (2) Camera angles: a squat filmed from the front makes the thighs look short at the bottom, which first made the app think the person had walked away.

**"What's next?"**
Record more people with the Data Lab, retrain the form classifier on held-out people, add more exercises, and wrap it as an installable app. It already installs from the browser as a PWA.

**"How is it different from existing apps?"**
Most free apps count reps or show videos. Paid ones with form feedback usually need a subscription, an account or special hardware. Spotter coaches form live, explains every correction, is free, and keeps your video on your device.

## Numbers to remember

- 13 exercises, 33 body points, about 30 frames a second
- 16 real videos tested: 33 reps, off by 1
- 90 engine tests, 25 browser tests
- $0 to run, no account, works offline
