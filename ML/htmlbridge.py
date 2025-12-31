from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import os
import joblib
import numpy as np

app = Flask(__name__)
CORS(app)

# MediaPipe landmark indices
LS = 11
RS = 12
LE = 13
RE = 14
LW = 15
RW = 16
LHIP = 23
RHIP = 24

def angle_between(a, b, c):
    # angle at b between points a-b-c
    bax = a[0]-b[0]
    bay = a[1]-b[1]
    bcx = c[0]-b[0]
    bcy = c[1]-b[1]
    dot = bax*bcx + bay*bcy
    mag1 = math.hypot(bax, bay)
    mag2 = math.hypot(bcx, bcy)
    if mag1*mag2 == 0:
        return None
    cosang = max(-1.0, min(1.0, dot/(mag1*mag2)))
    return math.degrees(math.acos(cosang))


def load_model_and_scaler():
    # Try repo-local model first
    model_paths = [
        os.path.join('Models', 'LogisticRegression', 'model.pkl'),
        os.path.join('Models', 'LogisticRegression', 'model.joblib')
    ]
    scaler_paths = [
        os.path.join('Models', 'LogisticRegression', 'scaler.pkl'),
        os.path.join('Models', 'LogisticRegression', 'scaler.joblib')
    ]
    model = None
    scaler = None
    for p in model_paths:
        if os.path.exists(p):
            try:
                model = joblib.load(p)
                break
            except Exception:
                continue
    for p in scaler_paths:
        if os.path.exists(p):
            try:
                scaler = joblib.load(p)
                break
            except Exception:
                continue
    return model, scaler


def extract_features_from_frames(frames, n_features=7):
    # Compute a compact feature vector from landmark frames.
    # Features: avg_elbow, min_elbow, max_elbow, std_elbow, depth_ratio, hip_alignment_ratio, valid_frames
    elbows = []
    depth_count = 0
    hip_ok = 0
    valid = 0
    for f in frames:
        lm = f.get('landmarks')
        if not lm:
            continue
        valid += 1
        try:
            l_sh = (lm[LS]['x'], lm[LS]['y'])
            r_sh = (lm[RS]['x'], lm[RS]['y'])
            l_el = (lm[LE]['x'], lm[LE]['y'])
            r_el = (lm[RE]['x'], lm[RE]['y'])
            l_wr = (lm[LW]['x'], lm[LW]['y'])
            r_wr = (lm[RW]['x'], lm[RW]['y'])
            l_hip = (lm[LHIP]['x'], lm[LHIP]['y'])
            r_hip = (lm[RHIP]['x'], lm[RHIP]['y'])
        except Exception:
            continue
        l_angle = angle_between(l_sh, l_el, l_wr)
        r_angle = angle_between(r_sh, r_el, r_wr)
        angles = [a for a in (l_angle, r_angle) if a is not None]
        if angles:
            elbows.append(sum(angles)/len(angles))
            if sum(angles)/len(angles) < 100:
                depth_count += 1
        sh_mid_y = (l_sh[1] + r_sh[1]) / 2.0
        hip_mid_y = (l_hip[1] + r_hip[1]) / 2.0
        if abs(hip_mid_y - sh_mid_y) < 0.08:
            hip_ok += 1

    if valid == 0:
        base = [0.0]*n_features
        return np.array(base).reshape(1, -1), valid

    avg_elbow = float(np.mean(elbows)) if elbows else 0.0
    min_elbow = float(np.min(elbows)) if elbows else 0.0
    max_elbow = float(np.max(elbows)) if elbows else 0.0
    std_elbow = float(np.std(elbows)) if elbows else 0.0
    depth_ratio = float(depth_count) / valid
    hip_ratio = float(hip_ok) / valid
    vf = float(valid)

    feats = [avg_elbow, min_elbow, max_elbow, std_elbow, depth_ratio, hip_ratio, vf]

    # Adjust length to n_features by truncating or padding zeros
    if len(feats) >= n_features:
        feats = feats[:n_features]
    else:
        feats = feats + [0.0] * (n_features - len(feats))

    return np.array(feats).reshape(1, -1), valid

@app.route('/upload_pose_data', methods=['POST'])
def upload_pose_data():
    data = request.get_json()
    frames = data.get('frames', [])

    left_state = 'up'
    right_state = 'up'
    left_count = 0
    right_count = 0
    depth_frames = 0
    hip_ok_frames = 0
    valid_frames = 0

    for f in frames:
        lm = f.get('landmarks')
        if not lm:
            continue
        valid_frames += 1
        try:
            l_sh = (lm[LS]['x'], lm[LS]['y'])
            r_sh = (lm[RS]['x'], lm[RS]['y'])
            l_el = (lm[LE]['x'], lm[LE]['y'])
            r_el = (lm[RE]['x'], lm[RE]['y'])
            l_wr = (lm[LW]['x'], lm[LW]['y'])
            r_wr = (lm[RW]['x'], lm[RW]['y'])
            l_hip = (lm[LHIP]['x'], lm[LHIP]['y'])
            r_hip = (lm[RHIP]['x'], lm[RHIP]['y'])
        except Exception:
            continue

        # elbow angles
        l_angle = angle_between(l_sh, l_el, l_wr)
        r_angle = angle_between(r_sh, r_el, r_wr)
        # use average if both available
        angles = [a for a in (l_angle, r_angle) if a is not None]
        if not angles:
            continue
        avg_elbow = sum(angles)/len(angles)

        # detect depth (down when elbow angle small)
        if avg_elbow < 100:
            depth_frames += 1

        # detect push-up reps per side using state machine
        if l_angle is not None:
            if left_state == 'up' and l_angle < 100:
                left_state = 'down'
            if left_state == 'down' and l_angle > 150:
                left_state = 'up'
                left_count += 1
        if r_angle is not None:
            if right_state == 'up' and r_angle < 100:
                right_state = 'down'
            if right_state == 'down' and r_angle > 150:
                right_state = 'up'
                right_count += 1

        # hip alignment: compute vertical deviation between shoulder midpoint and hip midpoint
        sh_mid_y = (l_sh[1] + r_sh[1]) / 2.0
        hip_mid_y = (l_hip[1] + r_hip[1]) / 2.0
        # if hips roughly in line with shoulders (y difference small) count as ok
        if abs(hip_mid_y - sh_mid_y) < 0.08:  # threshold in normalized coords
            hip_ok_frames += 1

    total_reps = max(left_count, right_count)
    depth_ratio = (depth_frames / valid_frames) if valid_frames else 0
    hip_ratio = (hip_ok_frames / valid_frames) if valid_frames else 0

    # form accuracy heuristic
    form_accuracy = 100 * (0.6 * depth_ratio + 0.4 * hip_ratio)

    # tip selection
    if hip_ratio < 0.6:
        tip = 'Keep your hips in line with your shoulders (avoid sagging/high hips)'.capitalize()
    elif depth_ratio < 0.5:
        tip = 'Try lowering your chest more on the down phase'.capitalize()
    else:
        tip = 'Good form — keep it up!'

    resp = {
        'pushups': total_reps,
        'form_accuracy': round(form_accuracy, 1),
        'tip': tip,
        'valid_frames': valid_frames
    }

    # Try to use trained LogisticRegression model if available
    model, scaler = load_model_and_scaler()
    if model is not None and scaler is not None and valid_frames > 0:
        # determine expected input size
        try:
            n_in = scaler.n_features_in_
        except Exception:
            # fallback to 7 features
            n_in = 7

        feats, vf = extract_features_from_frames(frames, n_features=n_in)
        try:
            feats_scaled = scaler.transform(feats)
            pred = model.predict(feats_scaled)
            # try predict_proba for confidence
            confidence = None
            try:
                proba = model.predict_proba(feats_scaled)
                # for multiclass, use the highest class probability
                confidence = float(np.max(proba))
            except Exception:
                confidence = None

            # Interpret multiclass model output: labels 0..3 map to specific pushup issues
            label_map = {
                0: ('Good pushup', 'Good form — keep it up!'),
                1: ('Elbows wide', 'Keep elbows closer to your body; avoid flaring.'),
                2: ('Hips high', 'Lower your hips so your body forms a straight line.'),
                3: ('Knees sagging', 'Engage your core and straighten your legs to avoid sagging.')
            }

            pred_label = int(pred[0]) if hasattr(pred, '__len__') else int(pred)
            label_name, label_tip = label_map.get(pred_label, ('Unknown', 'Model suggests review form.'))

            form_score = round((confidence * 100) if confidence is not None else float(resp['form_accuracy']), 1)
            resp['model_based'] = True
            resp['predicted_label'] = pred_label
            resp['predicted_label_name'] = label_name
            resp['form_accuracy'] = form_score
            resp['tip'] = f"Model: {label_tip}"
        except Exception as e:
            # If ML path fails, keep heuristic
            resp['model_based'] = False
            resp['ml_error'] = str(e)

    return jsonify(resp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
