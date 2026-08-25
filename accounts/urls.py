from django.urls import path
from . import signup_views, login_views, login_otp_views

urlpatterns = [
    # Signup page (sends verification email)
    path('signup/', signup_views.signup_view, name='signup'),

    # Login page
    path('login/', login_views.login_view, name='login'),

    # Email activation link
    path(
        'activate/<uidb64>/<token>/',
        signup_views.activate,
        name='activate'
    ),

    # AJAX endpoint to check account activation
    path(
        'check-activation/',
        signup_views.check_activation,
        name='check_activation'
    ),

    # Forgot password (OTP-based)
    path('forgot-password/', login_otp_views.forgot_password, name='forgot_password'),
    path('verify-code/', login_otp_views.verify_code, name='verify_code'),
    path('set-new-password/', login_otp_views.set_new_password, name='set_new_password'),
]
