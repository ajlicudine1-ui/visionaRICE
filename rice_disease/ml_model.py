import os
import tensorflow as tf

model = None

def load_model():
    global model
    if model is None:
        model_path = os.environ.get("MODEL_PATH", "ml_models/rice_model.h5")
        print(f"Loading model from {model_path} ...")
        model = tf.keras.models.load_model(model_path)
    return model
