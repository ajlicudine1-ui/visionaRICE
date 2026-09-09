from django.contrib import admin
from .models import PredictionRecord
from .models import Notification
import json

@admin.register(PredictionRecord)
class PredictionRecordAdmin(admin.ModelAdmin):
    list_display = ("disease", "confidence", "get_location", "created_at", "get_user_email")
    list_filter = ("disease", "created_at", "user")
    search_fields = ("disease", "user__username", "user__email", "location")
    readonly_fields = ("created_at",)

    def get_location(self, obj):
        """Display location as lat, long if stored as JSON, else plain string."""
        if not obj.location:
            return "-"
        try:
            loc = json.loads(obj.location)
            lat = loc.get("latitude")
            lon = loc.get("longitude")
            if lat is not None and lon is not None:
                return f"{lat}, {lon}"
            return obj.location
        except (json.JSONDecodeError, TypeError):
            return obj.location
    get_location.short_description = "Location"

    def get_user_email(self, obj):
        """Display user's email or 'Anonymous' if no user."""
        return obj.user.email if obj.user else "Anonymous"
    get_user_email.short_description = "User Email"

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'type', 'created_at')
    list_filter = ('type', 'created_at')
    search_fields = ('user__username', 'message')