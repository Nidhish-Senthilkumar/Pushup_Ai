import joblib
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import pandas as pd
from scripts.functions import getAllTrainingData, testModel

def trainModel():
    pd.set_option('display.max_rows', None)
    trainingData = getAllTrainingData('./data/TRAINING_SET')

    X = trainingData.iloc[:,:-1]
    y = trainingData.iloc[:,-1]

    x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    scaler = MinMaxScaler()

    X_train_scaled = scaler.fit_transform(x_train)
    X_test_scaled = scaler.transform(x_test)

    model = LogisticRegression(
        solver='lbfgs',
        max_iter=100000,
    )

    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)

    print("-----------------------------------------------------------------")
    print(f"Model Accuracy: {accuracy*100}%")
    print("-----------------------------------------------------------------")

    joblib.dump(model, 'F:\Projects\AI\Internship\Models\LogisticRegression\model.pkl')
    joblib.dump(scaler, 'F:\Projects\AI\Internship\Models\LogisticRegression\scaler.pkl')
trainModel()