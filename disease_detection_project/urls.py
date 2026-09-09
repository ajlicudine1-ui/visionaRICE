from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from rice_disease import views


urlpatterns = [
    # Admin site
    path("admin/", admin.site.urls),

    # App URLs
    path("rice_disease/", include("rice_disease.urls")),  # Rice disease app
    path("accounts/", include("accounts.urls")),          # Accounts app

    # Root URL redirects to rice_disease index page
    path("", lambda request: redirect("index")),

    path('notifications/', views.notifications_view, name='notifications'),
    path('user-prediction/<int:pk>/', views.user_prediction_detail, name='user_prediction_detail'),

    # PWA static assets (serve from root for correct scope)
    path('manifest.json', serve, {'path': 'manifest.json', 'document_root': settings.STATIC_ROOT if not settings.DEBUG else settings.STATICFILES_DIRS[0]}),
    path('service-worker.js', serve, {'path': 'service-worker.js', 'document_root': settings.STATIC_ROOT if not settings.DEBUG else settings.STATICFILES_DIRS[0]}),
]


# Serve static and media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    if hasattr(settings, 'STATICFILES_DIRS'):
        urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    else:
        urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
