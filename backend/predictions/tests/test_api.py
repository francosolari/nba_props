"""
Tests for the API endpoints.
"""
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from predictions.models.season import Season
from predictions.models.team import Team
from predictions.models.player import Player
from predictions.models.prediction import StandingPrediction


class APITestCase(TestCase):
    """Base test case for API tests."""

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

        # Create test players
        self.player1 = Player.objects.create(
            name='LeBron James'
        )

        self.player2 = Player.objects.create(
            name='Jayson Tatum'
        )

        # Create test predictions
        self.prediction = StandingPrediction.objects.create(
            user=self.user,
            season=self.season,
            team=self.team_east,
            predicted_position=1
        )

        # Set up Django test client
        self.client = Client()
        self.client.force_login(self.user)


class LeaderboardAPITests(APITestCase):
    """Test cases for the leaderboard API."""

    def test_get_leaderboard(self):
        """Test retrieving the leaderboard."""
        url = reverse('leaderboard', kwargs={'season_slug': self.season.slug})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        # API returns 'top_users' not 'leaderboard'
        self.assertIn('top_users', data)

        # Verify the response structure
        leaderboard = data['top_users']
        self.assertIsInstance(leaderboard, list)


class TeamAPITests(APITestCase):
    """Test cases for the teams API."""

    def test_get_teams(self):
        """Test retrieving the teams list."""
        url = reverse('teams')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('teams', data)

        # Verify the response structure
        teams = data['teams']
        self.assertIsInstance(teams, list)
        self.assertEqual(len(teams), 2)  # We created 2 teams

        # Verify team data
        team_data = teams[0]
        self.assertIn('id', team_data)
        self.assertIn('name', team_data)
        self.assertIn('conference', team_data)


class PlayerAPITests(APITestCase):
    """Test cases for the players API."""

    def test_get_players(self):
        """Test retrieving the players list."""
        url = reverse('players')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('players', data)

        # Verify the response structure
        players = data['players']
        self.assertIsInstance(players, list)
        self.assertEqual(len(players), 2)  # We created 2 players

        # Verify player data
        player_data = players[0]
        self.assertIn('id', player_data)
        self.assertIn('name', player_data)
        # Note: 'team' field may not be present if player has no team assigned


class UserPredictionsAPITests(APITestCase):
    """Test cases for the user predictions API."""

    def test_get_user_predictions(self):
        """Test retrieving a user's predictions."""
        url = reverse('user_predictions', kwargs={
            'season_slug': self.season.slug
        })
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        # API returns a list directly, not wrapped in 'predictions'
        self.assertIsInstance(data, list)

        # Verify standing predictions structure
        if data:
            standing = data[0]
            self.assertIn('team_name', standing)
            self.assertIn('predicted_position', standing)


class SubmitPredictionsAPITests(APITestCase):
    """Test cases for submitting predictions API."""

    def test_submit_predictions(self):
        """Test submitting predictions."""
        url = reverse('submit_answers', kwargs={'season_slug': self.season.slug})

        # Prepare prediction data
        import json
        data = {
            'standings': [
                {
                    'team_id': self.team_west.id,
                    'predicted_position': 1
                }
            ]
        }

        response = self.client.post(url, json.dumps(data), content_type='application/json')

        # Check response
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        # API returns 'status' not 'success'
        self.assertIn('status', response_data)
        self.assertEqual(response_data['status'], 'success')

        # Verify the prediction was created
        prediction = StandingPrediction.objects.filter(
            user=self.user,
            season=self.season,
            team=self.team_west
        ).first()

        self.assertIsNotNone(prediction)
        self.assertEqual(prediction.predicted_position, 1)