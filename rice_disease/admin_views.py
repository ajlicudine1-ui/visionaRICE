from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Avg
from django.utils.timezone import now, localdate
from datetime import timedelta
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
import requests

from .models import PredictionRecord
from .forms import ProfileForm
from .views import get_disease_advice

User = get_user_model()


# Normalize disease names to standard format
def normalize_disease_name(disease):
    """Convert disease names to standard format"""
    disease_map = {
        'brown_spot': 'Brown Spot',
        'brownspot': 'Brown Spot',
        'leaf_blast': 'Leaf Blast',
        'leafblast': 'Leaf Blast',
        'bacterial_leaf_blight': 'Bacterial Leaf Blight',
        'bacterial_leaf_streak': 'Bacterial Leaf Streak',
        'healthy_rice_plant': 'Healthy Rice Plant',
        'healthy rice plant': 'Healthy Rice Plant',
    }
    normalized = disease_map.get(disease.lower().replace(' ', '_'), disease)
    return normalized


def admin_dashboard(request):
    # ==========================
    # 🌿 Handle AJAX Filter Request
    # ==========================
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        municipality = request.GET.get('municipality', '').strip()
        barangay = request.GET.get('barangay', '').strip()

        # 🔹 Normalize PSGC names (remove "City of" or "Municipality of")
        if municipality.lower().startswith("city of "):
            municipality = municipality[8:].strip()
        elif municipality.lower().startswith("municipality of "):
            municipality = municipality[15:].strip()

        records = PredictionRecord.objects.all()
        if municipality:
            records = records.filter(location__icontains=municipality)
        if barangay:
            records = records.filter(location__icontains=barangay)

        disease_counts = (
            records.values('disease')
            .annotate(total=Count('disease'))
            .order_by('-total')
        )

        # Normalize and consolidate disease names
        normalized_counts = {}
        for d in disease_counts:
            normalized_disease = normalize_disease_name(d['disease'])
            normalized_counts[normalized_disease] = normalized_counts.get(normalized_disease, 0) + d['total']

        labels = list(normalized_counts.keys())
        data = list(normalized_counts.values())

        return JsonResponse({'labels': labels, 'data': data})

    # ==========================
    # 🌿 Load PSGC Municipality + Barangay Data (La Union)
    # ==========================
    LA_UNION_CODE = "013300000"
    la_union_data = {}

    try:
        muni_res = requests.get(
            f"https://psgc.gitlab.io/api/provinces/{LA_UNION_CODE}/cities-municipalities/"
        )
        municipalities_data = muni_res.json() if muni_res.status_code == 200 else []

        for muni in municipalities_data:
            muni_name = muni.get("name", "")
            muni_code = muni.get("code", "")

            try:
                brgy_res = requests.get(
                    f"https://psgc.gitlab.io/api/cities-municipalities/{muni_code}/barangays/"
                )
                barangays_data = brgy_res.json() if brgy_res.status_code == 200 else []
                la_union_data[muni_name] = [b["name"] for b in barangays_data]
            except Exception as e:
                la_union_data[muni_name] = []
                print(f"Error fetching barangays for {muni_name}:", e)
    except Exception as e:
        print("Error fetching municipalities:", e)

    # ==========================
    # 🌿 Initial Chart Data
    # ==========================
    disease_counts = (
        PredictionRecord.objects.values('disease')
        .annotate(total=Count('disease'))
        .order_by('-total')
    )

    # Normalize and consolidate disease names
    normalized_counts = {}
    for d in disease_counts:
        normalized_disease = normalize_disease_name(d['disease'])
        normalized_counts[normalized_disease] = normalized_counts.get(normalized_disease, 0) + d['total']

    labels = list(normalized_counts.keys())
    data = list(normalized_counts.values())

    # ==========================
    # 🌿 Dashboard Statistics
    # ==========================
    total_predictions = PredictionRecord.objects.count()
    # Active users should count real registered accounts only (exclude null user references)
    active_users = User.objects.filter(is_active=True).count()

    # Average accuracy (from confidence field)
    avg_conf = PredictionRecord.objects.aggregate(avg_conf=Avg('confidence'))['avg_conf']
    accuracy_rate = round(avg_conf or 0, 2)

    # Count predictions within the last 24 hours (more reliable across timezones)
    today_scans = PredictionRecord.objects.filter(created_at__gte=now() - timedelta(days=1)).count()

    # ==========================
    # 🌿 Render Template
    # ==========================
    context = {
        'disease_labels': labels,
        'disease_data': data,
        'municipalities': sorted(la_union_data.keys()),
        'barangays_by_muni': la_union_data,
        'total_predictions': total_predictions,
        'active_users': active_users,
        'accuracy_rate': accuracy_rate,
        'today_scans': today_scans,
    }

    return render(request, 'admin/admin_admin.html', context)



# ==============================
# 🌿 PREDICTIONS PAGE
# ==============================
def predictions_page(request):
    recent_predictions = (
        PredictionRecord.objects.select_related("user").order_by('-created_at')[:100]
    )

    # Ensure all known disease types appear in the chart (even if count is 0)
    known_diseases = [
        'Leaf Blast',
        'Bacterial Leaf Blight',
        'Bacterial Leaf Streak',
        'Brown Spot',
        'Healthy Rice Plant',
    ]

    disease_counts = (
        PredictionRecord.objects.values('disease')
        .annotate(count=Count('disease'))
    )

    # Normalize disease names and consolidate
    disease_count_map = {}
    for d in disease_counts:
        normalized_disease = normalize_disease_name(d['disease'])
        disease_count_map[normalized_disease] = disease_count_map.get(normalized_disease, 0) + d['count']

    # Build final ordered labels/data (include unknowns at end)
    labels = []
    data = []

    for disease in known_diseases:
        labels.append(disease)
        data.append(disease_count_map.get(disease, 0))

    # Append any other diseases found in the database
    for disease, count in disease_count_map.items():
        if disease not in known_diseases:
            labels.append(disease)
            data.append(count)

    context = {
        "recent_predictions": recent_predictions,
        "disease_labels": labels,
        "disease_data": data,
    }
    return render(request, "admin/predictions_admin.html", context)


# ==============================
# 👤 USER MANAGEMENT
# ==============================
def delete_user(request, user_id):
    if request.method == "POST":
        user = get_object_or_404(User, id=user_id)
        user.delete()
        messages.success(request, "User deleted successfully.")
    return redirect('users_page')


def deactivate_user(request, user_id):
    if request.method == "POST":
        user = get_object_or_404(User, id=user_id)
        if user.is_active:
            user.is_active = False
            user.save()
            messages.success(request, f"{user.username} has been deactivated.")
        else:
            messages.info(request, f"{user.username} is already deactivated.")
    return redirect('users_page')


def activate_user(request, user_id):
    if request.method == "POST":
        user = get_object_or_404(User, id=user_id)
        if not user.is_active:
            user.is_active = True
            user.save()
            messages.success(request, f"{user.username} has been activated.")
        else:
            messages.info(request, f"{user.username} is already active.")
    return redirect('users_page')


@login_required
def admins_profile(request):
    user = request.user

    if request.method == "POST":
        form = ProfileForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            return redirect(request.META.get("HTTP_REFERER", "admins_profile"))
    else:
        form = ProfileForm(instance=user)

    return render(request, "admin/profile_admin.html", {"form": form, "user": user})


@login_required
def change_password(request):
    if request.method == "POST":
        form = PasswordChangeForm(user=request.user, data=request.POST)
        if form.is_valid():
            form.save()
            update_session_auth_hash(request, form.user)
            return JsonResponse({"success": True, "message": "Password changed successfully!"})
        else:
            errors = [str(err) for err_list in form.errors.values() for err in err_list]
            return JsonResponse({"success": False, "errors": errors})
    else:
        form = PasswordChangeForm(user=request.user)
    return render(request, "admin/change_password.html", {"form": form})


# ==============================
# 🔍 PREDICTION DETAIL
# ==============================
def prediction_detail(request, pk):
    prediction = get_object_or_404(PredictionRecord, pk=pk)

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

    return render(request, 'admin/prediction_detail_admin.html', {
        'prediction': prediction,
        'gps_display': gps_display,
        'advice': advice_data,
    })
