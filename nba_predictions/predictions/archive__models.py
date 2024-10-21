from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q, F
from django.utils.text import slugify

SEASON_TYPES = (
    ('regular', 'Regular Season'),
    ('post', 'Post Season'),
    ('ist', 'In-Season Tournament'),
)


class Season(models.Model):
    year = models.CharField(max_length=7)
    slug = models.SlugField(max_length=7, unique=True, blank=True)  # e.g., "2023-2024"
    start_date = models.DateField()
    end_date = models.DateField()
    submission_start_date = models.DateField()
    submission_end_date = models.DateField()

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.year)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.year


class Team(models.Model):
    name = models.CharField(max_length=100)
    abbreviation = models.CharField(default='', max_length=3, null=True)
    conference = models.CharField(max_length=4)  # "East" or "West"

    def __str__(self):
        return self.name


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
    season_type = models.CharField(max_length=50, choices=[('ist', 'In-Season Tournament')], default='regular')

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


class TeamSeasonStats(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='teamseason_stats')
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='seasonseason_stats')
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    position = models.IntegerField(null=True, blank=True)  # You can use this to store end-of-season positions

    @property
    def win_percentage(self):
        total_games = self.wins + self.losses
        if total_games > 0:
            return self.wins / total_games
        return None  # Or any other value you prefer

    class Meta:
        unique_together = ('team', 'season')  # Ensures there's only one set of stats per team per season

    def __str__(self):
        return f"{self.team.name} {self.season} Stats"


# class Prediction(models.Model):
#     user = models.ForeignKey(User, on_delete=models.CASCADE)
#     season = models.ForeignKey(Season, on_delete=models.CASCADE)
#
#     def __str__(self):
#         return f"{self.user.username}'s predictions for {self.season.year}"
#
#
# class StandingPrediction(models.Model):
#     prediction = models.ForeignKey(Prediction, on_delete=models.CASCADE, related_name='standing_predictions')
#     team = models.ForeignKey(Team, on_delete=models.CASCADE)
#     predicted_position = models.IntegerField()
#
#     class Meta:
#         unique_together = ('prediction', 'team')
#
#     def __str__(self):
#         return f"{self.prediction.user.username}'s predicted position for {self.team.name} in {self.prediction.season.year}"

class Prediction(models.Model):
    user = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, null=True, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)

    class Meta:
        abstract = True


class StandingPrediction(Prediction):
    predicted_position = models.IntegerField()

    class Meta:
        unique_together = ('season', 'team')

    def __str__(self):
        return f"{self.user.username}'s predicted position for {self.team.name} in {self.season}"


class PlayoffPrediction(Prediction):
    SCORE_CHOICES = [
        (0, "0"),
        (1, "1"),
        (2, "2"),
        (3, "3"),
        (4, "4")
    ]
    ROUND_CHOICES = [
        (1, 'First Round'),
        (2, 'Conference Semifinals'),
        (3, 'Conference Finals'),
        (4, 'NBA Finals'),
    ]

    wins = models.IntegerField(choices=SCORE_CHOICES, default=0)
    losses = models.IntegerField(choices=SCORE_CHOICES, default=0)
    round = models.IntegerField(default=4, choices=ROUND_CHOICES)

    class Meta:
        unique_together = ('season', 'team')

    def __str__(self):
        return f"{self.user.username}'s predicted playoff performance for {self.team.name} in {self.season}"


class Question(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    text = models.TextField()
    line = models.FloatField(null=True)
    value = models.CharField(max_length=50, null=True)
    answer_type = models.CharField(max_length=50)
    correct_answer = models.CharField(max_length=100, null=True, blank=True)
    point_value = models.FloatField(default=1.0)

    def __str__(self):
        return self.text


class Answer(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, limit_choices_to=Q(season_id=F('season_id')))
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    answer = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.user.username}'s answer to '{self.question.text}'"


class Award(models.Model):
    """
    Class for end of season awards
    """
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class Odds(models.Model):
    """
    Class to store odds for awards
    """
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=5, decimal_places=2)
    timestamp = models.DateField()

    class Meta:
        ordering = ['-timestamp']
        unique_together = ('player', 'award', 'timestamp')

    def __str__(self):
        return f"{self.player.name} - {self.award.name}: {self.value} ({self.timestamp})"
