#!/usr/bin/env python3
"""Convert the trained Keras model into smaller inference-only artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import tensorflow as tf


CLASS_INDICES = {
    "bacterial_leaf_blight": 0,
    "brown_spot": 1,
    "healthy_rice_plant": 2,
    "leaf_blast": 3,
    "random_leaf": 4,
    "random_object": 5,
}


def mib(path: Path) -> float:
    return path.stat().st_size / (1024 * 1024)


def write_tflite(model: tf.keras.Model, output_path: Path, optimize: bool) -> None:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    if optimize:
        # Dynamic-range quantization reduces weight size without needing a
        # representative image dataset. Test its predictions before deploying.
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
    output_path.write_bytes(converter.convert())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        default=Path("models/rice_resnet50_brownspot_best.h5"),
        help="Path to the original .h5 model",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("models"),
        help="Directory for converted files (default: models)",
    )
    args = parser.parse_args()

    source = args.input.resolve()
    output_dir = args.output_dir.resolve()
    if not source.is_file():
        raise SystemExit(f"Model not found: {source}")

    output_dir.mkdir(parents=True, exist_ok=True)
    inference_h5 = output_dir / "rice_resnet50_brownspot_inference.h5"
    float_tflite = output_dir / "rice_resnet50_brownspot_float32.tflite"
    dynamic_tflite = output_dir / "rice_resnet50_brownspot_dynamic.tflite"
    labels_json = output_dir / "class_indices.json"

    print(f"Loading {source} ({mib(source):.1f} MiB)...")
    model = tf.keras.models.load_model(source, compile=False)

    if tuple(model.input_shape[1:]) != (224, 224, 3):
        raise ValueError(f"Expected input (224, 224, 3), got {model.input_shape}")
    if int(model.output_shape[-1]) != len(CLASS_INDICES):
        raise ValueError(
            f"Expected {len(CLASS_INDICES)} outputs, got {model.output_shape[-1]}"
        )

    print("Saving inference-only H5...")
    model.save(inference_h5, include_optimizer=False)

    print("Converting float32 TFLite...")
    write_tflite(model, float_tflite, optimize=False)

    print("Converting dynamically quantized TFLite...")
    write_tflite(model, dynamic_tflite, optimize=True)

    labels_json.write_text(
        json.dumps(CLASS_INDICES, indent=2) + "\n", encoding="utf-8"
    )

    print("\nCreated:")
    for path in (inference_h5, float_tflite, dynamic_tflite, labels_json):
        print(f"  {path} ({mib(path):.1f} MiB)")
    print("\nUse the dynamic .tflite file only after comparing its predictions")
    print("with the original model on several known test images.")


if __name__ == "__main__":
    main()
