from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import CustomUser
from rice_disease.models import Notification, PredictionRecord
from django.db.models import Count

class Command(BaseCommand):
    help = "Generate weekly notifications for users and admin"

    def handle(self, *args, **kwargs):
        current_week = timezone.now().isocalendar()[1] - 1

        # --- For each farmer (user)
        farmers = CustomUser.objects.filter(is_staff=False)
        for farmer in farmers:
            top = (
                PredictionRecord.objects
                .filter(user=farmer, created_at__week=current_week)
                .values('disease')
                .annotate(total=Count('disease'))
                .order_by('-total')
                .first()
            )
            if top:
                Notification.objects.create(
                    user=farmer,
                    message=f"📊 The most frequently detected disease in the last 7 days is: {top['disease']} ({top['total']} detections).",
                    type='user'
                )

        # --- For admin (overall top)
        top_overall = (
            PredictionRecord.objects
            .filter(created_at__week=current_week)
            .values('disease')
            .annotate(total=Count('disease'))
            .order_by('-total')
            .first()
        )

        if top_overall:
            for admin in CustomUser.objects.filter(is_staff=True):
                Notification.objects.create(
                    user=admin,
                    message=f"📊 The most frequently detected disease in the last 7 days is: {top_overall['disease']} ({top_overall['total']} detections).",
                    type='admin'
                )

        self.stdout.write(self.style.SUCCESS("✅ Weekly notifications generated successfully!"))
