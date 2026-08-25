
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from collections import Counter
from .models import PredictionRecord, Notification
from accounts.models import CustomUser


# ----------------------------------------------------
# 🔹 1. ADMIN: Notify the most frequent disease overall
# ----------------------------------------------------
def update_highest_predicted_disease():
    """
    Finds the most predicted disease across ALL users
    and notifies all admins.
    """
    disease_counts = (
        PredictionRecord.objects.values('disease')  # ✅ use correct field name
        .annotate(total=Count('id'))
        .order_by('-total')
    )

    if not disease_counts:
        return None

    top_disease = disease_counts[0]['disease']
    top_count = disease_counts[0]['total']
    total_predictions = sum(d['total'] for d in disease_counts)
    percentage = (top_count / total_predictions) * 100 if total_predictions else 0

    message = (
        f"📊 {top_disease} The most frequently predicted disease is "
        f"({top_count} detections, {percentage:.1f}% of all predictions)."
    )

    admins = CustomUser.objects.filter(is_superuser=True)
    for admin in admins:
        last_notif = Notification.objects.filter(user=admin, type='admin').order_by('-created_at').first()
        if not last_notif or last_notif.message != message:
            Notification.objects.create(
                user=admin,
                message=message,
                type='admin',
                status='unread'
            )

    return message


# ----------------------------------------------------
# 🔹 2. USER: After each prediction
# ----------------------------------------------------
def create_user_prediction_notification(user, disease, confidence):
    """
    Creates a notification for a single prediction.
    Example: 📸 Your recent prediction detected Sheath Blight (95.3% confidence).
    """
    message = f"📸 Your latest prediction is {disease} ({confidence:.1f}% confidence)."
    Notification.objects.create(
        user=user,
        message=message,
        type='user',
        status='unread'
    )


# ----------------------------------------------------
# 🔹 3. USER: Notify their most frequent disease (past week)
# ----------------------------------------------------
def create_most_occurring_disease_notification(user):
    """
    Creates notifications for the user's most frequently detected disease
    in three periods: daily, weekly, monthly.
    """
    periods = [
        ('daily', 1, 'Today', 'Daily'),
        ('weekly', 7, '7 days', 'Weekly'),
        ('monthly', 30, '30 days', 'Monthly'),
    ]

    now_ts = timezone.now()

    for period_name, period_days, period_label, period_label_name in periods:
        start_time = now_ts - timedelta(days=period_days)

        recent_predictions = PredictionRecord.objects.filter(
            user=user,
            created_at__gte=start_time
        )

        if not recent_predictions.exists():
            continue

        disease_counts = Counter(p.disease for p in recent_predictions)
        most_common_disease, count = disease_counts.most_common(1)[0]

        if period_name == 'daily':
            message = f"📊 The most frequently detected disease today is: {most_common_disease} ({count} detections)."
        elif period_name == 'weekly':
            message = f"📊 The most frequently detected disease in the last 7 days is: {most_common_disease} ({count} detections)."
        elif period_name == 'monthly':
            message = f"📊 The most frequently detected disease in the last 30 days is: {most_common_disease} ({count} detections)."

        # avoid duplicate notifications with same message for same user
        exists = Notification.objects.filter(
            user=user,
            type='summary',
            message=message,
            created_at__gte=start_time
        ).exists()

        if not exists:
            Notification.objects.create(
                user=user,
                message=message,
                type='summary',
                status='unread',
                created_at=now_ts
            )

