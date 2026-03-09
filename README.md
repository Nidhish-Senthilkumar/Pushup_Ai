# PushBot

This is a tool designed to help users exercise more efficiently.
It works by recording the user doing a pushup, then an AI provides feedback in order for the user to improve.

## Demo

Not ready yet

## Requirements

- Python 3.11.9
- Webcam

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Nidhish-Senthilkumar/Pushup_Ai
cd Pushup_Ai
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Install Ollama

- Method 1: Go to https://ollama.com/download
- Method 2: Run
  ```bash
  irm https://ollama.com/install.ps1 | iex
  ```

### 5. Install Ollama Model

```bash
ollama create your-model-name -f Ollama/Modelfile
```

### 6. Run the project

- Run: Website/index.html as a live server
- Run:

```bash
python Website/comms.py
```

- Make sure live server is working before using the website

## Usage

- Click the record button on the website
- Make sure you are in frame
- Do pushups until the timer runs out
- Analyze the feedback
- Fix form until AI says "Good Pushup"
