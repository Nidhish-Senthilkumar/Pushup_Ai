import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

# --- Fake data for demonstration ---
# 100 pushups (samples), each with 20 frames (timesteps)
# Each frame has 6 features (e.g., x,y,z coordinates of 2 landmarks)
X = np.random.rand(100, 20, 6)  # random float numbers between 0 and 1

# Labels for each pushup (3 classes: 0=good, 1=back too high, 2=elbows flared)
y = np.random.randint(0, 3, size=(100,))  # integer labels for classification

# One-hot encode labels so the network can use categorical crossentropy
# Converts label 0 → [1,0,0], 1 → [0,1,0], 2 → [0,0,1]
from tensorflow.keras.utils import to_categorical
y = to_categorical(y, num_classes=3)

# --- Build the LSTM model ---
model = Sequential([  
    # LSTM layer with 32 memory units
    # input_shape=(timesteps, features) = (20 frames, 6 features per frame)
    LSTM(32, input_shape=(20, 6)),  

    # Fully connected layer with 16 neurons, ReLU activation
    # Helps model learn complex patterns after LSTM
    Dense(16, activation='relu'),  

    # Output layer with 3 neurons (one per class) and softmax activation
    # Produces probabilities for each pushup class
    Dense(3, activation='softmax')  
])

# Compile the model
# optimizer='adam' → popular adaptive optimizer
# loss='categorical_crossentropy' → standard for multi-class classification
# metrics=['accuracy'] → track accuracy during training
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# --- Train the model ---
# X = input sequences, y = one-hot labels
# epochs=10 → number of times to go through the dataset
# batch_size=8 → number of sequences processed at once before updating weights
model.fit(X, y, epochs=100, batch_size=8)
