import random
import datetime
from django.utils import timezone
from django.shortcuts import render, redirect
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail

# Get the custom user model
User = get_user_model()

def forgot_password(request):
    if request.method == "POST":
        email = request.POST.get("email")

        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return render(request, "accounts/forgot_password.html", {"error": "Email not found"})

        # Generate OTP and save in session (valid for 5 minutes)
        code = str(random.randint(100000, 999999))
        request.session["reset_user"] = user.id
        request.session["reset_code"] = code
        request.session["reset_expiry"] = (timezone.now() + datetime.timedelta(minutes=5)).isoformat()

        # Send OTP via email
        send_mail(
            "Your Password Reset Code",
            f"Your reset code is: {code} (valid for 5 minutes).",
            "no-reply@yourapp.com",
            [email],
            fail_silently=False,
        )

        return redirect("verify_code")

    return render(request, "accounts/forgot_password.html")


def verify_code(request):
    if request.method == "POST":
        code = request.POST.get("code")
        user_id = request.session.get("reset_user")
        saved_code = request.session.get("reset_code")
        expiry_str = request.session.get("reset_expiry")

        if not user_id or not saved_code or not expiry_str:
            return redirect("forgot_password")

        expiry = datetime.datetime.fromisoformat(expiry_str)

        # Clear session if expired
        if timezone.now() > expiry:
            request.session.pop("reset_user", None)
            request.session.pop("reset_code", None)
            request.session.pop("reset_expiry", None)
            return render(request, "accounts/verify_code.html", {"error": "⏰ Code expired. Please request a new one."})

        # Check OTP
        if code == saved_code:
            return redirect("set_new_password")
        else:
            return render(request, "accounts/verify_code.html", {"error": "❌ Invalid code"})

    return render(request, "accounts/verify_code.html")


def set_new_password(request):
    user_id = request.session.get("reset_user")
    if not user_id:
        return redirect("forgot_password")

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        # User no longer exists
        request.session.pop("reset_user", None)
        request.session.pop("reset_code", None)
        request.session.pop("reset_expiry", None)
        return redirect("forgot_password")

    if request.method == "POST":
        new_password = request.POST.get("password")
        if new_password:
            user.password = make_password(new_password)
            user.save()

            # Clear session
            request.session.pop("reset_user", None)
            request.session.pop("reset_code", None)
            request.session.pop("reset_expiry", None)

            return redirect("login")

    return render(request, "accounts/set_new_password.html")
