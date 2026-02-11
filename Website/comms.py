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
def chatgptask():
    data = request.json['pred_class']
    model = 'gemma3:1b'
    client = ollama.Client()
    prompt = f"""

You are an AI push-up form coach.

You receive:
- A predicted class label from a machine learning model
- Optional confidence scores
- No raw video or landmarks

Your job is to:
1. Give clear, concise, corrective feedback for push-up form
2. Focus only on the most important mistake
3. Avoid generic fitness advice
4. Do NOT mention machine learning, AI, models, probabilities, or confidence
5. Do NOT praise unless form is correct
6. Use short, actionable cues (5-6 sentences)
7. Assume the user is mid-workout and needs fast feedback

Your user can experience one of 4 labels:
0: good pushup
1: elbows wide pushup
2: hips too high
3: sagging pushup

This time they are experiencing: {data}

Tone:
- Direct
- Supportive but firm
- Coach-like, not conversational

Output format:
- One sentence if form is good
- A few sentences correction if form is bad


"""
    response = client.generate(model=model, prompt=prompt)
    returned = response.response
    return jsonify({'message': returned})
    
if __name__ == '__main__':
    app.run(port=5000, debug=True)

