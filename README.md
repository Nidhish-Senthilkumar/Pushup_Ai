> **New: [Cadence](spotter/README.md)**, the next version of PushBot. A real-time AI fitness coach for 13 exercises that runs entirely in the browser: live form coaching, guided workouts, a fitness test with a 4-week plan, progress tracking and an Arcade booth mode for conventions. No server, no API keys, works offline. **Try it: https://getcadence.cc** (allow the camera). To run it locally, start with `cd spotter && npm install && npm run dev`, and see [spotter/FINDINGS.md](spotter/FINDINGS.md) for a review of the original code below.

# PushBot

This is a tool designed to help users exercise more efficiently.
It works by recording the user doing a pushup, then an AI provides feedback in order for the user to improve.

## Demo

Not ready yet

## Requirements

- Python 3.11.9
- Live Server Extension On Visual Studio Code
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
ollama create pushuptrainer -f Ollama/Modelfile
```

### 6. Run the project

- Run: Website/index.html as a live server
- Run:

```bash
python Website/comms.py
```

- *Open ollama on your machine*

- Make sure live server is working before using the website

## Usage

- Click the record button on the website
- Make sure you are in frame
- Do pushups until the timer runs out
- Analyze the feedback
- Fix form until AI says "Good Pushup"
