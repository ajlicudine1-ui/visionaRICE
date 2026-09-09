from django.urls import path, include
from . import views
from . import admin_views
from . import user_views
from django.contrib.auth import views as auth_views
from .admin_views import change_password

urlpatterns = [
    path('', views.index, name='index'),                    
    path('predict_disease/', views.predict_disease, name='predict_disease'),

    # Admin pages
    path('admin-dashboard/', admin_views.admin_dashboard, name='admin_dashboard'),
    path('predictions/', admin_views.predictions_page, name='predictions_page'),
    path('profile/', admin_views.admins_profile, name='admins_profile'), 

    # User pages
    path('users/', user_views.users_page, name='users_page'),
    path('users/<int:user_id>/', user_views.user_dashboard, name='user_dashboard'),
    path('users/deactivate/<int:user_id>/', admin_views.deactivate_user, name='deactivate_user'),
    path('users/activate/<int:user_id>/', admin_views.activate_user, name='activate_user'),
    path('users/delete/<int:user_id>/', admin_views.delete_user, name='delete_user'),

    # Authentication
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),

    path('profile/change-password/', admin_views.change_password, name='change_password'),

    path("change-password/", views.change_password, name="change_password"),
    
    # Admin notifications view
    path('admin-notifications/', views.notifications_view, name='notifications'),
    path('prediction/<int:pk>/', admin_views.prediction_detail, name='prediction_detail'),

    # User notifications
    path('notifications/', views.user_notifications_view, name='user_notifications'),
    path('notifications/read/<int:notif_id>/', views.mark_as_read, name='mark_as_read'),
    path('notifications/json/', views.notifications_json, name='notifications_json'),
    path('filter_history_json/', views.filter_history_json, name='filter_history_json'),
    path('user-prediction/<int:pk>/', views.user_prediction_detail, name='user_prediction_detail'),

]
 