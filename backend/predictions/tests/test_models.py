"""
Tests for the prediction models.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError
from predictions.models.season import Season
from predictions.models.team import Team
from predictions.models.prediction import StandingPrediction, PlayoffPrediction


class PredictionModelTests(TestCase):
    """Test cases for prediction models."""

    def setUp(self):
        """Set up test data."""
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        
        # Create a test season
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        self.season = Season.objects.create(
            year='2023-24',
            slug='2023-24',
            start_date=now.date() - timedelta(days=30),
            end_date=now.date() + timedelta(days=150),
            submission_start_date=now - timedelta(days=7),
            submission_end_date=now + timedelta(days=21)
        )
        
        # Create test teams
        self.team_east = Team.objects.create(
            name='Boston Celtics',
            conference='East'
        )
        
        self.team_west = Team.objects.create(
            name='Los Angeles Lakers',
            conference='West'
        )

    def test_standing_prediction_creation(self):
        """Test that a standing prediction can be created."""
        prediction = StandingPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team_east,
            predicted_position=1
        )
        
        self.assertEqual(prediction.user, self.user)
        self.assertEqual(prediction.season, self.season)
        self.assertEqual(prediction.team, self.team_east)
        self.assertEqual(prediction.predicted_position, 1)
        self.assertEqual(prediction.points, 0)  # Default value
        
        # Test string representation
        expected_str = f"{self.user.username}'s predicted position for {self.team_east.name} in {self.season}"
        self.assertEqual(str(prediction), expected_str)

    def test_playoff_prediction_creation(self):
        """Test that a playoff prediction can be created."""
        prediction = PlayoffPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team_west,
            wins=4,
            losses=2,
            round=4  # NBA Finals
        )
        
        self.assertEqual(prediction.user, self.user)
        self.assertEqual(prediction.season, self.season)
        self.assertEqual(prediction.team, self.team_west)
        self.assertEqual(prediction.wins, 4)
        self.assertEqual(prediction.losses, 2)
        self.assertEqual(prediction.round, 4)
        self.assertEqual(prediction.points, 0)  # Default value
        
        # Test string representation
        expected_str = f"{self.user.username}'s predicted playoff performance for {self.team_west.name} in {self.season}"
        self.assertEqual(str(prediction), expected_str)

    def test_unique_together_constraint(self):
        """Test that a user cannot create duplicate predictions for the same team and season."""
        # Create a standing prediction
        StandingPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team_east,
            predicted_position=1
        )
        
        # Try to create another standing prediction for the same user, season, and team
        with self.assertRaises(IntegrityError):
            StandingPrediction.objects.create(
                user=self.user,
                season=self.season,
                team=self.team_east,
                predicted_position=2
            )
        
        # Create a playoff prediction
        PlayoffPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team_west,
            wins=4,
            losses=2,
            round=4
        )
        
        # Try to create another playoff prediction for the same user, season, and team
        with self.assertRaises(IntegrityError):
            PlayoffPrediction.objects.create(
                user=self.user,
                season=self.season,
                team=self.team_west,
                wins=3,
                losses=4,
                round=4
            )