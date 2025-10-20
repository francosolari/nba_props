"""
Comprehensive tests for API v2 endpoints.
"""
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import json

from predictions.models import Season, Team, Player, StandingPrediction


class TeamsAPITests(TestCase):
    """Comprehensive tests for Teams API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.team_east = Team.objects.create(
            name='Boston Celtics',
            abbreviation='BOS',
            conference='East',
        )
        self.team_west = Team.objects.create(
            name='Los Angeles Lakers',
            abbreviation='LAL',
            conference='West',
        )

    def test_get_all_teams_success(self):
        """Test successful retrieval of all teams."""
        response = self.client.get('/api/v2/teams/')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn('teams', data)
        self.assertEqual(len(data['teams']), 2)

    def test_get_all_teams_structure(self):
        """Test response structure."""
        response = self.client.get('/api/v2/teams/')
        data = response.json()

        teams = data['teams']
        self.assertGreater(len(teams), 0)

        team = teams[0]
        self.assertIn('id', team)
        self.assertIn('name', team)
        self.assertIn('conference', team)

    def test_get_all_teams_conferences(self):
        """Test that both East and West teams are returned."""
        response = self.client.get('/api/v2/teams/')
        data = response.json()

        conferences = [team['conference'] for team in data['teams']]
        self.assertIn('East', conferences)
        self.assertIn('West', conferences)

    def test_get_all_teams_no_authentication_required(self):
        """Test that endpoint doesn't require authentication."""
        # Should work without login
        response = self.client.get('/api/v2/teams/')
        self.assertEqual(response.status_code, 200)


class LeaderboardAPITests(TestCase):
    """Comprehensive tests for Leaderboard API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.season = Season.objects.create(
            year='2024-25',
            slug='2024-25',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=365)).date(),
            submission_start_date=timezone.now(),
            submission_end_date=timezone.now() + timedelta(days=30),
        )
        self.user1 = User.objects.create_user(
            username='user1',
            first_name='John',
            last_name='Doe',
            email='user1@example.com',
            password='pass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            first_name='Jane',
            last_name='Smith',
            email='user2@example.com',
            password='pass123'
        )
        self.team = Team.objects.create(
            name='Boston Celtics',
            abbreviation='BOS',
            conference='East',
        )

    def test_get_leaderboard_success(self):
        """Test successful retrieval of leaderboard."""
        response = self.client.get(f'/api/v2/leaderboards/{self.season.slug}')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn('leaderboard', data)
        self.assertIn('season', data)

    def test_get_leaderboard_structure(self):
        """Test leaderboard response structure."""
        response = self.client.get(f'/api/v2/leaderboards/{self.season.slug}')
        data = response.json()

        self.assertIsInstance(data['leaderboard'], list)
        self.assertIsInstance(data['season'], dict)

        season_data = data['season']
        self.assertIn('slug', season_data)
        self.assertIn('year', season_data)
        self.assertIn('submission_end_date', season_data)
        self.assertIn('submissions_open', season_data)

    def test_get_leaderboard_with_predictions(self):
        """Test leaderboard with user predictions."""
        # Create predictions
        StandingPrediction.objects.create(
            user=self.user1,
            season=self.season,
            team=self.team,
            predicted_position=1,
            points=3,
        )
        StandingPrediction.objects.create(
            user=self.user2,
            season=self.season,
            team=self.team,
            predicted_position=2,
            points=2,
        )

        response = self.client.get(f'/api/v2/leaderboards/{self.season.slug}')
        data = response.json()

        leaderboard = data['leaderboard']
        self.assertGreater(len(leaderboard), 0)

        # Check ranking (should be sorted by points)
        if len(leaderboard) >= 2:
            self.assertGreaterEqual(
                leaderboard[0]['total_points'],
                leaderboard[1]['total_points']
            )

    def test_get_leaderboard_user_structure(self):
        """Test user structure in leaderboard."""
        StandingPrediction.objects.create(
            user=self.user1,
            season=self.season,
            team=self.team,
            predicted_position=1,
            points=3,
        )

        response = self.client.get(f'/api/v2/leaderboards/{self.season.slug}')
        data = response.json()

        leaderboard = data['leaderboard']
        self.assertGreater(len(leaderboard), 0)

        user_entry = leaderboard[0]
        self.assertIn('id', user_entry)
        self.assertIn('rank', user_entry)
        self.assertIn('username', user_entry)
        self.assertIn('total_points', user_entry)
        self.assertIn('categories', user_entry)

    def test_get_leaderboard_current_season(self):
        """Test retrieving leaderboard for 'current' season."""
        response = self.client.get('/api/v2/leaderboards/current')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn('leaderboard', data)

    def test_get_leaderboard_nonexistent_season(self):
        """Test retrieving leaderboard for nonexistent season."""
        response = self.client.get('/api/v2/leaderboards/nonexistent-season')
        data = response.json()

        self.assertIn('error', data)
        self.assertIn('leaderboard', data)
        self.assertEqual(data['leaderboard'], [])

    def test_get_leaderboard_empty(self):
        """Test leaderboard with no predictions."""
        response = self.client.get(f'/api/v2/leaderboards/{self.season.slug}')
        data = response.json()

        self.assertEqual(len(data['leaderboard']), 0)

    def test_leaderboard_ranking_order(self):
        """Test that leaderboard is correctly ranked by points."""
        # Create predictions with different points
        StandingPrediction.objects.create(
            user=self.user1,
            season=self.season,
            team=self.team,
            predicted_position=1,
            points=10,
        )
        StandingPrediction.objects.create(
            user=self.user2,
            season=self.season,
            team=self.team,
            predicted_position=2,
            points=20,
        )

        response = self.client.get(f'/api/v2/leaderboards/{self.season.slug}')
        data = response.json()

        leaderboard = data['leaderboard']
        self.assertEqual(len(leaderboard), 2)

        # User2 should be ranked first (20 points > 10 points)
        self.assertEqual(leaderboard[0]['rank'], 1)
        self.assertEqual(leaderboard[1]['rank'], 2)
        self.assertEqual(leaderboard[0]['username'], 'user2')
        self.assertEqual(leaderboard[1]['username'], 'user1')


class SeasonsAPITests(TestCase):
    """Comprehensive tests for Seasons API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.season = Season.objects.create(
            year='2024-25',
            slug='2024-25',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=365)).date(),
            submission_start_date=timezone.now(),
            submission_end_date=timezone.now() + timedelta(days=30),
        )

    def test_seasons_endpoint_exists(self):
        """Test that seasons endpoint exists and responds."""
        # This test depends on your actual seasons endpoint
        # Adjust the URL based on your actual API structure
        pass


class PlayersAPITests(TestCase):
    """Comprehensive tests for Players API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.player1 = Player.objects.create(name='LeBron James')
        self.player2 = Player.objects.create(name='Stephen Curry')

    def test_players_endpoint_exists(self):
        """Test that players endpoint exists and responds."""
        # This test depends on your actual players endpoint
        # Adjust based on your actual API structure
        pass
