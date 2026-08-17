from django.db import models
from ..models import Season

class Player(models.Model):
    name = models.CharField(max_length=255)
    # NBA.com's numeric person ID (from the nba_api `players` static index).
    # Used to build headshot CDN URLs; left null until backfilled.
    nba_player_id = models.IntegerField(null=True, blank=True, unique=True, db_index=True)
    # Other player-specific fields...

    @property
    def headshot_url(self):
        if not self.nba_player_id:
            return None
        # 260x190 (vs. the 1040x760 original) avoids moire/aliasing when the
        # browser downsamples to the small avatar sizes we display at.
        return f"https://cdn.nba.com/headshots/nba/latest/260x190/{self.nba_player_id}.png"

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
