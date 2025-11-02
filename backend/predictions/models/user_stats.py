from django.db import models
from django.conf import settings
from .season import Season


class UserStats(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='season_stats')
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='user_stats')
    points = models.FloatField(default=0)
    entry_fee_paid = models.BooleanField(default=False)
    entry_fee_paid_at = models.DateTimeField(null=True, blank=True)
    # Optional: Add other fields like rank, achievements, etc.

    class Meta:
        unique_together = ('user', 'season')
        ordering = ['-points']  # Default ordering by points descending
        indexes = [
            models.Index(fields=['season', '-points']),
        ]

    def __str__(self):
        status = "paid" if self.entry_fee_paid else "unpaid"
        return f"{self.user.username} - {self.season}: {self.points} points ({status})"
