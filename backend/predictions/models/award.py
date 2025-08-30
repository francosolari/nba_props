from django.db import models
from ..models import Player, Season

class Award(models.Model):
    name = models.CharField(max_length=255, unique=True)
    def __str__(self):
        return self.name

class Odds(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=5, decimal_places=2)
    timestamp = models.DateField()

    class Meta:
        ordering = ['-timestamp']
        unique_together = ('player', 'award', 'timestamp')

    def __str__(self):
        return f"{self.player.name} - {self.award.name}: {self.value} ({self.timestamp})"


class AwardWinner(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    # JSON field to hold finalists after award is decided
    finalists = models.JSONField(null=True)