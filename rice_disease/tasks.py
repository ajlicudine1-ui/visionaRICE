from django.utils import timezone
from collections import Counter
from rice_disease.models import PredictionRecord, Notification


def send_most_common_disease_notification():
    """
    Periodically checks recent predictions per user and creates a
    notification about their most frequent detected disease.
    """
    users = PredictionRecord.objects.values_list('user', flat=True).distinct()

    for user_id in users:
        predictions = PredictionRecord.objects.filter(user_id=user_id).order_by('-created_at')[:20]
        if not predictions.exists():
            continue

        # Count disease occurrences
        disease_counts = Counter(p.disease for p in predictions)
        most_common_disease, count = disease_counts.most_common(1)[0]

        # Notification message
        message = f"📊 Most frequently detected disease: {most_common_disease} ({count} recent detections)."

        # Avoid duplicate notifications
        last_notif = Notification.objects.filter(user_id=user_id).order_by('-created_at').first()
        if not last_notif or last_notif.message != message:
            Notification.objects.create(
                user_id=user_id,
                message=message,
                type='summary',
                status='unread',
                created_at=timezone.now()
            )
