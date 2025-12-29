import os
import glob
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import pandas as pd

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

def trainModel():
    trainingData = getAllTrainingData('data/fake_training_data')
    trainingData.dropna()

    X = trainingData.iloc[:,:-1]
    y = trainingData.iloc[:,-1]

    x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = MinMaxScaler()

    X_train_scaled = scaler.fit_transform(x_train)
    X_test_scaled = scaler.transform(x_test)

    model = LogisticRegression(
        multi_class='multinomial',
        solver='saga',
        max_iter=1000,
        random_state=42
    )

    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"Model Accuracy: {accuracy*100}%")

    file_total_accuracy = []

    for i in range(500):
        file_test = pd.read_csv(f"./data/fake_test_data/test_data{i}.csv")
        file_X = file_test.iloc[:,:-1]
        file_y = file_test.iloc[:,-1]
        file_X_scaled = scaler.transform(file_X)
        file_pred = model.predict(file_X_scaled)
        file_accuracy = accuracy_score(file_y, file_pred)
        print(f"File Number {i} accuracy: {file_accuracy}")
        file_total_accuracy.append(file_accuracy)

    file_total_accuracy_perc = sum(file_total_accuracy) / len(file_total_accuracy)
    print(f"Total File Accuracy: {file_total_accuracy_perc*100}")
        
trainModel()