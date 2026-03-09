from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from google import genai
import ollama

app = Flask(__name__)
CORS(app)

model = tf.keras.models.load_model(r'Website\model\model.keras')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json['features']
    input_data = np.array(data).reshape(-1, 30, 4)
    pred = model.predict(input_data)

    pred_arr = np.mean(pred, axis=0)

    predclass = int(np.argmax(pred_arr))

    print(f"\n Predicted Array: {pred_arr} \n")

    return jsonify({
        'class': predclass,
        'label': ['Good', 'Elbows Wide', 'Hips High', 'Sagging'][predclass]
    })

@app.route('/askai', methods=['POST'])
def ollamarequest():
    data = request.json['pred_class']
    model = 'pushuptrainer'
    client = ollama.Client()
    prompt = data
    response = client.generate(model=model, prompt=prompt)
    returned = response.response
    return jsonify({'message': returned})
    
if __name__ == '__main__':
    app.run(port=5000, debug=True)

