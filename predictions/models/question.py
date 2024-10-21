from django.db import models
from ..models import Team, Season, PlayerStat, Player, Award, Odds, PlayoffPrediction
from polymorphic.models import PolymorphicModel


class Question(PolymorphicModel):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    text = models.TextField()
    point_value = models.FloatField(default=0.5)
    correct_answer = models.CharField(max_length=100, null=True, blank=True)
    is_manual = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)

    # class Meta:
    # abstract = True

    def __str__(self):
        return self.text


class SuperlativeQuestion(Question):
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    winners = models.ManyToManyField(Player, related_name='superlative_wins', blank=True)
    is_finalized = models.BooleanField(default=False)

    def update_winners_from_odds(self, date):
        """
        Update the winners based on the latest odds for the specified date.
        """
        latest_odds = Odds.objects.filter(award=self.award, timestamp=date).order_by('-value')
        top_two_players = latest_odds.values_list('player', flat=True)[:2]
        self.winners.set(Player.objects.filter(id__in=top_two_players))
        self.save()

    def finalize_winners(self, winner_ids):
        """
        Manually set the final winners of the superlative.
        """
        self.winners.set(Player.objects.filter(id__in=winner_ids))
        self.is_finalized = True
        self.save()


class PropQuestion(Question):
    outcome_type = models.CharField(max_length=20, choices=[('over_under', 'Over/Under'), ('yes_no', 'Yes/No')])
    related_player = models.ForeignKey(Player, on_delete=models.CASCADE, null=True, blank=True)
    line = models.FloatField(null=True, blank=True)  # Only for 'over_under' type
    # description = models.TextField()  # Additional details, if anyW


class PlayerStatPredictionQuestion(Question):
    player_stat = models.ForeignKey(PlayerStat, on_delete=models.CASCADE)
    stat_type = models.CharField(max_length=50)
    fixed_value = models.FloatField(null=True, blank=True)
    current_leaders = models.JSONField(null=True, blank=True)  # To store a snapshot of top performers
    top_performers = models.JSONField(null=True, blank=True)  # To display the top 5 for comparative purposes

class HeadToHeadQuestion(Question):
    """
    Question to choose between two teams
    Used for opening night or trade bets -- Knicks vs Minnesota
    """
    team1 = models.ForeignKey(Team, related_name='h2h_team1', on_delete=models.CASCADE)
    team2 = models.ForeignKey(Team, related_name='h2h_team2', on_delete=models.CASCADE)
    def __str__(self):
        return f"{self.text} ({self.team1.name} vs {self.team2.name})"

class InSeasonTournamentQuestion(Question):
    """
    Represents questions related to the In-Season Tournament.
    """

    # Type of tournament prediction
    PREDICTION_TYPES = [
        ('group_winner', 'Group Winner'),
        ('wildcard', 'Wildcard'),
        ('conference_winner', 'Conference Winner'),
        ('tiebreaker', 'Tiebreaker Points'),
    ]

    prediction_type = models.CharField(max_length=50, choices=PREDICTION_TYPES)

    # For group_winner questions
    ist_group = models.CharField(max_length=50, null=True, blank=True)  # e.g., 'East Group A'

    # For tiebreaker questions
    is_tiebreaker = models.BooleanField(default=False)

    def __str__(self):
        if self.prediction_type == 'group_winner':
            return f"{self.text} ({self.ist_group})"
        elif self.prediction_type == 'wildcard':
            return f"{self.text} (Wildcard)"
        elif self.prediction_type == 'conference_winner':
            return f"{self.text} (Conference Winner)"
        elif self.prediction_type == 'tiebreaker':
            return f"{self.text} (Tiebreaker)"
        return self.text

class NBAFinalsPredictionQuestion(Question):
    group_name = models.CharField(max_length=50, null=True, blank=True)
    def create_playoff_predictions(self, user, season):
        """
        Create two PlayoffPrediction objects for the predicted east and west teams
        """
        # Create PlayoffPrediction for east team
        PlayoffPrediction.objects.create(
            user=user,
            season=season,
            team=self.east_team,
            wins=self.predicted_wins if self.predicted_winner == self.east_team else self.predicted_losses,
            losses=self.predicted_losses if self.predicted_winner == self.east_team else self.predicted_wins,
            round=4  # NBA Finals
        )

        # Create PlayoffPrediction for west team
        PlayoffPrediction.objects.create(
            user=user,
            season=season,
            team=self.west_team,
            wins=self.predicted_wins if self.predicted_winner == self.west_team else self.predicted_losses,
            losses=self.predicted_losses if self.predicted_winner == self.west_team else self.predicted_wins,
            round=4  # NBA Finals
        )