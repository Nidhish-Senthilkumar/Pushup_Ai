from keras.layers import LSTM, Dense, Dropout, Input, Normalization
from scripts.functions import getAllTrainingData, testModel, createTrainingSequences
from keras.models import Sequential
import numpy as np

def trainModel():
    trainingData = getAllTrainingData("./data/TRAINING_SET")
    timestep = 30
    features = 4

    X = trainingData.iloc[:, :-1].values

    y = trainingData.iloc[:, -1].values

    X_train, y_train = createTrainingSequences(X, y, timestep)

    norm_layer = Normalization(axis=-1)

    print(np.unique(y_train, return_counts=True))

    indices = np.arange(X_train.shape[0])
    np.random.shuffle(indices)

    X_train = X_train[indices]
    y_train = y_train[indices]

    split = int(0.8 * len(X_train))
    X_val, y_val = X_train[split:], y_train[split:]
    X_train, y_train = X_train[:split], y_train[:split]

    norm_layer.adapt(X)
    
    model = Sequential([
        Input(shape=(timestep, features)),
        norm_layer,
        LSTM(64, return_sequences=False),
        Dropout(0.3),
        Dense(8, activation="relu"),
        Dropout(0.3),
        Dense(4, activation='softmax')
    ])

    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(X_train, y_train, epochs=20, batch_size=32, validation_data=(X_val, y_val), shuffle=True)

    path_to_save = r'F:\Projects\AI\Internship\Models\LSTM\LSTMModel\model.keras'
    website_path = r'F:\Projects\AI\Internship\Website\model\model.keras'
    model.save(path_to_save)
    model.save(website_path)

trainModel()