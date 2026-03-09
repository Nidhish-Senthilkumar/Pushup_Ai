# Project Name
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
git clone https://github.com/yourusername/yourproject.git
cd yourproject
```

### 2. Install Ollama
- Method 1: Go to https://ollama.com/download 
- Method 2: Run
    ```bash
    irm https://ollama.com/install.ps1 | iex
    ```
 If one doesn't work, try the other method


### 3. Create a virtual environment (recommended)
```bash
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Install Ollama Model
```bash
ollama create your-model-name -f Ollama/Modelfile
```

### 5. Run the project
```bash
python main.py
```

## Usage
Explain what happens after they run it — stand in front of webcam, etc.

## Troubleshooting
Common errors and fixes