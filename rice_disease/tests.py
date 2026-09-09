from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile

from accounts.models import CustomUser
from .models import PredictionRecord, Notification
from .utils import create_most_occurring_disease_notification


class MostOccurringDiseaseNotificationTests(TestCase):
    def test_daily_weekly_monthly_summary_notifications(self):
        user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            phone_number='09123456789',
            password='testpass123'
        )

        img = SimpleUploadedFile('test.jpg', b'filecontent', content_type='image/jpeg')

        # 2 Brown Spot and 1 Leaf Blast, so Brown Spot is top
        PredictionRecord.objects.create(
            user=user,
            disease='Brown Spot',
            confidence=95.2,
            location='Fields',
            image=img
        )
        PredictionRecord.objects.create(
            user=user,
            disease='Brown Spot',
            confidence=92.0,
            location='Fields',
            image=img
        )
        PredictionRecord.objects.create(
            user=user,
            disease='Leaf Blast',
            confidence=85.0,
            location='Fields',
            image=img
        )

        # Invoke notification generator
        create_most_occurring_disease_notification(user)

        notifications = Notification.objects.filter(user=user, type='summary').order_by('created_at')
        self.assertEqual(notifications.count(), 3)

        daily = notifications.filter(message__icontains='today').first()
        self.assertIsNotNone(daily)
        self.assertIn('Brown Spot', daily.message)
        self.assertIn('(2 detections)', daily.message)

        weekly = notifications.filter(message__contains='last 7 days').first()
        self.assertIsNotNone(weekly)
        self.assertIn('Brown Spot', weekly.message)
        self.assertIn('(2 detections)', weekly.message)

        monthly = notifications.filter(message__contains='last 30 days').first()
        self.assertIsNotNone(monthly)
        self.assertIn('Brown Spot', monthly.message)
        self.assertIn('(2 detections)', monthly.message)

