# Findings on the original PushBot code

A review of the code in this repository as it was cloned on 2026-10-03, written so the team can decide what to keep, fix or retire. Nothing outside `spotter/` was changed. Every claim below was checked against the code or the data, and each item says how.

## The training data

**1. `data/TRAINING_SET/elbowswide.csv` is empty.** It has 0 rows (checked with `wc -l` and pandas). `ML/LSTM.py` still builds a 4-class softmax, so class 1 ("elbows wide") was never seen in training and the model can't recognise it. The website and the Ollama prompt still offer "elbows wide" as an answer. Spotter's Data Lab records new rows in exactly this CSV format, so this file can be filled at the convention.

**2. Each class is one continuous recording.** The other three files have 11,661 (good), 10,540 (hips high) and 10,526 (sagging) frames. Each looks like one session from one camera position, most likely one person. I checked whether that inflates the reported accuracy. A logistic regression on the same four angles scores 97.9% with a random split and 97.8% when trained on the first 80% of each recording and tested on the last 20%; a random forest scores 100% both ways. So the classes really are separable *for this person and this camera*. That tells us nothing yet about other people, other bodies or other camera angles. The honest claim for a judge is "98% on our own recordings; not yet tested on anyone else".

**3. The hip angle can't tell sagging from piking.** `calculate_angle` returns an unsigned angle (0 to 180). A straight body is about 180 degrees, and both sagging and piking make it smaller (class means: good 174, hips high 136, sagging 157). The classifier separates them using the shoulder angle as well, which works for one person but is fragile. Spotter measures a *signed* body line instead: how far the hip sits above or below the shoulder-to-ankle line.

**4. Frames are only recorded while the right elbow is under 140 degrees** (`if (r_elbowang < 140)` in `data/pushupcamera.py`). So 30 consecutive CSV rows aren't 30 consecutive video frames: the top of each rep is cut out, and windows can join the end of one rep to the start of the next. That's fine for a frame classifier but worth knowing for the LSTM.

**5. Train/serve mismatch.** `MobileApp/app.py` sends the LSTM every frame of the uploaded video, including frames with the elbow straight and `0.0` placeholder rows for frames with no person. Training never saw either kind of row.

**6. `ML/htmlbridge.py` feeds the logistic regression the wrong features.** It builds `[avg_elbow, min_elbow, max_elbow, std_elbow, depth_ratio, hip_ratio, valid_frames]` and truncates to the scaler's 4 inputs, giving `[avg, min, max, std]` of the elbow angle. The model was trained on `[hip, shoulder, elbow, knee]` angles, so its predictions there are meaningless. (The website no longer uses this file.)

## Code that won't run as checked in

**7. Hardcoded Windows paths.** `MobileApp/app.py` loads `F:\Projects\AI\Internship\Website\model\model.keras`, and `ML/LSTM.py` and `ML/LogisticRegression.py` save there too. `Website/comms.py` loads `Website\model\model.keras` with a backslash, which fails on macOS and Linux.

**8. Hardcoded network address.** `MobileApp/mobileapp/components/camera-feed.tsx` posts to `http://10.0.0.199:5000/analyze`, so the phone app only works on one Wi-Fi network with one laptop. That's the main reason the old setup is risky for a live demo.

**9. `Website/index.html` and `Website/stats.html` contain only a navigation bar** (no `<html>`, `<head>` or content).

## Smaller things

- `Website/websitejavascript.js` maps class 3 (sagging) to "Bring your knees up", which is the wrong cue. It also assigns `sequence_length`, `seq_arr` and `aiResponse` without declaring them (implicit globals).
- `Ollama/Modelfile` contains the placeholder text "~ add more" inside the system prompt, so the model sees it.
- The Expo app ignores the LSTM's prediction entirely. Scoring is rule-based in `storage/storage.js`, and the result is stored as `geminiFeedback` although no Gemini call exists (`scripts/geminiapi.js` is empty).
- `__pycache__/` folders and `.expo/` are committed; `main.py` is empty.
- In `ML/LSTM.py`, the `Normalization` layer is adapted on all the data before the train/validation split (a small leak; it doesn't change the conclusion of item 2).

## What Spotter does differently

| Original | Spotter |
|---|---|
| Record 15 s, upload to a laptop, wait for one sentence | Feedback during every rep, plus a full report after the set |
| Flask + TensorFlow + Ollama on one laptop, same Wi-Fi | One web page; pose model runs on the device; works offline |
| Push-ups only | 13 exercises |
| 4-class classifier trained on one person | Each fault measured directly (works for anyone), with the Data Lab collecting new labelled data in the original format |
| No tests | 90 engine tests, real-footage validation, 25 browser tests |

## Suggested next steps for the ML work

1. Fill `elbowswide.csv` (Data Lab, push-up, label 1).
2. Record several people, each in their own CSV file, and evaluate by holding out whole people (train on some, test on others). That's the number to quote.
3. If you retrain, record all frames (drop the `< 140` filter) and handle the no-person frames the same way in training and in the app.
