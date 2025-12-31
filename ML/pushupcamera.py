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
    with open("../temporarydatafile.csv", 'w', newline="") as f:
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

                # grab right shoulder, wrist, and elbow positions
                rshoulder = np.array([landmarks[12].x, landmarks[12].y])
                rwrist = np.array([landmarks[16].x, landmarks[16].y])
                relbow = np.array([landmarks[14].x, landmarks[14].y])

                # measure elbow bend
                r_elbow_angle = calculate_angle(rshoulder, relbow, rwrist)

                # if elbow bends below 120 degrees → pushup starts
                if r_elbow_angle < 120 and not pushup_active:
                    pushup_active = True
                    
                # if elbow straightens above 140 degrees → pushup ends
                if r_elbow_angle > 140 and pushup_active:
                    pushup_active = False
                    writer.writerow(["END PUSHUP"])  # mark end of pushup
                    f.flush()
                    # After saving, trigger the ML and Ollama pipeline
                    import subprocess
                    subprocess.Popen(["python", "../Ollama/LLMAIIntegration.py"])  # Non-blocking call

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
