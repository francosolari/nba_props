"""
Custom allauth adapters to handle email verification logic.
This fixes the bug where Google OAuth users are prompted for email verification.
"""

from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom account adapter to handle email verification for regular signups.
    """

    def is_email_verification_mandatory(self, request, email_address):
        """
        Override to check if user has social account.
        If user signed up with Google, email verification is not mandatory.
        """
        from allauth.socialaccount.models import SocialAccount

        # Check if this user has a social account (Google OAuth)
        if email_address and email_address.user:
            has_social_account = SocialAccount.objects.filter(
                user=email_address.user
            ).exists()

            if has_social_account:
                # User signed up with Google - email already verified by Google
                return False

        # For regular email signups, verification is mandatory
        return super().is_email_verification_mandatory(request, email_address)


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter to automatically verify emails from social providers.
    """

    def pre_social_login(self, request, sociallogin):
        """
        Called when a social account is being logged in.
        Automatically verify the email address from social providers.
        """
        if sociallogin.is_existing:
            # User already exists, nothing to do
            return

        # For new social signups, the email will be automatically verified
        # This is handled by allauth, but we ensure it here
        if sociallogin.email_addresses:
            for email_address in sociallogin.email_addresses:
                email_address.verified = True

    def populate_user(self, request, sociallogin, data):
        """
        Populate user instance with data from social provider.
        Ensure email is marked as verified.
        """
        user = super().populate_user(request, sociallogin, data)

        # The email from social providers (like Google) is already verified
        # This will be handled by allauth's EmailAddress creation
        return user
