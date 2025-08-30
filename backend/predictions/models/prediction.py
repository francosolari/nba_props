from django.db import models
from django.contrib.auth.models import User
from django.db.models import IntegerField

from ..models import Team, Season

class Prediction(models.Model):
    user = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, null=True, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    points = models.IntegerField(default=0)
    class Meta:
        abstract = True


class StandingPrediction(Prediction):
    predicted_position = models.IntegerField()

    class Meta:
        unique_together = ('user', 'season', 'team')

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
        unique_together = ('user', 'season', 'team')

    def __str__(self):
        return f"{self.user.username}'s predicted playoff performance for {self.team.name} in {self.season}"

# class ISTPrediction(Prediction):
#     class Meta:
#         unique_together = ('user', 'season', 'team')
#     # Letter group or wild card
#     ist_group = models.CharField(max_length=20)

