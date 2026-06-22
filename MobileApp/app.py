from flask import Flask, request, jsonify
import mediapipe as mp
import cv2
import numpy as np
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

# MediaPipe
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def calculate_angle(a, b, c):
    ba = np.array(a) - np.array(b)
    bc = np.array(c) - np.array(b)
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

@app.route('/analyze', methods=['POST'])
def analyze_video():
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files['video']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only mp4, mov, avi allowed"}), 400

    filename = secure_filename(file.filename)
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(temp_path)

    try:
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            return jsonify({"error": "Could not open video"}), 500

        all_frame_features = []
        frame_count = 0

        while True:
            success, frame = cap.read()
            if not success:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb_frame)

            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark

                # Key points
                r_shoulder = [landmarks[12].x, landmarks[12].y]
                r_elbow = [landmarks[14].x, landmarks[14].y]
                r_wrist = [landmarks[16].x, landmarks[16].y]
                r_hip = [landmarks[24].x, landmarks[24].y]
                r_knee = [landmarks[26].x, landmarks[26].y]
                r_ankle = [landmarks[28].x, landmarks[28].y]

                l_shoulder = [landmarks[11].x, landmarks[11].y]
                l_elbow = [landmarks[13].x, landmarks[13].y]
                l_wrist = [landmarks[15].x, landmarks[15].y]
                l_hip = [landmarks[23].x, landmarks[23].y]
                l_knee = [landmarks[25].x, landmarks[25].y]
                l_ankle = [landmarks[27].x, landmarks[27].y]

                # Mid points
                m_hip = [(r_hip[0] + l_hip[0]) / 2, (r_hip[1] + l_hip[1]) / 2]
                m_knee = [(r_knee[0] + l_knee[0]) / 2, (r_knee[1] + l_knee[1]) / 2]
                m_shoulder = [(l_shoulder[0] + r_shoulder[0]) / 2, (l_shoulder[1] + r_shoulder[1]) / 2]
                m_elbow = [(l_elbow[0] + r_elbow[0]) / 2, (l_elbow[1] + r_elbow[1]) / 2]

                # Angles
                r_shoulderang = 180 - calculate_angle(r_hip, r_shoulder, r_elbow)
                l_shoulderang = 180 - calculate_angle(l_hip, l_shoulder, l_elbow)
                hipang = calculate_angle(m_knee, m_hip, m_shoulder)
                r_kneeang = calculate_angle(r_hip, r_knee, r_ankle)
                l_kneeang = calculate_angle(l_hip, l_knee, l_ankle)
                r_elbowang = calculate_angle(r_wrist, r_elbow, r_shoulder)
                l_elbowang = calculate_angle(l_wrist, l_elbow, l_shoulder)

                m_shoulder_ang = (r_shoulderang + l_shoulderang) / 2
                m_elbow_ang = (r_elbowang + l_elbowang) / 2
                m_knee_ang = (r_kneeang + l_kneeang) / 2

                all_frame_features.append({
                    "hip_angle": round(float(hipang), 4),
                    "shoulder_angle": round(float(m_shoulder_ang), 4),
                    "elbow_angle": round(float(m_elbow_ang), 4),
                    "knee_angle": round(float(m_knee_ang), 4)
                })
            else:
                # Fill with zeros if no detection
                all_frame_features.append({
                    "hip_angle": 0.0,
                    "shoulder_angle": 0.0,
                    "elbow_angle": 0.0,
                    "knee_angle": 0.0
                })

            frame_count += 1

        cap.release()
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # === GROUP INTO SEQUENCES OF 30 FRAMES ===
        SEQUENCE_LENGTH = 30
        sequences = []
        
        for i in range(0, len(all_frame_features), SEQUENCE_LENGTH):
            seq = all_frame_features[i:i + SEQUENCE_LENGTH]
            # Pad last sequence with zeros if needed
            while len(seq) < SEQUENCE_LENGTH:
                seq.append({
                    "hip_angle": 0.0,
                    "shoulder_angle": 0.0,
                    "elbow_angle": 0.0,
                    "knee_angle": 0.0
                })
            sequences.append(seq)

        return jsonify({
            "success": True,
            "total_frames": frame_count,
            "num_sequences": len(sequences),
            "sequence_length": SEQUENCE_LENGTH,
            "sequences": sequences,          # ← List of 30-frame sequences
            "message": f"Created {len(sequences)} sequences of {SEQUENCE_LENGTH} frames each"
        })

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})


if __name__ == '__main__':
    print("🚀 Push-up Sequence Server Running (30 frames per sequence)")
    print("→ POST to http://10.0.0.199:5000/analyze")
    app.run(host='0.0.0.0', port=5000, debug=True)