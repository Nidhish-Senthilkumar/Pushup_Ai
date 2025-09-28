import csv 
import numpy as np
from keras.preprocessing.sequence import pad_sequences
from keras.utils import to_categorical
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import LSTM, Dense

#

# --- 1️⃣ Parameters ---
MAX_TIMESTEPS = 30  # pad/truncate each pushup to this length
NUM_CLASSES = 3     # 0=good, 1=medium, 2=bad (adjust if needed)
EPOCHS = 20
BATCH_SIZE = 16

# --- 2️⃣ Load CSV and prepare sequences ---
pushup_sequences = []
labels = []
current_sequence = []

with open("ML/good_pushup_data.csv", "r") as f:
    reader = csv.reader(f)
    for row in reader:
        if row[0] == "END PUSHUP":
            if current_sequence:
                pushup_sequences.append(current_sequence)
                labels.append(current_label)
                current_sequence = []

        else:
            try:
                features = [float(x) for x in row[:-1]]  # all except last column
                current_label = int(float(row[-1]))      # last column is label
                current_sequence.append(features)
            except ValueError:
                continue

# Add last sequence if no END PUSHUP at end
if current_sequence:
    pushup_sequences.append(current_sequence)
    labels.append(current_label)

# --- 3️⃣ Normalize features ---
all_features = np.vstack(pushup_sequences)
scaler = MinMaxScaler()
scaler.fit(all_features)

normalized_sequences = [scaler.transform(seq) for seq in pushup_sequences]

# --- 4️⃣ Pad sequences ---
X = pad_sequences(normalized_sequences, maxlen=MAX_TIMESTEPS, dtype='float32', padding='post', truncating='post')

# --- 5️⃣ One-hot encode labels ---
y = to_categorical(labels, num_classes=NUM_CLASSES)

# --- 6️⃣ Build LSTM model ---
num_features = X.shape[2]

model = Sequential()
model.add(LSTM(64, input_shape=(MAX_TIMESTEPS, num_features), return_sequences=False))
model.add(Dense(32, activation='relu'))
model.add(Dense(NUM_CLASSES, activation='softmax'))

model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
model.summary()

# --- 7️⃣ Train model ---
model.fit(X, y, epochs=EPOCHS, batch_size=BATCH_SIZE, validation_split=0.1)

model.predict()
# 76