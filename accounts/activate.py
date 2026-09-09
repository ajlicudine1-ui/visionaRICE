from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib import messages
from django.shortcuts import redirect
from .tokens import account_activation_token

User = get_user_model()

def activate(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and account_activation_token.check_token(user, token):
        user.is_active = True
        user.save()
        # Add a success message
        messages.success(request, "Your account has been verified! You can now log in.")
        return redirect("login")  # Login page will show the message
    else:
        messages.error(request, "Activation link is invalid or expired.")
        return redirect("signup")
