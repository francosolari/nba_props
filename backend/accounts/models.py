from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)  # One-to-One link to User
    has_paid_dues = models.BooleanField(default=False)  # Custom field to track payment

    @property
    def display_name(self):
        """
        Return something like "FirstName L." if both are set,
        otherwise fallback to user.username or something else.
        """
        first = self.user.first_name
        last = self.user.last_name
        if first and last:
            return f"{first} {last[0].upper()}."
        # if user is missing name fields, fallback
        return self.user.username

    def __str__(self):
        return self.user.username


class UserOnboarding(models.Model):
    """
    Track user onboarding progress for new users.
    Helps guide them through setting up their profile and understanding the game.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='onboarding')

    # Onboarding steps
    completed_welcome = models.BooleanField(default=False)
    completed_profile_setup = models.BooleanField(default=False)
    completed_tutorial = models.BooleanField(default=False)

    # Tracking
    onboarding_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Skip option
    skipped = models.BooleanField(default=False)

    def mark_complete(self):
        """Mark onboarding as complete"""
        from django.utils import timezone
        self.onboarding_complete = True
        self.completed_at = timezone.now()
        self.save()

    @property
    def needs_username(self):
        """Check if user needs to set a username (for Google OAuth users)"""
        # Check if username looks auto-generated (contains @)
        return '@' in self.user.username or self.user.username.startswith('user_')

    @property
    def progress_percentage(self):
        """Calculate onboarding progress as a percentage"""
        steps = [
            self.completed_welcome,
            self.completed_profile_setup,
            self.completed_tutorial
        ]
        completed = sum(steps)
        total = len(steps)
        return int((completed / total) * 100) if total > 0 else 0

    def __str__(self):
        return f"Onboarding for {self.user.username} ({self.progress_percentage}% complete)"

    class Meta:
        verbose_name = "User Onboarding"
        verbose_name_plural = "User Onboardings"


@receiver(post_save, sender=User)
def create_user_onboarding(sender, instance, created, **kwargs):
    """
    Automatically create UserOnboarding when a new user is created
    """
    if created:
        UserOnboarding.objects.get_or_create(user=instance)
