import sys
from unittest.mock import MagicMock

# Mock the missing module to bypass import error
m = MagicMock()
m.__version__ = "0.0.0"
sys.modules['tensorflow_decision_forests'] = m

import tensorflowjs as tfjs
import tensorflow as tf

print("TF Version:", tf.__version__)
output_dir = './Website/tfjs_model'

try:
    tfjs.converters.convert_tf_saved_model(
        './models/LSTM',
        output_dir,
        signature_def='serving_default',
        saved_model_tags='serve'
    )
    print("Conversion success!")
except Exception as e:
    print("Conversion failed:", e)
