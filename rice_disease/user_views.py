from django.shortcuts import render, get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Count
from .models import PredictionRecord

User = get_user_model()

def users_page(request):
    users = User.objects.all()

    # Count predictions per user
    user_predictions = PredictionRecord.objects.values('user__username', 'user__id').annotate(
        total_predictions=Count('id')
    ).order_by('-total_predictions')

    context = {
        "users": users,
        "user_predictions": user_predictions,
    }
    return render(request, "admin/users_admin.html", context)


def user_dashboard(request, user_id):
    user = get_object_or_404(User, id=user_id)
    predictions = PredictionRecord.objects.filter(user=user).order_by('-created_at')

    total_predictions = predictions.count()

    # Prepare data for disease chart
    disease_stats = predictions.values('disease').annotate(count=Count('disease')).order_by('-count')
    disease_labels = [entry['disease'] for entry in disease_stats]
    disease_counts = [entry['count'] for entry in disease_stats]

    context = {
        "user": user,
        "predictions": predictions,
        "total_predictions": total_predictions,
        "disease_labels": disease_labels,
        "disease_counts": disease_counts,
    }
    return render(request, "admin/user_dashboard_admin.html", context)
