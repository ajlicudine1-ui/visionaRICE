from django import forms
from .models import CustomUser
import re

class SignUpForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Enter Password'}),
        required=True
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Confirm Password'}),
        required=True
    )

    class Meta:
        model = CustomUser
        fields = ('username', 'first_name', 'email', 'phone_number', 'password')

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if CustomUser.objects.filter(email=email).exists():
            raise forms.ValidationError("This email is already registered.")
        return email

    def clean_phone_number(self):
        phone = self.cleaned_data.get('phone_number')
        if CustomUser.objects.filter(phone_number=phone).exists():
            raise forms.ValidationError("This phone number is already registered.")
        return phone

    def clean_password(self):
        password = self.cleaned_data.get('password')

        # Password strength validation
        if len(password) < 8:
            raise forms.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", password):
            raise forms.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r"[0-9]", password):
            raise forms.ValidationError("Password must contain at least one number.")

        return password

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm = cleaned_data.get("confirm_password")

        # Match validation
        if password and confirm and password != confirm:
            raise forms.ValidationError("Passwords do not match.")

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])  # hash password
        if commit:
            user.save()
        return user
