from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q, F
from django.utils.text import slugify
from pygments.lexer import default

from ..constants import SEASON_TYPES
from .team import Team
from .season import Season

class BaseStandings(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    season_type = models.CharField(max_length=50, choices=SEASON_TYPES)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)

    class Meta:
        abstract = True
        unique_together = ('team', 'season', 'season_type')  # Ensures there one set of teams per season

    def __str__(self):
        return f"{self.team.name} - {self.season.year} - {self.season_type} Standings"


class RegularSeasonStandings(BaseStandings):
    position = models.IntegerField(null=True, blank=True)
    season_type = models.CharField(max_length=50, choices=[('regular', 'Regular Season')], default='regular')

    class Meta:
        verbose_name_plural = 'Regular Season Standings'
        unique_together = ('team', 'season')  # Ensures there's only one set of stats per team per season

    @property
    def win_percentage(self):
        total_games = self.wins + self.losses
        if total_games > 0:
            return round(self.wins / total_games, 3)
        return None  # Or any other value you prefer


class InSeasonTournamentStandings(BaseStandings):
    season_type = models.CharField(max_length=50, choices=[('ist', 'In-Season Tournament')], default='ist')

    class Meta:
        unique_together = ('team', 'season')  # Ensures there's only one set of stats per team per season
        verbose_name_plural = 'IST Standings'

    ist_group = models.CharField(max_length=50)
    ist_group_rank = models.IntegerField()
    ist_group_gb = models.IntegerField()
    ist_wildcard_rank = models.IntegerField()
    ist_knockout_rank = models.IntegerField()
    ist_wildcard_gb = models.IntegerField()
    # Differential used for tie breakers
    ist_differential = models.IntegerField()
    # Total points currently used for tiebreakers
    ist_points = models.IntegerField()
    # Clinching indicators
    ist_clinch_group = models.BooleanField(default=False)
    ist_clinch_knockout = models.BooleanField(default=False)
    ist_clinch_wildcard = models.BooleanField(default=False)
    # NBA Cup Champion (manually set - not from API)
    ist_champion = models.BooleanField(default=False)

# If you look at the GAME_ID value if the first three digits will tell you what type of game it is. See below:
# 001* - Preseason Game
# 002* - Regular Season Game
# 003* - All-Star Game (need to confirm this)
# 004* - Postseason Game
class PostSeasonStandings(BaseStandings):
    class Meta:
        verbose_name_plural = 'Post-Season Standings'
        unique_together = ('team', 'season')  # Ensures there's only one set of stats per team per season

    season_type = models.CharField(max_length=50, choices=[('post', 'Post Season')], default='post')
    opponent_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='opponent_playoff', null=True)
    ROUND_CHOICES = [
        (1, 'First Round'),
        (2, 'Conference Semifinals'),
        (3, 'Conference Finals'),
        (4, 'NBA Finals'),
    ]
    round = models.IntegerField(default=4, choices=ROUND_CHOICES)

    def get_round_display_alias(self):
        round_mapping = {
            1: 'First Round',
            2: 'Conference Semifinals',
            3: 'Conference Finals',
            4: 'NBA Finals',
        }
        return round_mapping[self.round]
