from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.db import models  # ✅ required for Count annotations
from rice_disease.utils import create_most_occurring_disease_notification
from rice_disease.models import PredictionRecord


@receiver(user_logged_in)
def notify_on_login(sender, user, request, **kwargs):
    """
    When a user logs in:
    - Regular user → notify about their most frequent disease (past 7 days)
    - Admin/staff → no notification
    """
    try:
        print(f"🧩 Login detected for: {user.username}")

        if not (user.is_staff or user.is_superuser):
            # 👤 Regular user: Notify of their personal most frequent disease
            print("👤 Regular user login → updating personal frequent disease")
            create_most_occurring_disease_notification(user)
        else:
            print("👑 Admin login → no notification created")

        print("✅ Notification process completed successfully")

    except Exception as e:
        print(f"⚠️ Error creating most frequent disease notification: {e}")
