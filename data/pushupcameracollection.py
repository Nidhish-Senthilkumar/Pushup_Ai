import cv2
import csv
import mediapipe as mp
import numpy as np

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

pushup_active = False

def calculate_angle(a, b, c):
    ba = a - b
    bc = c - b
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    with open("./good_pushup_data.csv", 'w', newline="") as f:
        writer = csv.writer(f)
        
        while True:
            ret, frame = cap.read()
            
            if not ret:
                break

            # Recolor Image
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image.flags.writeable = False

            results = pose.process(image)

            image.flags.writeable = True
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark

                rshoulder = np.array([landmarks[12].x, landmarks[12].y])
                rwrist = np.array([landmarks[16].x, landmarks[16].y])
                relbow = np.array([landmarks[14].x, landmarks[14].y])

                r_elbow_angle = calculate_angle(rshoulder, relbow, rwrist)

                if r_elbow_angle < 120 and not pushup_active:
                    pushup_active = True

                if pushup_active:
                    actualrow = []
                    for i in range(len(landmarks)):
                        row = [i, landmarks[i].x, landmarks[i].y, landmarks[i].z]
                        actualrow.extend(row)
                        actualrow.append('1') # change this to 1 if good pushup
                                              # 0 = bad pushup | 0.5 = mid pushup
                    writer.writerow(actualrow)
                    f.flush()  # Force write to file immediately
                    
                if r_elbow_angle > 140 and pushup_active:
                    pushup_active = False
                    writer.writerow(["END PUSHUP"])

            # Draw landmarks
            mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
            cv2.imshow("Webcam", image)

            if (cv2.waitKey(1) & 0xFF == ord('q')):
                break

cap.release()
cv2.destroyAllWindows()