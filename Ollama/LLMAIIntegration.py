import ollama

client = ollama.Client()

model = 'gemma3:1b'
prompt= 'hello world'

response = client.generate(model=model, prompt=prompt)

print(response.response)
