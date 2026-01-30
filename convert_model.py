import sys
from unittest.mock import MagicMock

# Completely mock tensorflow_decision_forests before any imports
print("Setting up mocks for tensorflow_decision_forests...")
sys.modules['tensorflow_decision_forests'] = MagicMock()
sys.modules['tensorflow_decision_forests.keras'] = MagicMock()
sys.modules['tensorflow_decision_forests.tensorflow'] = MagicMock()
sys.modules['tensorflow_decision_forests.tensorflow.ops'] = MagicMock()
sys.modules['tensorflow_decision_forests.tensorflow.ops.inference'] = MagicMock()
sys.modules['tensorflow_decision_forests.tensorflow.ops.inference.api'] = MagicMock()
sys.modules['tensorflow_decision_forests.tensorflow.ops.inference.op'] = MagicMock()

print("Importing TensorFlow and TensorFlowJS...")
import tensorflow as tf
import tensorflowjs as tfjs
import os

print(f"TensorFlow Version: {tf.__version__}")

# Configuration
model_path = './models/LSTM'
output_dir = './Website/tfjs_model'

# Verify model exists
if not os.path.exists(model_path):
    print(f"ERROR: Model path '{model_path}' does not exist!")
    sys.exit(1)

# Create output directory
os.makedirs(output_dir, exist_ok=True)

print(f"\nConverting model from: {model_path}")
print(f"Output directory: {output_dir}")

try:
    tfjs.converters.convert_tf_saved_model(
        model_path,
        output_dir,
        signature_def='serving_default',
        saved_model_tags='serve'
    )
    
    print("\n✓ Conversion successful!")
    print(f"\nGenerated files in {output_dir}:")
    for file in os.listdir(output_dir):
        file_path = os.path.join(output_dir, file)
        size = os.path.getsize(file_path)
        print(f"  - {file} ({size:,} bytes)")
        
except Exception as e:
    print("\n✗ Conversion failed!")
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)