import csv
import numpy as np
from keras.preprocessing.sequence import pad_sequences
from keras.models import Sequential
from keras.layers import LSTM, Dense
from keras.utils import to_categorical

# --- 1️⃣ Parameters ---
MAX_TIMESTEPS = 30  # maximum frames per pushup (pad/truncate to this)
NUM_CLASSES = 3     # 0=good, 1=back too high, 2=elbows flared

# --- 2️⃣ Read CSV and split sequences ---
pushup_sequences = []  # list to hold sequences of frames
labels = []            # corresponding pushup-level labels
current_sequence = []
current_label = None   # label for the current pushup

with open("good_pushup_data.csv", "r") as f:
    reader = csv.reader(f)
    
    for row in reader:
        if row[0] == "END_PUSHUP":
            if current_sequence:
                pushup_sequences.append(current_sequence)
                labels.append(current_label)
                current_sequence = []
                current_label = None
        else:
            # Last column is the label (integer: 0,1,2)
            current_label = int(float(row[-1]))
            # All other columns are features
            features = [float(x) for x in row[:-1]]
            current_sequence.append(features)

# If last pushup not followed by END_PUSHUP
if current_sequence:
    pushup_sequences.append(current_sequence)
    labels.append(current_label)

# --- 3️⃣ Pad sequences to same length ---
X = pad_sequences(pushup_sequences, maxlen=MAX_TIMESTEPS, dtype='float32', padding='post')

# Convert labels to one-hot
y = to_categorical(labels, num_classes=NUM_CLASSES)

print(f"Input shape: {X.shape}")  # (num_pushups, MAX_TIMESTEPS, num_features)
print(f"Labels shape: {y.shape}")

# --- 4️⃣ Build LSTM model ---
num_features = X.shape[2]  # number of features per frame

model = Sequential([
    LSTM(64, input_shape=(MAX_TIMESTEPS, num_features)),  # 64 memory units
    Dense(32, activation='relu'),
    Dense(NUM_CLASSES, activation='softmax')              # output = probability per class
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# --- 5️⃣ Train model ---
model.fit(X, y, epochs=20, batch_size=8)
