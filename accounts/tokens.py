from django.contrib.auth.tokens import PasswordResetTokenGenerator
import six

class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    """
    Generates a token for email verification.
    The token becomes invalid if the user's `is_active` status changes.
    """
    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{timestamp}{user.is_active}"

# Instance to use in views
account_activation_token = AccountActivationTokenGenerator()
