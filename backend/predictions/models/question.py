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

    # Current odds-based leader (automatically updated from scraper)
    current_leader = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leading_awards',
        help_text="Player currently leading in betting odds"
    )
    current_leader_odds = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Current betting odds for leader (e.g., +150)"
    )

    # Runner-up (second place in odds)
    current_runner_up = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='runner_up_awards',
        help_text="Player currently second in betting odds"
    )
    current_runner_up_odds = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Current betting odds for runner-up (e.g., +300)"
    )

    # When odds were last updated
    last_odds_update = models.DateTimeField(null=True, blank=True)

    def update_from_latest_odds(self):
        """
        Update current leader and runner-up from the latest odds.
        Called automatically after scraping new odds.
        """
        from django.utils import timezone

        # Get latest odds for this award (for the current season)
        latest_scrape = Odds.objects.filter(
            award=self.award,
            season=self.season
        ).order_by('-scraped_at').values('scraped_at').first()

        if not latest_scrape:
            return

        # Get top 2 from that scrape
        top_odds = Odds.objects.filter(
            award=self.award,
            season=self.season,
            scraped_at=latest_scrape['scraped_at']
        ).order_by('rank')[:2]

        if len(top_odds) >= 1:
            self.current_leader = top_odds[0].player
            self.current_leader_odds = top_odds[0].odds_value
            # Auto-set as provisional correct answer if not finalized
            if not self.is_finalized:
                self.correct_answer = top_odds[0].player.name

        if len(top_odds) >= 2:
            self.current_runner_up = top_odds[1].player
            self.current_runner_up_odds = top_odds[1].odds_value

        self.last_odds_update = timezone.now()
        self.save()

    def update_winners_from_odds(self, date=None):
        """
        DEPRECATED: Use update_from_latest_odds() instead.
        Kept for backwards compatibility.
        """
        self.update_from_latest_odds()

    def finalize_winners(self, winner_player_name):
        """
        Manually set the final winner of the award.

        Args:
            winner_player_name: Name of the player who won (string)
        """
        self.correct_answer = winner_player_name
        self.is_finalized = True
        self.save()

        # Optionally, add to winners M2M field
        try:
            winner_player = Player.objects.get(name=winner_player_name)
            self.winners.add(winner_player)
        except Player.DoesNotExist:
            pass

    def get_scoring_position_players(self):
        """
        Get list of players currently in scoring position (top 2).
        Returns dict with leader and runner_up.
        """
        return {
            'leader': {
                'player': self.current_leader,
                'odds': self.current_leader_odds,
            },
            'runner_up': {
                'player': self.current_runner_up,
                'odds': self.current_runner_up_odds,
            },
            'last_updated': self.last_odds_update
        }


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
        ('champion', 'NBA Cup Champion'),
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
        elif self.prediction_type == 'champion':
            return f"{self.text} (NBA Cup Champion)"
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