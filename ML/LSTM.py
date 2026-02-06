from keras.layers import LSTM, Dense, Dropout
from scripts.functions import getAllTrainingData, testModel, createTrainingSequences
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential

def trainModel():
    trainingData = getAllTrainingData("./data/TRAINING_SET")
    timestep = 30
    features = 5

    X = trainingData.iloc[:, :-1].values

    y = trainingData.iloc[:, -1].values

    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)

    X_lstm, y_lstm = createTrainingSequences(X_scaled, y, timestep)

    print(f"\n\n\n{X_lstm}\n\n\n")
    print(f"\n\n\n{y_lstm}\n\n\n")
    
    model = Sequential([
        LSTM(64, input_shape=(timestep, features), return_sequences=False),
        Dropout(0.3),
        Dense(8, activation="relu"),
        Dropout(0.3),
        Dense(4, activation='softmax')
    ])

    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(X_lstm, y_lstm, epochs=7, batch_size=32, validation_split=0.2)

    path_to_save = r'F:\Projects\AI\Internship\Models\LSTM\LSTMModel\model.keras'
    model.save(path_to_save)

trainModel()