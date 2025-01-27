from django.contrib.auth.models import User
from django.db import models

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
