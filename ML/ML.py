import os
import glob
import joblib
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

def calc_avg_accuracy(var):
    return sum(var) / len(var)

def testModel(model, scaler):
    file_total_accuracy = []
    good_pushup_accuracy = []
    elbows_wide_pushup_accuracy = []
    hips_high_accuracy = []
    knees_sagging_accuracy = []

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

        print(f"File Number {i} accuracy: {file_accuracy}")
        file_total_accuracy.append(file_accuracy)

    file_total_accuracy_perc = calc_avg_accuracy(file_total_accuracy)
    good_pushup_accuracy_perc = calc_avg_accuracy(good_pushup_accuracy)
    elbows_wide_pushup_accuracy_perc = calc_avg_accuracy(elbows_wide_pushup_accuracy)
    hips_high_accuracy_perc = calc_avg_accuracy(hips_high_accuracy)
    knees_sagging_accuracy_perc = calc_avg_accuracy(knees_sagging_accuracy)

    print(f"Total File Accuracy: {file_total_accuracy_perc*100:.2f}%")
    print(f"Good Pushup Accuracy: {good_pushup_accuracy_perc*100:.2f}%")
    print(f"Elbows Wide Pushup Accuracy: {elbows_wide_pushup_accuracy_perc*100:.2f}%")
    print(f"Hips High Accuracy: {hips_high_accuracy_perc*100:.2f}%")
    print(f"Knee Pushup Accuracy: {knees_sagging_accuracy_perc*100:.2f}%")

    return file_total_accuracy_perc, good_pushup_accuracy_perc, elbows_wide_pushup_accuracy_perc, hips_high_accuracy_perc, knees_sagging_accuracy_perc


def trainModel():
    pd.set_option('display.max_rows', None)
    trainingData = getAllTrainingData('./data/fake_training_data')

    X = trainingData.iloc[:,:-1]
    y = trainingData.iloc[:,-1]

    x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = MinMaxScaler()

    X_train_scaled = scaler.fit_transform(x_train)
    X_test_scaled = scaler.transform(x_test)

    model = LogisticRegression(
        solver='lbfgs',
        max_iter=1000,
        random_state=67
    )

    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"Model Accuracy: {accuracy*100}%")

    joblib.dump(model, 'F:\Projects\AI\Internship\Models\LogisticRegression\model.pkl')
    joblib.dump(scaler, 'F:\Projects\AI\Internship\Models\LogisticRegression\scaler.pkl')

    print("-----------------------------------------------------------------")
    print("-----------------------------------------------------------------")
    print("-----------------------------------------------------------------")

    testModel(model, scaler)

trainModel()