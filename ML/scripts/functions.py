from sklearn.preprocessing import MinMaxScaler
import pandas as pd
import glob
import os
from sklearn.metrics import accuracy_score
import numpy as np

def createTrainingSequences(X, y, timestep):
    X_lstm = []
    y_lstm = []

    for i in range(len(X) - timestep):
        X_lstm.append(X[i: i+timestep])
        y_lstm.append(y[i+timestep])
    
    return np.array(X_lstm), np.array(y_lstm)


def getCSVDataFromFile(filename):
    df = pd.read_csv(filename, header=None)
    return df

def getAllTrainingData(folder):
    data = []
    for file in glob.glob(os.path.join(folder, "*.csv")):
        trainingData = getCSVDataFromFile(file)
        data.append(trainingData)
    combined_df = pd.concat(data, ignore_index=True)
    return combined_df

def normalizeData(data):
    scaled_data = MinMaxScaler(feature_range=[0,1]).fit_transform(data)
    return scaled_data

def calc_avg_accuracy(var):
    return sum(var) / len(var)

def testModel(model, scaler, modelType, timestep):
    file_total_accuracy = []
    good_pushup_accuracy = []
    elbows_wide_pushup_accuracy = []
    hips_high_accuracy = []
    knees_sagging_accuracy = []

    if (modelType == 'LogRegression'):
        for i in range(500):
            file_test = pd.read_csv(f"./data/fake_test_data/test_data{i}.csv", header=None)
            file_X = file_test.iloc[:,:-1]
            file_y = file_test.iloc[:,-1]
            
            file_X_scaled = scaler.transform(file_X)

            file_pred = model.predict(file_X_scaled)

            file_accuracy = accuracy_score(file_y, file_pred)

            if file_y[0] == 0:
                good_pushup_accuracy.append(file_accuracy)
            elif file_y[0] == 1:
                elbows_wide_pushup_accuracy.append(file_accuracy)
            elif file_y[0] == 2:
                hips_high_accuracy.append(file_accuracy)
            elif file_y[0] == 3:
                knees_sagging_accuracy.append(file_accuracy)

            print(f"File Number {i} accuracy: {file_accuracy*100:.2f}%")
            file_total_accuracy.append(file_accuracy)
    elif (modelType == 'LSTM'):
        for i in range(500):
            # Inside your loop:
            file_test = pd.read_csv(f"./data/fake_test_data/test_data{i}.csv", header=None)
            file_X = file_test.iloc[:,:-1]
            file_y = file_test.iloc[:,-1]

            file_X_scaled = scaler.transform(file_X)

            file_x_lstm, file_y_lstm = createTrainingSequences(file_X_scaled, file_y, timestep)

            # Get predictions
            predictions = model.predict(file_x_lstm)

            # Convert predictions to class labels
            # Assuming your model outputs continuous values, round or use argmax
            predicted_classes = np.round(predictions).flatten().astype(int)  # For single output
            # OR if multi-class: predicted_classes = np.argmax(predictions, axis=1)

            # Calculate accuracy
            file_accuracy = accuracy_score(file_y_lstm, predicted_classes)

            # Get the most common class in this file for categorization
            most_common_class = int(file_y_lstm[0])  # Or use file_y_lstm[0] if all same

            if most_common_class == 0:
                good_pushup_accuracy.append(file_accuracy)
            elif most_common_class == 1:
                elbows_wide_pushup_accuracy.append(file_accuracy)
            elif most_common_class == 2:
                hips_high_accuracy.append(file_accuracy)
            elif most_common_class == 3:
                knees_sagging_accuracy.append(file_accuracy)

            print(f"File Number {i} accuracy: {file_accuracy*100:.2f}%")
            file_total_accuracy.append(file_accuracy)

    file_total_accuracy_perc = calc_avg_accuracy(file_total_accuracy)
    good_pushup_accuracy_perc = calc_avg_accuracy(good_pushup_accuracy)
    elbows_wide_pushup_accuracy_perc = calc_avg_accuracy(elbows_wide_pushup_accuracy)
    hips_high_accuracy_perc = calc_avg_accuracy(hips_high_accuracy)
    knees_sagging_accuracy_perc = calc_avg_accuracy(knees_sagging_accuracy)
    print("-----------------------------------------------------------------")
    print(f"Total File Accuracy: {file_total_accuracy_perc*100:.2f}%")
    print(f"Good Pushup Accuracy: {good_pushup_accuracy_perc*100:.2f}%")
    print(f"Elbows Wide Pushup Accuracy: {elbows_wide_pushup_accuracy_perc*100:.2f}%")
    print(f"Hips High Accuracy: {hips_high_accuracy_perc*100:.2f}%")
    print(f"Knee Pushup Accuracy: {knees_sagging_accuracy_perc*100:.2f}%")
    print("-----------------------------------------------------------------")
    return file_total_accuracy_perc, good_pushup_accuracy_perc, elbows_wide_pushup_accuracy_perc, hips_high_accuracy_perc, knees_sagging_accuracy_perc
