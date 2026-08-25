
from accounts.models import CustomUser
from rice_disease.models import Notification, PredictionRecord
from django.utils import timezone
from django.db.models import Count

def generate_weekly_notifications():
    current_week = timezone.now().isocalendar()[1] - 1  # last week

    # --- For each farmer
    farmers = CustomUser.objects.filter(is_staff=False)
    for farmer in farmers:
        top = (PredictionRecord.objects
               .filter(user=farmer, created_at__week=current_week)
               .values('disease')
               .annotate(total=Count('disease'))
               .order_by('-total')
               .first())
        if top:
            Notification.objects.create(
                user=farmer,
                message=f"📊 The most frequently detected disease in the last 7 days is: {top['disease']} ({top['total']} detections).",
                type='user'
            )

    # --- For admin
    top_overall = (PredictionRecord.objects
                   .filter(created_at__week=current_week)
                   .values('disease')
                   .annotate(total=Count('disease'))
                   .order_by('-total')
                   .first())
    if top_overall:
        for admin in CustomUser.objects.filter(is_staff=True):
            Notification.objects.create(
                user=admin,
                message=f"📊 The most frequently detected disease in the last 7 days is: {top_overall['disease']} ({top_overall['total']} detections).",
                type='admin'
            )
