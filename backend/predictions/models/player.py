from django.db import models
from ..models import Season

class Player(models.Model):
    name = models.CharField(max_length=255)
    # Other player-specific fields...

    def __str__(self):
        return self.name

class PlayerStat(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='stats')
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    games_played = models.IntegerField(default=0)
    points_per_game = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rebounds_per_game = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    # Other statistical fields...

    class Meta:
        unique_together = ('player', 'season')

    def __str__(self):
        return f"{self.player.name} - {self.season.year} Stats"
