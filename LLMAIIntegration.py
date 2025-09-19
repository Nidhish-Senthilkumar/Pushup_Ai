import requests
import pyttsx3

def query_ollama(prompt, model="llama3"):
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False  # You can set to True if you want real-time streaming
    }

    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()['response']
    else:
        raise Exception(f"Error: {response.status_code} - {response.text}")

def speak_text(text):
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()

# Example usage
user_input = input("Ask something(make sure it is very clear): ")
response = query_ollama("hi")
print(response)
speak_text(response)
