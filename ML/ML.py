import csv
import os
import glob
import joblib
import numpy as np
from keras.preprocessing.sequence import pad_sequences
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import LSTM, Dense
from keras.models import load_model

# --- Parameters (tweak as needed) ---
MAX_TIMESTEPS = 50
EPOCHS = 20
BATCH_SIZE = 16


def load_sequences_from_csv(path):
    """Load sequences from a single CSV. Supports two formats:
    - one timestep per CSV row: [feat1, feat2, ..., featN, label]
    - many timesteps flattened in one CSV row: [idx, f1, f2, f3, lbl, idx, f1, f2, f3, lbl, ...]
    The sequence label is taken from the last frame's label in the sequence.
    """
    pushup_sequences = []
    labels = []
    current_sequence = []
    current_label = None

    with open(path, "r", newline='') as f:
        reader = csv.reader(f)
        for row in reader:

            if row[0].strip() == "END PUSHUP":
                pushup_sequences.append(current_sequence)
                labels.append(current_label)
                current_sequence = []
                current_label = None
                continue

            features = [float(x) for x in row[:-1]]
            label = int(float(row[-1]))
            current_sequence.append(features)
            current_label = label
                
    # append last sequence if file doesn't end with END PUSHUP
    if current_sequence and current_label is not None:
        pushup_sequences.append(current_sequence)
        labels.append(current_label)
    print(labels)

    return pushup_sequences, labels


def load_all_csvs(dir_path="data", pattern="*.csv"):
    """Load every CSV in dir_path and return sequences, labels, and source file per sample."""
    all_seqs = []
    all_labels = []
    all_sources = []
    files = sorted(glob.glob(os.path.join(dir_path, pattern)))
    if not files:
        raise FileNotFoundError(f"No CSV files found in {dir_path}")
    for fp in files:
        seqs, labels = load_sequences_from_csv(fp)
        if seqs:
            all_seqs.extend(seqs)
            all_labels.extend(labels)
            all_sources.extend([os.path.basename(fp)] * len(seqs))
    return all_seqs, all_labels, all_sources


def fit_scaler(pushup_sequences, feature_range=(0, 1)):
    """Fit a MinMaxScaler on stacked features of all sequences."""
    if not pushup_sequences:
        raise ValueError("No sequences provided to fit scaler")
    all_features = np.vstack([np.array(s) for s in pushup_sequences])
    scaler = MinMaxScaler(feature_range=feature_range)
    scaler.fit(all_features)
    return scaler


def normalize_sequences(pushup_sequences, scaler):
    """Apply fitted scaler to each sequence and return list of numpy arrays."""
    return [scaler.transform(np.array(seq)) for seq in pushup_sequences]

def normalize_single_sequence(sequence, scaler, max_timesteps=MAX_TIMESTEPS):
    """Normalize a single sequence and pad it to model input shape."""
    arr = np.array(sequence)
    norm = scaler.transform(arr)
    padded = pad_sequences([norm], maxlen=max_timesteps, dtype='float32', padding='post', truncating='post')
    return padded


def process_all_data(dir_path="data", max_timesteps=MAX_TIMESTEPS, num_classes=None):
    """Load all CSVs, fit scaler, normalize, pad, and one-hot labels.
    Returns: X, y, scaler, sources, num_classes, label_map
    """
    seqs, labels, sources = load_all_csvs(dir_path)
    if not seqs:
        raise ValueError("No sequences found in data folder")

    scaler = fit_scaler(seqs)
    normalized = normalize_sequences(seqs, scaler)
    X = pad_sequences(normalized, maxlen=max_timesteps, dtype='float32', padding='post', truncating='post')

    labels_arr = np.array(labels, dtype=int)
    if labels_arr.size == 0:
        raise ValueError("No labels found to convert to one-hot")

    # remap original labels to consecutive 0..K-1
    unique = np.unique(labels_arr)
    label_map = {int(old): int(i) for i, old in enumerate(unique)}  # e.g. {2:0,3:1,5:2}
    labels_mapped = np.array([label_map[int(x)] for x in labels_arr], dtype=int)

    # determine num_classes from mapping if not provided
    if num_classes is None:
        num_classes = len(unique)

    if labels_mapped.min() < 0 or labels_mapped.max() >= num_classes:
        raise ValueError(f"Mapped labels must be in range 0..{num_classes-1}, found min={labels_mapped.min()} max={labels_mapped.max()}")

    y = np.eye(num_classes, dtype=int)[labels_mapped]
    return X, y, scaler, sources, num_classes, label_map


def build_model(max_timesteps, num_features, num_classes):
    model = Sequential()
    model.add(LSTM(64, input_shape=(max_timesteps, num_features), return_sequences=False))
    model.add(Dense(32, activation='relu'))
    model.add(Dense(num_classes, activation='softmax'))
    model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
    return model


def save_scaler(scaler, path):
    joblib.dump(scaler, path)

def load_scaler(path):
    return joblib.load(path)

def load_pred_sequences_from_csv(path):

    current_sequence = []

    sequences = []

    with open(path, 'r') as f:
        reader = csv.reader(f)

        for row in reader:
            if (row[0].strip() == "END PUSHUP"):
                sequences.append(current_sequence)
                current_sequence = []
                continue
        
            features = [float(x) for x in row[:-1]]
            current_sequence.append(features)

    return sequences


if __name__ == "__main__":
    model_path = "model_trained.h5"
    scaler_path = "scaler.save"
    label_map_path = "label_map.save"

    

    if os.path.exists(model_path) and os.path.exists(scaler_path) and os.path.exists(label_map_path):

        print("Found saved model/scaler/label_map — loading for prediction")
        model = load_model(model_path)
        scaler = load_scaler(scaler_path)
        label_map = joblib.load(label_map_path)

        pred_sequences = load_pred_sequences_from_csv("data\\test_pushup")
        norm_csv = normalize_sequences(pred_sequences, scaler)

        X = pad_sequences(norm_csv, maxlen=MAX_TIMESTEPS, dtype='float32', padding='post', truncating='post')

        predictions = model.predict(X)

        print(np.argmax(predictions))
    else:
        seqs, labels, sources = load_all_csvs("data")
        print("No saved model/scaler/label_map found — training a new model on all data")
        X, y, scaler, sources, num_classes, label_map = process_all_data("data", max_timesteps=MAX_TIMESTEPS, num_classes=None)
        num_features = X.shape[2]

        model = build_model(MAX_TIMESTEPS, num_features, num_classes)
        model.summary()

        model.fit(X, y, epochs=EPOCHS, batch_size=BATCH_SIZE, validation_split=0.1)

        model.save(model_path)
        save_scaler(scaler, scaler_path)
        joblib.dump(label_map, label_map_path)


