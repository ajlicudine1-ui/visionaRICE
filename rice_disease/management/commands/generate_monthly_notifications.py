from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import CustomUser
from rice_disease.models import Notification, PredictionRecord
from django.db.models import Count
from datetime import timedelta

class Command(BaseCommand):
    help = "Generate monthly notifications for users and admin"

    def handle(self, *args, **kwargs):
        thirty_days_ago = timezone.now() - timedelta(days=30)

        # --- For each farmer (user)
        farmers = CustomUser.objects.filter(is_staff=False)
        for farmer in farmers:
            top = (
                PredictionRecord.objects
                .filter(user=farmer, created_at__gte=thirty_days_ago)
                .values('disease')
                .annotate(total=Count('disease'))
                .order_by('-total')
                .first()
            )
            if top:
                Notification.objects.create(
                    user=farmer,
                    message=f"📊 The most frequently detected disease in the last 30 days is: {top['disease']} ({top['total']} detections).",
                    type='user'
                )

        # --- For admin (overall top)
        top_overall = (
            PredictionRecord.objects
            .filter(created_at__gte=thirty_days_ago)
            .values('disease')
            .annotate(total=Count('disease'))
            .order_by('-total')
            .first()
        )

        if top_overall:
            for admin in CustomUser.objects.filter(is_staff=True):
                Notification.objects.create(
                    user=admin,
                    message=f"📊 The most frequently detected disease in the last 30 days is: {top_overall['disease']} ({top_overall['total']} detections).",
                    type='admin'
                )

        self.stdout.write(self.style.SUCCESS("✅ Monthly notifications generated successfully!"))