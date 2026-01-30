from keras.layers import LSTM, Dense, Dropout
from scripts.functions import getAllTrainingData, testModel, createTrainingSequences
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
import tensorflow as tf

def trainModel():
    trainingData = getAllTrainingData("./data/fake_training_data")
    timestep = 150
    features = 7

    X = trainingData.iloc[:, :-1].values

    y = trainingData.iloc[:, -1].values

    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)

    X_lstm, y_lstm = createTrainingSequences(X_scaled, y, timestep)
    
    model = Sequential([
        LSTM(64, input_shape=(timestep, features), return_sequences=False),
        Dropout(0.3),
        Dense(8, activation="relu"),
        Dropout(0.3),
        Dense(1)
    ])

    model.compile(optimizer='adam', loss='mse')
    model.fit(X_lstm, y_lstm, epochs=4, batch_size=32, validation_split=0.2)

    model.save("F:\Projects\AI\Internship\Models\LSTM")

    testModel(model, scaler, 'LSTM', timestep)

trainModel()