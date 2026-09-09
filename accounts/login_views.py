# login_views.py
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.urls import reverse        # ✅ Needed for URL building
from django.http import HttpResponseRedirect   # ✅ Add this line
import requests

# Replace with your actual Secret Key from Google reCAPTCHA
RECAPTCHA_SECRET_KEY = "6LcuCmEtAAAAAHAtY5ncjYQ1tTXEaJrRWQP5yVr2"


def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        captcha_response = request.POST.get("g-recaptcha-response")

        # Verify Google reCAPTCHA
        if not captcha_response:
            messages.error(request, "Please complete the CAPTCHA.")
            return render(request, "accounts/login.html")

        data = {
            "secret": RECAPTCHA_SECRET_KEY,
            "response": captcha_response
        }
        r = requests.post("https://www.google.com/recaptcha/api/siteverify", data=data)
        result = r.json()

        if not result.get("success"):
            messages.error(request, "Invalid CAPTCHA. Please try again.")
            return render(request, "accounts/login.html")

        # Authenticate user
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)

            # Redirect based on role
            if user.is_superuser:  # or user.is_staff
                return redirect("admin_dashboard")  # custom admin dashboard
            else:
                # Regular user → go to Analyze section on index
                index_url = reverse("index")  # e.g., /index/
                return HttpResponseRedirect(index_url + "#analyze")
        else:
            messages.error(request, "Invalid username or password")

    # Display messages (including account verified)
    return render(request, "accounts/login.html")
