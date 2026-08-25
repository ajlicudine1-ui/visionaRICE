from django.db import models
from django.contrib.auth import get_user_model
from accounts.models import CustomUser

User = get_user_model()

class PredictionRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    disease = models.CharField(max_length=255)
    confidence = models.FloatField()
    location = models.CharField(max_length=255, blank=True, null=True)

    # ✅ Add these new fields:
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    gps_accuracy = models.FloatField(blank=True, null=True)

    # ✅ Disease control and advice fields
    recommendations = models.TextField(blank=True, null=True)
    cultural_control = models.TextField(blank=True, null=True)
    biological_control = models.TextField(blank=True, null=True)
    chemical_control = models.TextField(blank=True, null=True)

    image = models.ImageField(upload_to='uploads/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.disease} ({self.confidence}%)"


class Notification(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    type = models.CharField(max_length=10, choices=[('user', 'User'), ('admin', 'Admin')])
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=[('unread', 'Unread'), ('read', 'Read')], default='unread')

    def __str__(self):
        return f"{self.type} - {self.message[:30]}"
