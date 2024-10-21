from django.db import models
from django.contrib.auth.models import User
from .season import Season


class UserStats(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='season_stats')
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='user_stats')
    points = models.IntegerField(default=0)
    # Optional: Add other fields like rank, achievements, etc.

    class Meta:
        unique_together = ('user', 'season')
        ordering = ['-points']  # Default ordering by points descending
        indexes = [
            models.Index(fields=['season', '-points']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.season.name}: {self.points} points"