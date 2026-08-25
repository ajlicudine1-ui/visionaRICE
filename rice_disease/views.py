import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock

import numpy as np
from PIL import Image, UnidentifiedImageError

try:
    # Small inference runtime used in production on Vercel.
    from ai_edge_litert.interpreter import Interpreter
except ImportError:
    try:
        # Compatibility with older local TFLite installations.
        from tflite_runtime.interpreter import Interpreter
    except ImportError:
        # Local development fallback when only TensorFlow is installed.
        from tensorflow.lite.python.interpreter import Interpreter

from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.db.models import Count
from django.utils import timezone
from django.utils.timezone import localtime, now
from django.conf import settings

from .models import PredictionRecord, Notification
from .forms import ProfileForm
from .utils import update_highest_predicted_disease, create_user_prediction_notification

# === Logging Setup ===
logger = logging.getLogger(__name__)

# === Paths ===
MODEL_PATH = Path(settings.BASE_DIR) / "models" / "rice_resnet50_brownspot_dynamic.tflite"
CLASS_INDICES_PATH = Path(settings.BASE_DIR) / "models" / "class_indices.json"
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000

DEFAULT_CLASS_INDICES = {
    "bacterial_leaf_blight": 0,
    "brown_spot": 1,
    "healthy_rice_plant": 2,
    "leaf_blast": 3,
    "random_leaf": 4,
    "random_object": 5,
}

# === Load Classes & Build Index Mapping ===
try:
    with CLASS_INDICES_PATH.open("r", encoding="utf-8") as f:
        class_indices = json.load(f)
    index_to_class = {int(index): name for name, index in class_indices.items()}
except (OSError, ValueError, TypeError, json.JSONDecodeError):
    logger.warning(
        "Could not load %s; using the built-in class mapping.",
        CLASS_INDICES_PATH,
    )
    class_indices = DEFAULT_CLASS_INDICES
    index_to_class = {
        int(index): name for name, index in class_indices.items()
    }

# === Cache the TFLite interpreter after first load ===
_interpreter = None
_input_detail = None
_output_detail = None
_model_load_lock = Lock()
_prediction_lock = Lock()


def get_interpreter():
    global _interpreter, _input_detail, _output_detail

    if _interpreter is None:
        with _model_load_lock:
            if _interpreter is None:
                try:
                    if not MODEL_PATH.is_file():
                        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

                    interpreter = Interpreter(
                        model_path=str(MODEL_PATH),
                        num_threads=2,
                    )
                    interpreter.allocate_tensors()

                    input_details = interpreter.get_input_details()
                    output_details = interpreter.get_output_details()
                    if len(input_details) != 1 or len(output_details) != 1:
                        raise ValueError(
                            "The model must have exactly one input and one output."
                        )

                    input_shape = tuple(int(v) for v in input_details[0]["shape"])
                    output_shape = tuple(int(v) for v in output_details[0]["shape"])
                    if input_shape != (1, 224, 224, 3):
                        raise ValueError(f"Unexpected model input shape: {input_shape}")
                    if output_shape[-1] != len(index_to_class):
                        raise ValueError(f"Unexpected model output shape: {output_shape}")

                    _input_detail = input_details[0]
                    _output_detail = output_details[0]
                    _interpreter = interpreter
                    logger.info("Rice-disease TFLite model loaded successfully")
                except Exception:
                    logger.exception("Failed to load model from %s", MODEL_PATH)
                    _interpreter = None
                    _input_detail = None
                    _output_detail = None

    return _interpreter


def prepare_interpreter_input(image_array):
    """Cast or quantize a normalized image for the model input tensor."""
    dtype = np.dtype(_input_detail["dtype"])
    if np.issubdtype(dtype, np.integer):
        scale, zero_point = _input_detail["quantization"]
        if not scale:
            raise ValueError("Invalid input quantization parameters.")
        limits = np.iinfo(dtype)
        image_array = np.rint(image_array / scale + zero_point)
        return np.clip(image_array, limits.min, limits.max).astype(dtype)
    return image_array.astype(dtype, copy=False)


def read_interpreter_output():
    """Read and, when needed, dequantize the prediction tensor."""
    output = _interpreter.get_tensor(_output_detail["index"])
    dtype = np.dtype(_output_detail["dtype"])
    if np.issubdtype(dtype, np.integer):
        scale, zero_point = _output_detail["quantization"]
        if not scale:
            raise ValueError("Invalid output quantization parameters.")
        output = (output.astype(np.float32) - zero_point) * scale
    return np.asarray(output, dtype=np.float32)


@login_required
def index(request):
    user = request.user
    records = PredictionRecord.objects.filter(user=user)

    # ==========================================================
    # PROFILE / PASSWORD FORMS
    # ==========================================================
    profile_form = ProfileForm(instance=user)
    password_form = PasswordChangeForm(user=user)

    if request.method == "POST":
        if "old_password" in request.POST:
            password_form = PasswordChangeForm(
                user=user,
                data=request.POST
            )

            if password_form.is_valid():
                user = password_form.save()
                update_session_auth_hash(request, user)
                messages.success(
                    request,
                    "Password updated successfully!"
                )
                return redirect("index")

            messages.error(
                request,
                "Please correct the errors below."
            )

        else:
            profile_form = ProfileForm(
                request.POST,
                request.FILES,
                instance=user
            )

            if profile_form.is_valid():
                profile_form.save()
                messages.success(
                    request,
                    "Profile updated successfully!"
                )
                return redirect("index")

            messages.error(
                request,
                "Please correct the errors in your profile form."
            )

    # Evaluate once because the same records are used by several
    # dashboard calculations below.
    record_list = list(
        records.order_by("-created_at")
    )

    # ==========================================================
    # LOCAL DATE / KPI CARDS
    # ==========================================================
    local_today = localtime(now()).date()

    todays_scans = sum(
        1
        for record in record_list
        if localtime(record.created_at).date() == local_today
    )

    total_predictions = len(record_list)

    confidence_values = [
        float(record.confidence)
        for record in record_list
        if record.confidence is not None
    ]

    accuracy_rate = (
        round(
            sum(confidence_values) / len(confidence_values),
            2
        )
        if confidence_values
        else 0
    )

    # ==========================================================
    # 1. DISEASE DETECTION RESULTS
    #
    # Consolidates old/inconsistent labels such as:
    #   brown_spot
    #   Brown Spot
    # into one dashboard category.
    # ==========================================================
    disease_aliases = {
        "bacterial leaf blight": "Bacterial Leaf Blight",
        "bacterial leaf streak": "Bacterial Leaf Streak",
        "healthy rice plant": "Healthy Rice Plant",
        "healthy": "Healthy Rice Plant",
        "leaf blast": "Leaf Blast",
        "brown spot": "Brown Spot",
    }

    disease_totals = {}

    for record in record_list:
        raw_name = str(record.disease or "").strip()

        normalized_key = " ".join(
            raw_name
            .replace("_", " ")
            .replace("-", " ")
            .split()
        ).lower()

        if not normalized_key:
            display_name = "Unknown"
        else:
            display_name = disease_aliases.get(
                normalized_key,
                normalized_key.title()
            )

        disease_totals[display_name] = (
            disease_totals.get(display_name, 0) + 1
        )

    disease_items = sorted(
        disease_totals.items(),
        key=lambda item: (-item[1], item[0])
    )

    disease_labels = [
        name
        for name, count in disease_items
    ]

    disease_counts = [
        count
        for name, count in disease_items
    ]

    # ==========================================================
    # 2. SCANS OVER TIME
    #
    # Latest 14 calendar days. Zero-scan days are retained so
    # Chart.js draws a real timeline instead of a blank chart.
    # ==========================================================
    trend_start = local_today - timedelta(days=13)

    trend_totals = {
        trend_start + timedelta(days=offset): 0
        for offset in range(14)
    }

    for record in record_list:
        record_date = localtime(
            record.created_at
        ).date()

        if record_date in trend_totals:
            trend_totals[record_date] += 1

    trend_dates = sorted(
        trend_totals.keys()
    )

    trend_labels = [
        date_value.strftime("%b %d")
        for date_value in trend_dates
    ]

    trend_counts = [
        trend_totals[date_value]
        for date_value in trend_dates
    ]

    # ==========================================================
    # 3. CONFIDENCE SCORE RANGES
    # ==========================================================
    confidence_labels = [
        "Below 60%",
        "60-74%",
        "75-89%",
        "90-100%",
    ]

    confidence_counts = [
        0,
        0,
        0,
        0,
    ]

    for score in confidence_values:
        if score < 60:
            confidence_counts[0] += 1
        elif score < 75:
            confidence_counts[1] += 1
        elif score < 90:
            confidence_counts[2] += 1
        else:
            confidence_counts[3] += 1

    # ==========================================================
    # 4. TOP LOCATIONS SCANNED
    # ==========================================================
    ignored_locations = {
        "",
        "unknown",
        "n/a",
        "na",
        "none",
        "not available",
        "location unavailable",
    }

    location_totals = {}

    for record in record_list:
        location_name = " ".join(
            str(record.location or "").strip().split()
        )

        if location_name.lower() in ignored_locations:
            continue

        location_totals[location_name] = (
            location_totals.get(location_name, 0) + 1
        )

    top_locations = sorted(
        location_totals.items(),
        key=lambda item: (-item[1], item[0])
    )[:7]

    location_labels = [
        location
        for location, count in top_locations
    ]

    location_counts = [
        count
        for location, count in top_locations
    ]

    # ==========================================================
    # RENDER USER PAGE
    # ==========================================================
    return render(
        request,
        "user/index.html",
        {
            "profile_form": profile_form,
            "password_form": password_form,

            # KPI cards
            "total_predictions": total_predictions,
            "accuracy_rate": accuracy_rate,
            "todays_scans": todays_scans,

            # Disease chart + Healthy/Diseased chart
            "disease_labels": json.dumps(
                disease_labels
            ),
            "disease_counts": json.dumps(
                disease_counts
            ),

            # Scans Over Time
            "trend_labels": json.dumps(
                trend_labels
            ),
            "trend_counts": json.dumps(
                trend_counts
            ),

            # Confidence Score Ranges
            "confidence_labels": json.dumps(
                confidence_labels
            ),
            "confidence_counts": json.dumps(
                confidence_counts
            ),

            # Top Locations Scanned
            "location_labels": json.dumps(
                location_labels
            ),
            "location_counts": json.dumps(
                location_counts
            ),

            # Prediction History
            "history": record_list,
        }
    )


@staff_member_required
def admin_dashboard(request):
    return render(request, 'admin/admin_admin.html')


# === Pretty Names ===
pretty_names = {
    'bacterial_leaf_blight': 'Bacterial Leaf Blight',
    'bacterial_leaf_streak': 'Bacterial Leaf Streak',
    'healthy_rice_plant': 'Healthy Rice Plant',
    'leaf_blast': 'Leaf Blast',
    'brown_spot': 'Brown Spot',
    'random_leaf': 'Not a Rice Leaf',
    'random_object': 'Not a Rice Leaf',
}


# === Main Prediction View ===
@login_required
def predict_disease(request):
    if request.method != 'POST' or 'file' not in request.FILES:
        return JsonResponse({'error': 'Invalid request or no file uploaded.'}, status=400)

    uploaded_file = request.FILES['file']

    if uploaded_file.size > MAX_UPLOAD_BYTES:
        return JsonResponse(
            {'error': 'The image must be 4 MB or smaller.'},
            status=413,
        )

    latitude = request.POST.get('latitude')
    longitude = request.POST.get('longitude')
    accuracy = request.POST.get('accuracy')
    location_name = request.POST.get('location_name')

    try:
        interpreter = get_interpreter()
        if interpreter is None:
            logger.error("Model is not loaded.")
            return JsonResponse({'error': 'Model is not loaded.'}, status=500)

        # === Image Preprocessing ===
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as source_image:
            source_image.verify()

        uploaded_file.seek(0)
        with Image.open(uploaded_file) as source_image:
            image = source_image.convert('RGB')

        input_height = int(_input_detail["shape"][1])
        input_width = int(_input_detail["shape"][2])
        image = image.resize(
            (input_width, input_height),
            Image.Resampling.BILINEAR,
        )
        image_array = np.expand_dims(
            np.asarray(image, dtype=np.float32) / 255.0,
            axis=0,
        )
        interpreter_input = prepare_interpreter_input(image_array)

        # === Prediction ===
        with _prediction_lock:
            interpreter.set_tensor(
                _input_detail["index"],
                interpreter_input,
            )
            interpreter.invoke()
            predictions = read_interpreter_output()

        predicted_class = int(np.argmax(predictions, axis=1)[0])
        confidence = float(predictions[0][predicted_class])
        predicted_label = index_to_class.get(predicted_class, f"Unknown-{predicted_class}")
        disease_name = pretty_names.get(predicted_label, predicted_label)

        # Handle "Not a rice leaf"
        if predicted_label in ['random_leaf', 'random_object']:
            disease_name = "Not a Rice Leaf"

        # === Top 3 Predictions ===
        top_indices = predictions[0].argsort()[-3:][::-1]
        top_predictions = [
            {
                'class': pretty_names.get(index_to_class.get(i, f"Unknown-{i}"), f"Unknown-{i}"),
                'confidence': round(float(predictions[0][i]) * 100, 2)
            }
            for i in top_indices
        ]

        # === GPS Conversion ===
        lat_value = float(latitude) if latitude not in [None, '', 'null'] else None
        lon_value = float(longitude) if longitude not in [None, '', 'null'] else None
        acc_value = float(accuracy) if accuracy not in [None, '', 'null'] else None
        location_value = location_name or (
            f"{lat_value}, {lon_value}"
            if lat_value is not None and lon_value is not None
            else ""
        )

        # === Invalid Image Handling ===
        if disease_name.lower() in ["not a rice leaf", "invalid leaf", "unknown"]:
            return JsonResponse({
                'disease': "Not a Rice Leaf",
                'confidence': round(confidence * 100, 2),
                'top_3_predictions': top_predictions,
                'advice': "Please upload a valid rice leaf image.",
                'cultural_control': "",
                'biological_control': "",
                'chemical_control': "",
                'location': location_value,
                'latitude': lat_value,
                'longitude': lon_value,
                'gps_accuracy': acc_value,
                'image_url': None,
                'created_at': None,
            }, status=200)

        # === Get detailed advice ===
        advice_data = get_disease_advice(disease_name)

        # === Save valid predictions ===
        saved_record = None
        try:
            record_data = {
                "user": request.user,
                "disease": disease_name,
                "confidence": confidence * 100,
                "location": location_value,
                "gps_accuracy": acc_value,
                "latitude": lat_value,
                "longitude": lon_value,
                "recommendations": json.dumps(advice_data.get('advice', {})),
                "cultural_control": json.dumps(advice_data.get('cultural_control', {})),
                "biological_control": json.dumps(advice_data.get('biological_control', {})),
                "chemical_control": json.dumps(advice_data.get('chemical_control', {})),
            }

            if getattr(settings, "STORE_PREDICTION_IMAGES", False):
                # Pillow reads the stream during validation and inference.
                # Rewind it before Django/Cloudinary stores the upload.
                uploaded_file.seek(0)
                record_data["image"] = uploaded_file

            saved_record = PredictionRecord.objects.create(**record_data)
            create_user_prediction_notification(
                user=request.user,
                disease=disease_name,
                confidence=confidence * 100
            )
            update_highest_predicted_disease()
        except Exception:
            logger.exception("Failed to save PredictionRecord")

        image_url = (
            saved_record.image.url
            if saved_record and saved_record.image
            else None
        )
        created_at = saved_record.created_at.strftime('%Y-%m-%d %H:%M') if saved_record else None

        # === Return JSON with separated advice fields ===
        return JsonResponse({
            'disease': disease_name,
            'confidence': round(confidence * 100, 2),
            'top_3_predictions': top_predictions,
            'advice': advice_data,  # ✅ return entire dict, not just advice_data['advice']
            'location': location_value,
            'latitude': lat_value,
            'longitude': lon_value,
            'gps_accuracy': acc_value,
            'image_url': image_url,
            'created_at': created_at,
        })

    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        logger.warning("Uploaded file could not be processed as an image.")
        return JsonResponse({'error': 'Uploaded file could not be processed as an image.'}, status=400)

    except (TypeError, ValueError):
        logger.warning("Invalid numeric or image input in prediction request.")
        return JsonResponse({'error': 'Invalid prediction input.'}, status=400)

    except Exception:
        logger.exception("Unexpected prediction error")
        return JsonResponse({'error': 'Unexpected server error.'}, status=500)


def get_disease_advice(disease_name):
    advice_data = {
        'Leaf Blast': {
            'advice': {
                'en': 'Apply appropriate fungicides and manage water properly.',
                'ilo': 'Usaren dagiti umiso a fungicide ken aywanan ti pannakausar ti danum.',
                'tl': 'Gumamit ng angkop na fungicide at pamahalaan nang maayos ang tubig.'
            },
            'cultural_control': {
                'en': 'Avoid excessive nitrogen and maintain proper spacing.',
                'ilo': 'Liklikan ti sobra  a nitrogen ken mentinaren ti usto a distansia ti pinuon ti pagay.',
                'tl': 'Iwasan ang labis na nitrogen at panatilihin ang tamang pagitan.'
            },
            'biological_control': {
                'en': 'Use Trichoderma or Pseudomonas fluorescens as seed treatment.',
                'ilo': 'Agusar ti Trichoderma wenno Pseudomonas fluorescens a pamprotektar kadagiti bin-i.',
                'tl': 'Gumamit ng Trichoderma o Pseudomonas fluorescens bilang paggamot sa binhi.'
            },
            'chemical_control': {
                'en': 'Apply tricyclazole or isoprothiolane at early infection stage.',
                'ilo': 'Agusar ti tricyclazole wenno isoprothiolane no adda makita a naapektaran a mula nga pagay.',
                'tl': 'Maglagay ng tricyclazole o isoprothiolane sa maagang yugto ng impeksyon.'
            },
        },

        'Bacterial Leaf Blight': {
            'advice': {
                'en': 'Use resistant varieties and avoid excess nitrogen.',
                'ilo': 'Liklikan iti panagusar iti ado unay a nitrogen nga abono.',
                'tl': 'Gumamit ng mga barayti na lumalaban sa sakit at iwasan ang labis na nitrogen.'
            },
            'cultural_control': {
                'en': 'Remove infected stubbles and ensure proper field drainage.',
                'ilo': 'Ikkaten dagiti naapektaran wenno nagsakit nga pinuon ti pagay ken siguradwen nga nasayaat ti pagibellengan ti danum.',
                'tl': 'Tanggalin ang mga nahawaang dayami at tiyakin ang maayos na daluyan ng tubig.'
            },
            'biological_control': {
                'en': 'Apply beneficial microbes like Bacillus subtilis.',
                'ilo': 'Agusar kadagiti makatulong nga  mikrubyo kas iti Bacillus Subtilis tapno napintas ti panagdakkel iti pagay ken maliklikan dagiti sakit.',
                'tl': 'Gumamit ng mga kapaki-pakinabang na mikrobyo tulad ng Bacillus subtilis.'
            },
            'chemical_control': {
                'en': 'Spray copper-based bactericides if necessary.',
                'ilo': 'Agispray iti copper-based bactericides no kasapulan.',
                'tl': 'Mag-spray ng mga bactericide na may halong tanso kung kinakailangan.'
            },
        },

        'Bacterial Leaf Streak': {
            'advice': {
                'en': 'Use disease-free seeds and avoid excessive nitrogen fertilization.',
                'ilo': 'Usaren dagiti bin-i nga awan sakit na ken liklikan ti sobra a nitrogen.',
                'tl': 'Gumamit ng mga binhing walang sakit at iwasan ang labis na nitrogen.'
            },
            'cultural_control': {
                'en': 'Practice crop rotation and remove infected residues.',
                'ilo': ' Pagsisinublaten dagiti barayti iti pagay ikaten dagiti nabatbati pay nga paset ti mula.',
                'tl': 'Magsanay ng crop rotation at alisin ang mga nahawaang tira ng halaman.'
            },
            'biological_control': {
                'en': 'Apply microbial agents such as Bacillus spp.',
                'ilo': 'Agusar iti microbial agents kas kuma iti Bacillus SPP.',
                'tl': 'Gumamit ng mga microbial agents tulad ng Bacillus spp.'
            },
            'chemical_control': {
                'en': 'Copper fungicides may help reduce spread.',
                'ilo': 'Agusar iti copper fungicides tapno maliklikan iti panagwaras iti sakit iti pagay.',
                'tl': 'Makakatulong ang copper fungicide upang mabawasan ang pagkalat.'
            },
        },

        'Healthy Rice Plant': {
            'advice': {
                'en': 'Continue regular care.',
                'ilo': 'Ituloy ti regular a panangaywan.',
                'tl': 'Ipagpatuloy ang regular na pangangalaga.'
            },
            'cultural_control': {
                'en': 'Maintain good irrigation and proper spacing.',
                'ilo': 'Mentenaren ti nasayaat nga irigasyon ken umno nga espasyo iti pagay',
                'tl': 'Panatilihin ang tamang irigasyon at pagitan.'
            },
            'biological_control': {
                'en': 'Encourage beneficial insects and soil microbes.',
                'ilo': 'Guyoguyen dagiti makatulong a insekto ken microbyo ti daga babaen ti panagusar ti oraganico nga abono.',
                'tl': 'Hikayatin ang mga kapaki-pakinabang na insekto at mikrobyo sa lupa.'
            },
            'chemical_control': {
                'en': 'No chemical control needed for healthy crops.',
                'ilo': 'Saanen a kasapulan ti agusar ti kemikal no makita a nasalun-at dagiti mula',
                'tl': 'Walang kailangang kemikal kung malusog ang pananim.'
            },
        },

        'Brown Spot': {
            'advice': {
                'en': 'Use resistant varieties, apply balanced fertilizer, and act early when symptoms appear.',
                'ilo': 'Usaren dagiti barayti nga narigat nga makapetan ti sakit, aggikabil iti usto ken balanse nga abono, ken siguden no adda makita nga sintomas .',
                'tl': 'Gumamit ng matibay sa sakit na binhi, magbigay ng balanseng pataba, at agad na kumilos kapag may nakitang sintomas.'
            },
            'cultural_control': {
                'en': 'Improve drainage, avoid excessive nitrogen fertilizer, maintain proper plant spacing, and use clean treated seeds.',
                'ilo': 'Simpaen ti pagnaan ti danum, liklikan ti nasobra nga nitrogen fertilizer, ken pagnaed ti husto nga distansia dagiti mula.',
                'tl': 'Ayusin ang daluyan ng tubig, iwasan ang sobrang nitrogen na pataba, at panatilihin ang tamang pagitan ng mga tanim.' 
            },
            'biological_control': {
                'en': 'Apply beneficial microbes like Trichoderma or Bacillus as preventive treatment.',
                'ilo': 'Mangikabil iti nasayaat a mikrobyo kas iti Trichoderma wenno Bacillus tapno maka iwas iti sakit.',
                'tl': 'Maglagay ng mga kapaki-pakinabang na mikrobyo tulad ng Trichoderma o Bacillus bilang pang-iwas sa sakit'
            },
            'chemical_control': {
                'en': 'Use fungicides such as Mancozeb, Propiconazole, or Azoxystrobin at early signs and repeat every 7–14 days if needed.',
                'ilo': 'Ag-spray iti fungicide kas iti Mancozeb, Propiconazole, wenno Azoxystrobin iti umuna a pinakakita iti senyales ti sakit ken uliten kada 7–14 aldaw no kasapulan.',
                'tl': 'Mag-spray ng fungicide tulad ng Mancozeb, Propiconazole, o Azoxystrobin sa unang senyales ng sakit at ulitin kada 7–14 araw kung kinakailangan.'
            },
        }
    }

    return advice_data.get(disease_name, {
        'advice': {'en': 'No specific advice available.', 'ilo': 'Awan ti espesipiko a tulong.', 'tl': 'Walang tiyak na payo.'},
        'cultural_control': {'en': 'N/A', 'ilo': 'Awan ti impormasyon.', 'tl': 'Walang impormasyon.'},
        'biological_control': {'en': 'N/A', 'ilo': 'Awan ti impormasyon.', 'tl': 'Walang impormasyon.'},
        'chemical_control': {'en': 'N/A', 'ilo': 'Awan ti impormasyon.', 'tl': 'Walang impormasyon.'},
    })



@login_required
def change_password(request):
    if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
        form = PasswordChangeForm(user=request.user, data=request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            return JsonResponse({"success": True, "message": "Password updated successfully!"})
        else:
            errors = []
            for field, field_errors in form.errors.items():
                errors.extend(field_errors)
            return JsonResponse({"success": False, "errors": errors}, status=400)
    return JsonResponse({"success": False, "errors": ["Invalid request."]}, status=400)


# === Dashboard ===
@staff_member_required
def dashboard(request):
    total_scans = PredictionRecord.objects.count()

    # ✅ Convert to local timezone (Asia/Manila)
    now_local = timezone.localtime(timezone.now())
    today_local = now_local.date()

    # ✅ Filter using local date
    todays_scans = PredictionRecord.objects.filter(
        created_at__date=today_local
    ).count()

    disease_counts = PredictionRecord.objects.values("disease").annotate(count=Count("disease"))

    data = {
        "total_scans": total_scans,
        "bacterial_leaf_blight": 0,
        "bacterial_leaf_streak": 0,
        "healthy_rice_plant": 0,
        "leaf_blast": 0,
    }

    for d in disease_counts:
        disease = d["disease"].lower().replace(" ", "_")
        if disease in data:
            data[disease] = d["count"]

    # ✅ Include today's scans in context
    return render(request, "dashboard.html", {
        "data": data,
        "todays_scans": todays_scans,
    })


# === Notifications ===
@staff_member_required
def notifications_view(request):
    filter_type = request.GET.get('filter', 'all')  # 'all', 'daily', 'weekly', 'monthly'
    notifications = Notification.objects.all()
    
    # Apply period filter by summary message content
    if filter_type == 'daily':
        notifications = notifications.filter(message__icontains='today')
    elif filter_type == 'weekly':
        notifications = notifications.filter(message__icontains='last 7 days')
    elif filter_type == 'monthly':
        notifications = notifications.filter(message__icontains='last 30 days')
    
    notifications = notifications.order_by('-created_at')
    
    return render(request, 'user/notifications.html', {
        'notifications': notifications,
        'filter_type': filter_type
    })

@login_required
def user_notifications_view(request):
    filter_type = request.GET.get('filter', 'all')  # 'all', 'daily', 'weekly', 'monthly'
    notifications = Notification.objects.filter(user=request.user)
    
    # Apply period filter by summary message content
    if filter_type == 'daily':
        notifications = notifications.filter(message__icontains='today')
    elif filter_type == 'weekly':
        notifications = notifications.filter(message__icontains='last 7 days')
    elif filter_type == 'monthly':
        notifications = notifications.filter(message__icontains='last 30 days')
    
    notifications = notifications.order_by('-created_at')
    
    return render(request, 'user/index.html', {
        'notifications': notifications,
        'active_section': 'notifications',
        'filter_type': filter_type
    })

@login_required
def mark_as_read(request, notif_id):
    notif = get_object_or_404(Notification, id=notif_id, user=request.user)
    notif.status = 'read'
    notif.save()
    return redirect('user_notifications')


# === Notifications JSON API ===
@login_required
def notifications_json(request):
    filter_type = request.GET.get('filter', 'all')  # 'all', 'daily', 'weekly', 'monthly'
    notifications = Notification.objects.filter(user=request.user)
    
    # Apply period filter by summary message content
    if filter_type == 'daily':
        notifications = notifications.filter(message__icontains='today')
    elif filter_type == 'weekly':
        notifications = notifications.filter(message__icontains='last 7 days')
    elif filter_type == 'monthly':
        notifications = notifications.filter(message__icontains='last 30 days')
    
    notifications = notifications.order_by('-created_at')
    
    data = [
        {
            "message": n.message,
            "status": n.status,
            "created_at": timezone.localtime(n.created_at).isoformat()
        }
        for n in notifications
    ]
    return JsonResponse({"notifications": data})


# === Filter History API ===
@login_required
def filter_history_json(request):
    user = request.user
    date = request.GET.get('date')
    disease = request.GET.get('disease')
    confidence = request.GET.get('confidence')

    records = PredictionRecord.objects.filter(user=user)

    if date:
        try:
            start = datetime.strptime(date, "%Y-%m-%d")
            start = timezone.make_aware(start)
            end = start + timedelta(days=1)
            records = records.filter(created_at__gte=start, created_at__lt=end)
        except ValueError:
            pass

    if disease:
        records = records.filter(disease__iexact=disease)

    if confidence:
        try:
            confidence_value = float(confidence)
            records = records.filter(confidence__gte=confidence_value)
        except ValueError:
            pass

    data = [
        {
            'id': r.id,
            'date': r.created_at.strftime('%Y-%m-%d'),
            'display_date': r.created_at.strftime('%b %d, %Y %H:%M'),
            'disease': r.disease,
            'confidence': round(r.confidence, 2),
            'location': r.location or '',
            'image_url': r.image.url if getattr(r, 'image', None) else '',
            'latitude': r.latitude,
            'longitude': r.longitude,
            'gps_accuracy': r.gps_accuracy,
            'recommendations': r.recommendations if r.recommendations else '{}',
            'cultural_control': r.cultural_control if r.cultural_control else '{}',
            'biological_control': r.biological_control if r.biological_control else '{}',
            'chemical_control': r.chemical_control if r.chemical_control else '{}',
        }
        for r in records.order_by('-created_at')
    ]

    return JsonResponse({'history': data})


# === User Prediction Detail Page ===
@login_required
def user_prediction_detail(request, pk):
    """Display detailed view of a single prediction for the logged-in user"""
    prediction = get_object_or_404(PredictionRecord, pk=pk, user=request.user)

    if prediction.gps_accuracy is not None:
        try:
            gps_value = float(prediction.gps_accuracy)
            gps_display = f"{gps_value / 1000:.2f} km" if gps_value > 1000 else f"{gps_value:.2f} m"
        except (ValueError, TypeError):
            gps_display = "N/A"
    else:
        gps_display = "N/A"

    # Provide English advice for the predicted disease
    advice_data = get_disease_advice(prediction.disease)

    return render(request, 'user/user_prediction_detail.html', {
        'prediction': prediction,
        'gps_display': gps_display,
        'advice': advice_data,
    })
