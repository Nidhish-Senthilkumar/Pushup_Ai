from tensorflow.keras.layers import LSTM, Dense, Dropout
from scripts.functions import getAllTrainingData, testModel, createTrainingSequences
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
import tensorflow as tf
import os
os.environ['CUDA_VISIBLE_DEVICES'] = '0'

print("TensorFlow version:", tf.__version__)
print("Built with CUDA:", tf.test.is_built_with_cuda())
print("GPUs:", tf.config.list_physical_devices('GPU'))

# Set to use only GPU 0
gpus = tf.config.list_physical_devices('GPU')
print(gpus)
if gpus:
    try:
        # Make only GPU 0 visible
        tf.config.set_visible_devices(gpus[0], 'GPU')
        
        # Optional: Allow memory growth (prevents TF from hogging all VRAM)
        tf.config.experimental.set_memory_growth(gpus[0], True)
        
        print(f"Using GPU: {gpus[0]}")
    except RuntimeError as e:
        print(e)

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
    model.fit(X_lstm, y_lstm, epochs=10, batch_size=32, validation_split=0.2)

    model.save("F:\Projects\AI\Internship\Models\LSTM")

    testModel(model, scaler, 'LSTM', timestep)

trainModel()