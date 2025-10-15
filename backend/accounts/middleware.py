"""
Middleware for handling user onboarding redirects.
"""
from django.shortcuts import redirect
from django.urls import reverse
from .models import UserOnboarding


class OnboardingMiddleware:
    """
    Redirect authenticated users who haven't completed onboarding to the onboarding flow.
    """

    def __init__(self, get_response):
        self.get_response = get_response

        # URLs that should be accessible without completing onboarding
        self.exempt_urls = [
            '/accounts/onboarding/',  # All onboarding pages
            '/accounts/logout/',  # Allow logout
            '/accounts/password/',  # Password reset
            '/admin/',  # Admin access
            '/static/',  # Static files
            '/api/',  # API endpoints
        ]

        # Exact URL patterns that should be exempt
        self.exempt_exact = [
            reverse('account_logout'),
            reverse('account_login'),
            reverse('account_signup'),
        ]

    def __call__(self, request):
        # Check if user is authenticated
        if request.user.is_authenticated:
            # Check if URL should be exempt from onboarding check
            if self._is_exempt_url(request.path):
                return self.get_response(request)

            # Check if user has completed onboarding
            try:
                onboarding = request.user.onboarding
                if not onboarding.onboarding_complete:
                    # Redirect to appropriate onboarding step
                    if not onboarding.completed_welcome:
                        if request.path != reverse('onboarding_welcome'):
                            return redirect('onboarding_welcome')
                    elif not onboarding.completed_profile_setup:
                        if request.path != reverse('onboarding_profile'):
                            return redirect('onboarding_profile')
                    elif not onboarding.completed_tutorial:
                        if request.path != reverse('onboarding_tutorial'):
                            return redirect('onboarding_tutorial')
            except UserOnboarding.DoesNotExist:
                # Create onboarding and redirect to welcome
                UserOnboarding.objects.create(user=request.user)
                if request.path != reverse('onboarding_welcome'):
                    return redirect('onboarding_welcome')

        response = self.get_response(request)
        return response

    def _is_exempt_url(self, path):
        """Check if the URL path is exempt from onboarding requirements."""
        # Check exact matches
        if path in self.exempt_exact:
            return True

        # Check prefix matches
        for exempt_url in self.exempt_urls:
            if path.startswith(exempt_url):
                return True

        return False
