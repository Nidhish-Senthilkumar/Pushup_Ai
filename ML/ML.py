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
    """Load sequences from a single CSV. Last column of the last row in a sequence is the label."""
    pushup_sequences = []
    labels = []
    current_sequence = []
    current_label = None

    with open(path, "r", newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            if row[0] == "END PUSHUP":
                if current_sequence:
                    pushup_sequences.append(current_sequence)
                    labels.append(current_label)
                    current_sequence = []
                    current_label = None
            else:
                try:
                    features = [float(x) for x in row[:-1]]  # all except last column
                    current_label = int(float(row[-1]))      # last column is label
                    current_sequence.append(features)
                except ValueError:
                    # skip malformed row
                    continue

    # append last sequence if file does not end with END PUSHUP
    if current_sequence:
        pushup_sequences.append(current_sequence)
        labels.append(current_label)

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
    if arr.ndim != 2:
        raise ValueError("Input sequence must be 2D (timesteps, features)")
    if arr.shape[1] != scaler.scale_.shape[0]:
        raise ValueError(f"Feature dim mismatch: input {arr.shape[1]} vs scaler {scaler.scale_.shape[0]}")
    norm = scaler.transform(arr)
    padded = pad_sequences([norm], maxlen=max_timesteps, dtype='float32', padding='post', truncating='post')
    return padded


def process_all_data(dir_path="data", max_timesteps=MAX_TIMESTEPS, num_classes=None):
    """Load all CSVs, fit scaler, normalize, pad, and one-hot labels.
    Returns: X, y, scaler, sources (list of filenames per sample), class_count
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

    if num_classes is None:
        num_classes = int(labels_arr.max()) + 1

    if labels_arr.min() < 0 or labels_arr.max() >= num_classes:
        raise ValueError(f"Labels must be in range 0..{num_classes-1}, found min={labels_arr.min()} max={labels_arr.max()}")

    y = np.eye(num_classes, dtype=int)[labels_arr]
    return X, y, scaler, sources, num_classes


def build_model(max_timesteps, num_features, num_classes):
    model = Sequential()
    model.add(LSTM(64, input_shape=(max_timesteps, num_features), return_sequences=False))
    model.add(Dense(32, activation='relu'))
    model.add(Dense(num_classes, activation='softmax'))
    model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
    return model


def predict_and_report(model, X, sources, class_names=None):
    """Predict on X and print per-file prediction summaries. Returns preds and predicted_classes."""
    preds = model.predict(X)
    pred_classes = np.argmax(preds, axis=1)

    # aggregate by source file
    summary = {}
    for src, pc in zip(sources, pred_classes):
        summary.setdefault(src, []).append(int(pc))

    print("\nPrediction summary by file:")
    for src, pcs in summary.items():
        vals, counts = np.unique(pcs, return_counts=True)
        counts_dict = dict(zip(vals.tolist(), counts.tolist()))
        print(f" {src}: samples={len(pcs)}, predicted_counts={counts_dict}")

    return preds, pred_classes


def save_scaler(scaler, path):
    joblib.dump(scaler, path)


def load_scaler(path):
    return joblib.load(path)


if __name__ == "__main__":
    model_path = "model_trained.h5"
    scaler_path = "scaler.save"

    # always load raw sequences (no scaler) so we can prepare X for either predict or train
    seqs, labels, sources = load_all_csvs("data")

    if os.path.exists(model_path) and os.path.exists(scaler_path):
        print("Found saved model and scaler — loading for prediction")
        model = load_model(model_path)
        scaler = load_scaler(scaler_path)

        # normalize using the loaded scaler and predict
        normalized = normalize_sequences(seqs, scaler)
        X = pad_sequences(normalized, maxlen=MAX_TIMESTEPS, dtype='float32', padding='post', truncating='post')
        preds, pred_classes = predict_and_report(model, X, sources)

    else:
        print("No saved model/scaler found — training a new model on all data")
        # process_all_data fits a scaler, creates X and one-hot y
        X, y, scaler, sources, num_classes = process_all_data("data", max_timesteps=MAX_TIMESTEPS, num_classes=None)
        num_features = X.shape[2]

        model = build_model(MAX_TIMESTEPS, num_features, num_classes)
        model.summary()

        model.fit(X, y, epochs=EPOCHS, batch_size=BATCH_SIZE, validation_split=0.1)

        # save for next run and predict on the combined data
        model.save(model_path)
        save_scaler(scaler, scaler_path)

        preds, pred_classes = predict_and_report(model, X, sources)