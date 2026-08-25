from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import get_user_model  # for custom user model
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.http import JsonResponse
from .forms import SignUpForm
from .tokens import account_activation_token

User = get_user_model()  # use your custom user model

def signup_view(request):
    if request.method == "POST":
        form = SignUpForm(request.POST)
        if form.is_valid():
            # Save user but set inactive until email verification
            user = form.save(commit=False)
            user.is_active = False
            user.save()

            # Prepare activation email
            current_site = get_current_site(request)
            subject = "Activate Your Account"
            message = render_to_string(
                "accounts/account_activation_email.html",
                {
                    "user": user,
                    "domain": current_site.domain,
                    "uid": urlsafe_base64_encode(force_bytes(user.pk)),
                    "token": account_activation_token.make_token(user),
                },
            )

            # Send HTML email
            email_message = EmailMessage(subject, message, to=[user.email])
            email_message.content_subtype = "html"  # ensures HTML rendering
            email_message.send()

            # Success message + reload signup form (to show email polling)
            messages.success(request, "✅ Your account has been created! Please check your email to activate it.")
            return render(request, "accounts/signup.html", {"form": SignUpForm(), "user_email": user.email})
        else:
            # If passwords don’t match or form has errors
            messages.error(request, "⚠️ Please correct the errors below.")
    else:
        form = SignUpForm()

    return render(request, "accounts/signup.html", {"form": form})


def activate(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and account_activation_token.check_token(user, token):
        user.is_active = True
        user.save()
        messages.success(request, "🎉 Your account has been activated! You can now log in.")
        return redirect("login")
    else:
        messages.error(request, "❌ Activation link is invalid or expired.")
        return redirect("signup")


# AJAX endpoint to check activation
def check_activation(request):
    email = request.GET.get("email")
    try:
        user = User.objects.get(email=email)
        return JsonResponse({"is_active": user.is_active})
    except User.DoesNotExist:
        return JsonResponse({"is_active": False})
