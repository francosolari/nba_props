"""
Comprehensive tests for prediction models.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from predictions.models import (
    Season, Team, Player, PlayerStat,
    StandingPrediction, PlayoffPrediction,
)


class SeasonModelTests(TestCase):
    """Comprehensive tests for Season model."""

    def setUp(self):
        """Set up test data."""
        self.season_data = {
            'year': '2024-25',
            'start_date': timezone.now().date(),
            'end_date': (timezone.now() + timedelta(days=365)).date(),
            'submission_start_date': timezone.now(),
            'submission_end_date': timezone.now() + timedelta(days=30),
        }

    def test_season_creation(self):
        """Test creating a season."""
        season = Season.objects.create(**self.season_data)
        self.assertEqual(season.year, '2024-25')
        self.assertIsNotNone(season.slug)

    def test_season_slug_auto_generation(self):
        """Test that slug is auto-generated from year."""
        season = Season.objects.create(**self.season_data)
        self.assertEqual(season.slug, '2024-25')

    def test_season_slug_unique(self):
        """Test that slug must be unique."""
        Season.objects.create(**self.season_data)
        with self.assertRaises(Exception):
            Season.objects.create(**self.season_data)

    def test_season_str_representation(self):
        """Test string representation."""
        season = Season.objects.create(**self.season_data)
        self.assertEqual(str(season), '2024-25')

    def test_season_date_validation(self):
        """Test that end_date should be after start_date."""
        season = Season.objects.create(**self.season_data)
        self.assertGreater(season.end_date, season.start_date)


class TeamModelTests(TestCase):
    """Comprehensive tests for Team model."""

    def setUp(self):
        """Set up test data."""
        self.team_data_east = {
            'name': 'Boston Celtics',
            'abbreviation': 'BOS',
            'conference': 'East',
        }
        self.team_data_west = {
            'name': 'Los Angeles Lakers',
            'abbreviation': 'LAL',
            'conference': 'West',
        }

    def test_team_creation(self):
        """Test creating a team."""
        team = Team.objects.create(**self.team_data_east)
        self.assertEqual(team.name, 'Boston Celtics')
        self.assertEqual(team.abbreviation, 'BOS')
        self.assertEqual(team.conference, 'East')

    def test_team_str_representation(self):
        """Test string representation."""
        team = Team.objects.create(**self.team_data_east)
        self.assertEqual(str(team), 'Boston Celtics')

    def test_team_conferences(self):
        """Test creating teams in both conferences."""
        team_east = Team.objects.create(**self.team_data_east)
        team_west = Team.objects.create(**self.team_data_west)

        self.assertEqual(team_east.conference, 'East')
        self.assertEqual(team_west.conference, 'West')

    def test_team_abbreviation_optional(self):
        """Test that abbreviation can be optional."""
        team_data = self.team_data_east.copy()
        team_data.pop('abbreviation')
        team = Team.objects.create(**team_data)
        self.assertIsNotNone(team)


class PlayerModelTests(TestCase):
    """Comprehensive tests for Player model."""

    def setUp(self):
        """Set up test data."""
        self.player_data = {
            'name': 'LeBron James',
        }

    def test_player_creation(self):
        """Test creating a player."""
        player = Player.objects.create(**self.player_data)
        self.assertEqual(player.name, 'LeBron James')

    def test_player_str_representation(self):
        """Test string representation."""
        player = Player.objects.create(**self.player_data)
        self.assertEqual(str(player), 'LeBron James')


class PlayerStatModelTests(TestCase):
    """Comprehensive tests for PlayerStat model."""

    def setUp(self):
        """Set up test data."""
        self.season = Season.objects.create(
            year='2024-25',
            slug='2024-25',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=365)).date(),
            submission_start_date=timezone.now(),
            submission_end_date=timezone.now() + timedelta(days=30),
        )
        self.player = Player.objects.create(name='Stephen Curry')

    def test_player_stat_creation(self):
        """Test creating player stats."""
        stat = PlayerStat.objects.create(
            player=self.player,
            season=self.season,
            games_played=82,
            points_per_game=30.5,
            rebounds_per_game=5.2,
        )
        self.assertEqual(stat.player, self.player)
        self.assertEqual(stat.season, self.season)
        self.assertEqual(stat.games_played, 82)

    def test_player_stat_unique_constraint(self):
        """Test unique together constraint for player and season."""
        PlayerStat.objects.create(
            player=self.player,
            season=self.season,
            games_played=82,
        )

        with self.assertRaises(Exception):
            PlayerStat.objects.create(
                player=self.player,
                season=self.season,
                games_played=75,
            )

    def test_player_stat_str_representation(self):
        """Test string representation."""
        stat = PlayerStat.objects.create(
            player=self.player,
            season=self.season,
            games_played=82,
        )
        expected_str = f"{self.player.name} - {self.season.year} Stats"
        self.assertEqual(str(stat), expected_str)

    def test_player_stat_decimal_precision(self):
        """Test decimal field precision."""
        stat = PlayerStat.objects.create(
            player=self.player,
            season=self.season,
            games_played=82,
            points_per_game=30.56,
            rebounds_per_game=5.23,
        )
        # Decimal fields store exact values
        self.assertEqual(float(stat.points_per_game), 30.56)
        self.assertEqual(float(stat.rebounds_per_game), 5.23)


class StandingPredictionModelTests(TestCase):
    """Comprehensive tests for StandingPrediction model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.season = Season.objects.create(
            year='2024-25',
            slug='2024-25',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=365)).date(),
            submission_start_date=timezone.now(),
            submission_end_date=timezone.now() + timedelta(days=30),
        )
        self.team = Team.objects.create(
            name='Boston Celtics',
            abbreviation='BOS',
            conference='East',
        )

    def test_standing_prediction_creation(self):
        """Test creating a standing prediction."""
        prediction = StandingPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team,
            predicted_position=1,
        )
        self.assertEqual(prediction.user, self.user)
        self.assertEqual(prediction.season, self.season)
        self.assertEqual(prediction.team, self.team)
        self.assertEqual(prediction.predicted_position, 1)

    def test_standing_prediction_default_points(self):
        """Test default points value."""
        prediction = StandingPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team,
            predicted_position=1,
        )
        self.assertEqual(prediction.points, 0)

    def test_standing_prediction_points_assignment(self):
        """Test assigning points."""
        prediction = StandingPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team,
            predicted_position=1,
            points=3,
        )
        self.assertEqual(prediction.points, 3)


class PlayoffPredictionModelTests(TestCase):
    """Comprehensive tests for PlayoffPrediction model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.season = Season.objects.create(
            year='2024-25',
            slug='2024-25',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=365)).date(),
            submission_start_date=timezone.now(),
            submission_end_date=timezone.now() + timedelta(days=30),
        )
        self.team = Team.objects.create(
            name='Boston Celtics',
            abbreviation='BOS',
            conference='East',
        )

    def test_playoff_prediction_creation(self):
        """Test creating a playoff prediction."""
        prediction = PlayoffPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team,
            wins=4,
            losses=2,
            round=4,  # NBA Finals
        )
        self.assertEqual(prediction.user, self.user)
        self.assertEqual(prediction.wins, 4)
        self.assertEqual(prediction.losses, 2)
        self.assertEqual(prediction.round, 4)

    def test_playoff_prediction_default_points(self):
        """Test default points value."""
        prediction = PlayoffPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team,
            wins=4,
            losses=2,
            round=4,
        )
        self.assertEqual(prediction.points, 0)
