import requests
import pyttsx3
import csv
import time
import numpy as np
from keras.preprocessing.sequence import pad_sequences
from keras.models import load_model
from sklearn.preprocessing import MinMaxScaler
import os

# Constants
CSV_PATH = "./temporarydatafile.csv"
MODEL_PATH = "pushup_model.h5"  # Save your trained model with this name
MAX_TIMESTEPS = 30
NUM_CLASSES = 3

# Load your trained model
model = load_model(MODEL_PATH)

# Re-initialize the same scaler (ideally you save the scaler when training)
def load_scaler():
    # For simplicity, re-fit the scaler (in production, save and load it)
    dummy_data = []
    with open("ML/good_pushup_data.csv", "r") as f:
        reader = csv.reader(f)
        for row in reader:
            if row[0] != "END PUSHUP":
                try:
                    features = [float(x) for x in row[:-1]]
                    dummy_data.append(features)
                except:
                    pass
    scaler = MinMaxScaler()
    scaler.fit(dummy_data)
    return scaler

scaler = load_scaler()

# Query Ollama
def query_ollama(prompt, model="gemma3:1b"):
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()['response']
    else:
        raise Exception(f"Error: {response.status_code} - {response.text}")

# Text-to-speech
def speak_text(text):
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()

# Read the latest pushup from CSV
def read_latest_pushup(csv_path):
    if not os.path.exists(csv_path):
        return None

    with open(csv_path, "r") as f:
        reader = csv.reader(f)
        all_rows = list(reader)

    sequences = []
    current = []
    for row in all_rows:
        if row[0] == "END PUSHUP":
            if current:
                sequences.append(current)
                current = []
        else:
            try:
                features = [float(x) for x in row[:-1]]
                current.append(features)
            except:
                continue

    if sequences:
        return sequences[-1]  # return the most recent pushup
    else:
        return None

# Main monitoring loop
print("📹 Waiting for pushup data...")
last_processed_len = 0

while True:
    time.sleep(2)  # check every 2 seconds

    # Read current file
    if not os.path.exists(CSV_PATH):
        continue

    with open(CSV_PATH, "r") as f:
        current_lines = f.readlines()

    if current_lines.count("END PUSHUP\n") > last_processed_len:
        # New pushup detected
        print("📊 New pushup detected. Analyzing...")

        pushup = read_latest_pushup(CSV_PATH)
        if not pushup:
            print("⚠️ Failed to read pushup data.")
            continue

        # Normalize + pad
        pushup = scaler.transform(pushup)
        pushup = pad_sequences([pushup], maxlen=MAX_TIMESTEPS, dtype='float32', padding='post', truncating='post')

        # Predict
        prediction = model.predict(pushup)
        class_id = np.argmax(prediction)
        confidence = np.max(prediction)

        if class_id == 0:
            feedback_prompt = "This was a great push-up. Explain why it is good form."
        elif class_id == 1:
            feedback_prompt = "This was an okay push-up. How can this push-up form be improved?"
        else:
            feedback_prompt = "This was a bad push-up. Give clear advice on how to improve it."

        print(f"🤖 AI says: {feedback_prompt}")
        ollama_response = query_ollama(feedback_prompt)
        print(f"🗣️ Feedback: {ollama_response}")

        speak_text(ollama_response)

        last_processed_len += 1
    else:
        print("⌛ Waiting for next pushup...")