from django.contrib.auth.models import User
from django.db import models

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)  # One-to-One link to User
    has_paid_dues = models.BooleanField(default=False)  # Custom field to track payment

    def __str__(self):
        return self.user.username