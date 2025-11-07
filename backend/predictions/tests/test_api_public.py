"""
Test suite for public API endpoints (no authentication required).

Tests for endpoints in:
- seasons.py (GET /api/v2/seasons, /api/v2/seasons/latest, /api/v2/seasons/user-participated)
- teams.py (GET /api/v2/teams)
- players.py (GET /api/v2/players)
- homepage.py (GET /api/v2/homepage/*)

Related to: nba_predictions-33 (P0 - API Testing: Public endpoints)
Target: ~40 tests covering GET endpoints, filtering, pagination, error cases, response schemas
"""

import pytest
from django.test import Client
from django.contrib.auth import get_user_model
from predictions.tests.factories import (
    SeasonFactory,
    CurrentSeasonFactory,
    PastSeasonFactory,
    TeamFactory,
    EasternTeamFactory,
    WesternTeamFactory,
    PlayerFactory,
    UserFactory,
    AnswerFactory,
    PropQuestionFactory,
    StandingPredictionFactory,
    UserStatsFactory,
)
from predictions.models import (
    Season,
    Team,
    Player,
    RegularSeasonStandings,
    UserStats,
    Prediction,
)
from datetime import date, timedelta

User = get_user_model()


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return Client()


@pytest.fixture
def auth_client(api_client):
    """Authenticated API client with regular user."""
    user = UserFactory()
    api_client.force_login(user)
    api_client.user = user  # Store for easy access
    return api_client


@pytest.fixture
def sample_seasons():
    """Create a set of test seasons."""
    current = CurrentSeasonFactory(
        slug='24-25',
        year='24-25',
        start_date=date.today() - timedelta(days=30),
        end_date=date.today() + timedelta(days=150)
    )

    past1 = PastSeasonFactory(
        slug='23-24',
        year='23-24',
        start_date=date.today() - timedelta(days=365),
        end_date=date.today() - timedelta(days=180)
    )

    past2 = PastSeasonFactory(
        slug='22-23',
        year='22-23',
        start_date=date.today() - timedelta(days=730),
        end_date=date.today() - timedelta(days=545)
    )

    return {'current': current, 'past1': past1, 'past2': past2}


@pytest.fixture
def sample_teams():
    """Create a set of test teams."""
    east_teams = [
        EasternTeamFactory(name='Boston Celtics', abbreviation='BOS'),
        EasternTeamFactory(name='Miami Heat', abbreviation='MIA'),
        EasternTeamFactory(name='Milwaukee Bucks', abbreviation='MIL'),
    ]

    west_teams = [
        WesternTeamFactory(name='Los Angeles Lakers', abbreviation='LAL'),
        WesternTeamFactory(name='Golden State Warriors', abbreviation='GSW'),
        WesternTeamFactory(name='Denver Nuggets', abbreviation='DEN'),
    ]

    return {'east': east_teams, 'west': west_teams}


@pytest.fixture
def sample_players():
    """Create a set of test players."""
    return [
        PlayerFactory(name='LeBron James'),
        PlayerFactory(name='Stephen Curry'),
        PlayerFactory(name='Giannis Antetokounmpo'),
        PlayerFactory(name='Nikola Jokic'),
    ]


# ============================================================================
# Seasons Endpoint Tests
# ============================================================================

@pytest.mark.django_db(transaction=True)
class TestSeasonsEndpoint:
    """Test suite for /api/v2/seasons endpoints."""

    def test_list_seasons_success(self, api_client):
        """Test listing all seasons returns correct data in descending order."""
        # Clear any existing seasons
        Season.objects.all().delete()

        # Create test seasons
        current = CurrentSeasonFactory(
            slug='24-25',
            year='24-25',
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=150)
        )
        past1 = PastSeasonFactory(
            slug='23-24',
            year='23-24',
            start_date=date.today() - timedelta(days=365),
            end_date=date.today() - timedelta(days=180)
        )
        past2 = PastSeasonFactory(
            slug='22-23',
            year='22-23',
            start_date=date.today() - timedelta(days=730),
            end_date=date.today() - timedelta(days=545)
        )

        response = api_client.get('/api/v2/seasons/')

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 3

        # Verify descending order by start_date
        assert data[0]['slug'] == '24-25'  # Current season first
        assert data[1]['slug'] == '23-24'
        assert data[2]['slug'] == '22-23'

    def test_list_seasons_response_schema(self, api_client, sample_seasons):
        """Test that season response includes all required fields."""
        response = api_client.get('/api/v2/seasons/')

        assert response.status_code == 200
        data = response.json()

        season = data[0]
        required_fields = ['slug', 'year', 'start_date', 'end_date',
                          'submission_start_date', 'submission_end_date']

        for field in required_fields:
            assert field in season, f"Missing required field: {field}"

    def test_list_seasons_empty_database(self, api_client):
        """Test listing seasons when none exist."""
        Season.objects.all().delete()

        response = api_client.get('/api/v2/seasons/')

        assert response.status_code == 200
        assert response.json() == []

    def test_list_seasons_unauthenticated_access(self, api_client):
        """Test that unauthenticated users can access seasons endpoint."""
        Season.objects.all().delete()
        CurrentSeasonFactory.create_batch(3)

        response = api_client.get('/api/v2/seasons/')

        assert response.status_code == 200
        assert len(response.json()) == 3

    def test_latest_season_success(self, api_client, sample_seasons):
        """Test getting latest season returns the most recent one."""
        response = api_client.get('/api/v2/seasons/latest')

        assert response.status_code == 200
        data = response.json()

        assert 'slug' in data
        assert data['slug'] == '24-25'  # Current season with latest start_date

    def test_latest_season_empty_database(self, api_client):
        """Test latest season endpoint when no seasons exist."""
        Season.objects.all().delete()

        response = api_client.get('/api/v2/seasons/latest')

        assert response.status_code == 200
        data = response.json()
        assert data['slug'] is None

    def test_user_participated_seasons_unauthenticated(self, api_client):
        """Test that unauthenticated users get empty list for participated seasons."""
        response = api_client.get('/api/v2/seasons/user-participated')

        assert response.status_code == 200
        assert response.json() == []

    def test_user_participated_seasons_with_answers(self, auth_client, sample_seasons):
        """Test participated seasons returns seasons where user submitted answers."""
        # Create answer for current season
        question = PropQuestionFactory(season=sample_seasons['current'])
        AnswerFactory(user=auth_client.user, question=question)

        response = auth_client.get('/api/v2/seasons/user-participated')

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 1
        assert data[0]['slug'] == '24-25'

    def test_user_participated_seasons_with_predictions(self, auth_client, sample_seasons, sample_teams):
        """Test participated seasons returns seasons where user made predictions."""
        # Create standing prediction for current season
        StandingPredictionFactory(
            user=auth_client.user,
            season=sample_seasons['current'],
            team=sample_teams['east'][0]
        )

        response = auth_client.get('/api/v2/seasons/user-participated')

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 1
        assert data[0]['slug'] == '24-25'

    def test_user_participated_seasons_multiple(self, auth_client, sample_seasons, sample_teams):
        """Test participated seasons with multiple seasons."""
        # Create activities in multiple seasons
        q1 = PropQuestionFactory(season=sample_seasons['current'])
        AnswerFactory(user=auth_client.user, question=q1)

        q2 = PropQuestionFactory(season=sample_seasons['past1'])
        AnswerFactory(user=auth_client.user, question=q2)

        response = auth_client.get('/api/v2/seasons/user-participated')

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 2
        assert data[0]['slug'] == '24-25'  # Most recent first
        assert data[1]['slug'] == '23-24'

    def test_user_participated_seasons_no_participation(self, auth_client, sample_seasons):
        """Test participated seasons returns empty when user has no activity."""
        response = auth_client.get('/api/v2/seasons/user-participated')

        assert response.status_code == 200
        assert response.json() == []


# ============================================================================
# Teams Endpoint Tests
# ============================================================================

@pytest.mark.django_db
class TestTeamsEndpoint:
    """Test suite for /api/v2/teams endpoint."""

    def test_get_all_teams_success(self, api_client, sample_teams):
        """Test retrieving all teams returns correct data."""
        response = api_client.get('/api/v2/teams/')

        assert response.status_code == 200
        data = response.json()

        assert 'teams' in data
        assert isinstance(data['teams'], list)
        assert len(data['teams']) == 6  # 3 East + 3 West

    def test_get_all_teams_response_schema(self, api_client, sample_teams):
        """Test team response includes all required fields."""
        response = api_client.get('/api/v2/teams/')

        assert response.status_code == 200
        data = response.json()

        team = data['teams'][0]
        required_fields = ['id', 'name', 'conference']

        for field in required_fields:
            assert field in team, f"Missing required field: {field}"

    def test_get_all_teams_conference_values(self, api_client, sample_teams):
        """Test teams have valid conference values."""
        response = api_client.get('/api/v2/teams/')

        assert response.status_code == 200
        data = response.json()

        conferences = {team['conference'] for team in data['teams']}
        assert conferences.issubset({'East', 'West'})

    def test_get_all_teams_empty_database(self, api_client):
        """Test getting teams when none exist."""
        response = api_client.get('/api/v2/teams/')

        assert response.status_code == 200
        data = response.json()
        assert data['teams'] == []

    def test_get_all_teams_unauthenticated_access(self, api_client, sample_teams):
        """Test that unauthenticated users can access teams endpoint."""
        response = api_client.get('/api/v2/teams/')

        assert response.status_code == 200
        assert len(response.json()['teams']) == 6

    def test_get_all_teams_includes_specific_team(self, api_client, sample_teams):
        """Test that specific teams are included in the response."""
        response = api_client.get('/api/v2/teams/')

        assert response.status_code == 200
        data = response.json()

        team_names = [team['name'] for team in data['teams']]
        assert 'Boston Celtics' in team_names
        assert 'Los Angeles Lakers' in team_names

    def test_get_all_teams_error_handling(self, api_client, sample_teams, monkeypatch):
        """Test error handling when database query fails."""
        def mock_error(*args, **kwargs):
            raise Exception("Database error")

        monkeypatch.setattr('predictions.models.Team.objects.all', mock_error)

        response = api_client.get('/api/v2/teams/')

        assert response.status_code == 500
        data = response.json()
        assert 'error' in data


# ============================================================================
# Players Endpoint Tests
# ============================================================================

@pytest.mark.django_db
class TestPlayersEndpoint:
    """Test suite for /api/v2/players endpoint."""

    def test_get_all_players_success(self, api_client, sample_players):
        """Test retrieving all players returns correct data."""
        response = api_client.get('/api/v2/players/')

        assert response.status_code == 200
        data = response.json()

        assert 'players' in data
        assert isinstance(data['players'], list)
        assert len(data['players']) == 4

    def test_get_all_players_response_schema(self, api_client, sample_players):
        """Test player response includes all required fields."""
        response = api_client.get('/api/v2/players/')

        assert response.status_code == 200
        data = response.json()

        player = data['players'][0]
        required_fields = ['id', 'name']

        for field in required_fields:
            assert field in player, f"Missing required field: {field}"

    def test_get_all_players_empty_database(self, api_client):
        """Test getting players when none exist."""
        response = api_client.get('/api/v2/players/')

        assert response.status_code == 200
        data = response.json()
        assert data['players'] == []

    def test_get_all_players_unauthenticated_access(self, api_client, sample_players):
        """Test that unauthenticated users can access players endpoint."""
        response = api_client.get('/api/v2/players/')

        assert response.status_code == 200
        assert len(response.json()['players']) == 4

    def test_search_players_by_name(self, api_client, sample_players):
        """Test searching players by name."""
        response = api_client.get('/api/v2/players/?search=LeBron')

        assert response.status_code == 200
        data = response.json()

        assert len(data['players']) == 1
        assert data['players'][0]['name'] == 'LeBron James'

    def test_search_players_case_insensitive(self, api_client, sample_players):
        """Test player search is case-insensitive."""
        response = api_client.get('/api/v2/players/?search=lebron')

        assert response.status_code == 200
        data = response.json()

        assert len(data['players']) == 1
        assert data['players'][0]['name'] == 'LeBron James'

    def test_search_players_partial_match(self, api_client, sample_players):
        """Test player search matches partial names."""
        response = api_client.get('/api/v2/players/?search=Curry')

        assert response.status_code == 200
        data = response.json()

        assert len(data['players']) == 1
        assert 'Curry' in data['players'][0]['name']

    def test_search_players_no_results(self, api_client, sample_players):
        """Test player search with no matching results."""
        response = api_client.get('/api/v2/players/?search=NonexistentPlayer')

        assert response.status_code == 200
        data = response.json()
        assert data['players'] == []

    def test_search_players_whitespace_handling(self, api_client, sample_players):
        """Test player search handles whitespace correctly."""
        response = api_client.get('/api/v2/players/?search=  LeBron  ')

        assert response.status_code == 200
        data = response.json()

        assert len(data['players']) == 1
        assert data['players'][0]['name'] == 'LeBron James'

    def test_get_all_players_error_handling(self, api_client, sample_players, monkeypatch):
        """Test error handling when database query fails."""
        def mock_error(*args, **kwargs):
            raise Exception("Database error")

        monkeypatch.setattr('predictions.models.Player.objects.all', mock_error)

        response = api_client.get('/api/v2/players/')

        assert response.status_code == 500
        data = response.json()
        assert 'error' in data


# ============================================================================
# Homepage Endpoint Tests
# ============================================================================

@pytest.mark.django_db(transaction=True)
class TestHomepageEndpoints:
    """Test suite for /api/v2/homepage/* endpoints."""

    def test_homepage_data_structure(self, api_client):
        """Test homepage data endpoint returns correct structure."""
        Season.objects.all().delete()

        # Create current season data
        current = CurrentSeasonFactory()

        response = api_client.get('/api/v2/homepage/data')

        assert response.status_code == 200
        data = response.json()

        assert 'mini_leaderboard' in data
        assert 'mini_standings' in data

    def test_homepage_data_mini_leaderboard_empty(self, api_client):
        """Test mini leaderboard when no user stats exist."""
        Season.objects.all().delete()

        current = CurrentSeasonFactory()

        response = api_client.get('/api/v2/homepage/data')

        assert response.status_code == 200
        data = response.json()

        assert data['mini_leaderboard'] == []

    def test_homepage_data_mini_leaderboard_with_users(self, api_client):
        """Test mini leaderboard returns top 5 users."""
        Season.objects.all().delete()

        current = CurrentSeasonFactory()

        # Create 7 users with different point totals
        for i in range(7):
            user = UserFactory()
            UserStatsFactory(
                user=user,
                season=current,
                points=100 - (i * 10)  # Descending points (use 'points' not 'total_points')
            )

        response = api_client.get('/api/v2/homepage/data')

        assert response.status_code == 200
        data = response.json()

        # Should return only top 5
        assert len(data['mini_leaderboard']) == 5

        # Verify descending order
        points = [entry['points'] for entry in data['mini_leaderboard']]
        assert points == sorted(points, reverse=True)

    def test_homepage_data_mini_standings_structure(self, api_client):
        """Test mini standings returns correct structure."""
        Season.objects.all().delete()
        Team.objects.all().delete()

        current = CurrentSeasonFactory()

        east_teams = EasternTeamFactory.create_batch(3)
        west_teams = WesternTeamFactory.create_batch(3)

        # Create standings for both conferences
        for i, team in enumerate(east_teams):
            RegularSeasonStandings.objects.create(
                season=current,
                team=team,
                position=i + 1,
                wins=50 - (i * 5),
                losses=32 + (i * 5)
            )

        for i, team in enumerate(west_teams):
            RegularSeasonStandings.objects.create(
                season=current,
                team=team,
                position=i + 1,
                wins=48 - (i * 5),
                losses=34 + (i * 5)
            )

        response = api_client.get('/api/v2/homepage/data')

        assert response.status_code == 200
        data = response.json()

        standings = data['mini_standings']
        assert 'eastern' in standings
        assert 'western' in standings
        assert len(standings['eastern']) == 3
        assert len(standings['western']) == 3

    def test_homepage_data_unauthenticated_access(self, api_client):
        """Test that unauthenticated users can access homepage data."""
        Season.objects.all().delete()

        current = CurrentSeasonFactory()

        response = api_client.get('/api/v2/homepage/data')

        assert response.status_code == 200

    def test_homepage_data_no_current_season(self, api_client):
        """Test homepage data when no current season exists."""
        Season.objects.all().delete()

        response = api_client.get('/api/v2/homepage/data')

        # Should return 200 with empty arrays when no season exists
        assert response.status_code == 200
        data = response.json()
        assert data['mini_leaderboard'] == []
        assert data['mini_standings'] == {'eastern': [], 'western': []}


# ============================================================================
# Edge Cases and Performance Tests
# ============================================================================

@pytest.mark.django_db(transaction=True)
class TestPublicEndpointsEdgeCases:
    """Test edge cases and error scenarios for public endpoints."""

    def test_seasons_datetime_serialization(self, api_client):
        """Test seasons endpoint correctly serializes datetime fields."""
        Season.objects.all().delete()

        season = CurrentSeasonFactory()

        response = api_client.get('/api/v2/seasons/')

        assert response.status_code == 200
        data = response.json()

        # Verify datetime fields are properly serialized
        assert data[0]['submission_start_date'] is not None
        assert data[0]['submission_end_date'] is not None
        assert isinstance(data[0]['submission_start_date'], str)
        assert isinstance(data[0]['submission_end_date'], str)

    def test_teams_with_many_records(self, api_client):
        """Test teams endpoint performance with all 30 NBA teams."""
        # Create all 30 teams
        for i in range(30):
            TeamFactory(
                name=f'Team {i}',
                conference='East' if i < 15 else 'West'
            )

        response = api_client.get('/api/v2/teams/')

        assert response.status_code == 200
        data = response.json()
        assert len(data['teams']) == 30

    def test_players_with_many_records(self, api_client):
        """Test players endpoint with large dataset."""
        # Create 100 players
        for i in range(100):
            PlayerFactory(name=f'Player {i:03d}')

        response = api_client.get('/api/v2/players/')

        assert response.status_code == 200
        data = response.json()
        assert len(data['players']) == 100

    def test_invalid_endpoint_returns_404(self, api_client):
        """Test that invalid endpoints return 404."""
        response = api_client.get('/api/v2/nonexistent-endpoint/')

        assert response.status_code == 404

    def test_seasons_ordering_with_same_start_date(self, api_client):
        """Test seasons ordering when multiple have same start_date."""
        Season.objects.all().delete()

        start = date.today()

        s1 = CurrentSeasonFactory(slug='24-25', start_date=start)
        s2 = CurrentSeasonFactory(slug='23-24', start_date=start)

        response = api_client.get('/api/v2/seasons/')

        assert response.status_code == 200
        data = response.json()

        # Both should be returned
        assert len(data) == 2

    def test_player_search_empty_string(self, api_client, sample_players):
        """Test player search with empty search string."""
        response = api_client.get('/api/v2/players/?search=')

        assert response.status_code == 200
        data = response.json()

        # Empty search should return all players
        assert len(data['players']) == 4

    def test_player_search_special_characters(self, api_client):
        """Test player search handles special characters."""
        PlayerFactory(name="Luka Dončić")

        response = api_client.get('/api/v2/players/?search=Dončić')

        assert response.status_code == 200
        data = response.json()

        assert len(data['players']) == 1
        assert data['players'][0]['name'] == "Luka Dončić"
