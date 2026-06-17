import cv2            # lets us use the webcam
import csv            # lets us save data into a spreadsheet file
import mediapipe as mp # library that can track body joints
import numpy as np     # library for math and handling numbers

# open webcam
cap = cv2.VideoCapture(0)
# set webcam resolution (width)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
# set webcam resolution (height)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

# tools for drawing and detecting body positions
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

# keeps track if someone is currently doing a pushup
pushup_active = False

# 0 = good pushup
# 1 = elbows wide
# 2 = hips too high
# 3 = sagging pushup

label = 1
pushupname = ""
match label:
    case 0:
        pushup_name="good"
    case 1:
        pushup_name="elbowswide"
    case 2:
        pushup_name="hipshigh"
    case 3:
        pushup_name="sagging"

# function to calculate angle between three body points (like shoulder-elbow-wrist)
def calculate_angle(a, b, c):
    ba = a - b  # line from middle point to first point
    bc = c - b  # line from middle point to third point
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc)) # math to get angle
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))  # keep angle in safe range
    return np.degrees(angle)  # convert angle to degrees

# start using Mediapipe Pose model
with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    # Open a CSV file to save pushup data (spreadsheet format).
    # Change the filename (e.g., "./saggingpushup.csv") to match the pushup type you’re recording.
    # Save to a temporary file for pipeline processing
    with open(f"./data/TRAINING_SET/{pushup_name}.csv", 'w', newline="") as f:
        writer = csv.writer(f)
        
        while True:
            # read a frame from the webcam
            ret, frame = cap.read()
            
            if not ret:
                break  # stop if no video frame

            # change frame colors to fit Mediapipe’s needs
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image.flags.writeable = False  # improve performance

            # process the frame and detect body landmarks
            results = pose.process(image)
            

            image.flags.writeable = True
            # change colors back so OpenCV can show it
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark  # all body points detected

                # Right side
                r_shoulder = np.array([landmarks[12].x, landmarks[12].y])
                r_elbow = np.array([landmarks[14].x, landmarks[14].y])
                r_wrist = np.array([landmarks[16].x, landmarks[16].y])
                r_hip = np.array([landmarks[24].x, landmarks[24].y])
                r_knee = np.array([landmarks[26].x, landmarks[26].y])

                # Left side
                l_shoulder = np.array([landmarks[11].x, landmarks[11].y])
                l_elbow = np.array([landmarks[13].x, landmarks[13].y])
                l_wrist = np.array([landmarks[15].x, landmarks[15].y])
                l_hip = np.array([landmarks[23].x, landmarks[23].y])
                l_knee = np.array([landmarks[25].x, landmarks[25].y])
                
                
                m_hip = (r_hip+l_hip)/2
                m_knee = (r_knee+l_knee)/2
                m_shoulder = (l_shoulder+r_shoulder)/2

                r_shoulderang =  180 - calculate_angle(r_hip, r_shoulder, r_elbow)
                l_shoulderang = 180 - calculate_angle(l_hip, l_shoulder, l_elbow)
                hipang = calculate_angle(m_knee, m_hip, m_shoulder)
                r_elbowang = calculate_angle(r_wrist, r_elbow, r_shoulder)
                l_elbowang = calculate_angle(l_wrist, l_elbow, l_shoulder)

                if (r_elbowang < 140):
                    writer.writerow([hipang, r_shoulderang, l_shoulderang, r_elbowang, l_elbowang, label])

            # draw body landmarks on screen
            mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
            # show the webcam feed with drawings
            cv2.imshow("Webcam", image)

            # quit if "q" is pressed
            if (cv2.waitKey(1) & 0xFF == ord('q')):
                break

# release webcam and close windows
cap.release()
cv2.destroyAllWindows()
