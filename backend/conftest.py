"""
Pytest configuration and shared fixtures for backend tests.

This file contains fixtures that are available to all test files.
"""
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from predictions.models import Season, Team, Player


User = get_user_model()


# ============================================================================
# User Fixtures
# ============================================================================

@pytest.fixture
def user(db):
    """Create a regular user for testing."""
    return User.objects.create_user(
        username='testuser',
        email='testuser@example.com',
        password='testpass123'
    )


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing."""
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123'
    )


@pytest.fixture
def premium_user(db):
    """Create a premium (subscribed) user for testing."""
    user = User.objects.create_user(
        username='premiumuser',
        email='premium@example.com',
        password='testpass123'
    )
    user.is_premium = True  # Adjust based on your user model
    user.save()
    return user


# ============================================================================
# API Client Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """Django test client for making test requests."""
    return Client()


@pytest.fixture
def authenticated_client(api_client, user):
    """API client authenticated as regular user."""
    api_client.force_login(user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """API client authenticated as admin user."""
    api_client.force_login(admin_user)
    return api_client


@pytest.fixture
def premium_client(api_client, premium_user):
    """API client authenticated as premium user."""
    api_client.force_login(premium_user)
    return api_client


# ============================================================================
# NBA Data Fixtures
# ============================================================================

@pytest.fixture
def current_season(db):
    """Create a current NBA season for testing."""
    from datetime import timedelta
    from django.utils import timezone

    now = timezone.now()

    return Season.objects.create(
        slug='2024-25',
        year='2024-25',
        start_date=now.date() - timedelta(days=30),
        end_date=now.date() + timedelta(days=150),
        submission_start_date=now - timedelta(days=30),  # Opened 30 days ago
        submission_end_date=now + timedelta(days=7)  # Still open for 7 days
    )


@pytest.fixture
def past_season(db):
    """Create a past NBA season for testing."""
    from datetime import timedelta
    from django.utils import timezone

    now = timezone.now()

    return Season.objects.create(
        slug='2023-24',
        year='2023-24',
        start_date=now.date() - timedelta(days=365),
        end_date=now.date() - timedelta(days=180),
        submission_start_date=now - timedelta(days=400),
        submission_end_date=now - timedelta(days=200)  # Closed
    )


@pytest.fixture
def eastern_team(db):
    """Create an Eastern Conference team."""
    return Team.objects.create(
        name='Boston Celtics',
        abbreviation='BOS',
        city='Boston',
        conference='East',
        division='Atlantic',
        nba_team_id=1610612738
    )


@pytest.fixture
def western_team(db):
    """Create a Western Conference team."""
    return Team.objects.create(
        name='Los Angeles Lakers',
        abbreviation='LAL',
        city='Los Angeles',
        conference='West',
        division='Pacific',
        nba_team_id=1610612747
    )


@pytest.fixture
def teams(db):
    """Create a full set of 30 NBA teams."""
    teams_data = [
        # Eastern Conference - Atlantic
        ('Boston Celtics', 'BOS', 'Boston', 'East', 'Atlantic', 1610612738),
        ('Brooklyn Nets', 'BKN', 'Brooklyn', 'East', 'Atlantic', 1610612751),
        ('New York Knicks', 'NYK', 'New York', 'East', 'Atlantic', 1610612752),
        ('Philadelphia 76ers', 'PHI', 'Philadelphia', 'East', 'Atlantic', 1610612755),
        ('Toronto Raptors', 'TOR', 'Toronto', 'East', 'Atlantic', 1610612761),

        # Eastern Conference - Central
        ('Chicago Bulls', 'CHI', 'Chicago', 'East', 'Central', 1610612741),
        ('Cleveland Cavaliers', 'CLE', 'Cleveland', 'East', 'Central', 1610612739),
        ('Detroit Pistons', 'DET', 'Detroit', 'East', 'Central', 1610612765),
        ('Indiana Pacers', 'IND', 'Indiana', 'East', 'Central', 1610612754),
        ('Milwaukee Bucks', 'MIL', 'Milwaukee', 'East', 'Central', 1610612749),

        # Eastern Conference - Southeast
        ('Atlanta Hawks', 'ATL', 'Atlanta', 'East', 'Southeast', 1610612737),
        ('Charlotte Hornets', 'CHA', 'Charlotte', 'East', 'Southeast', 1610612766),
        ('Miami Heat', 'MIA', 'Miami', 'East', 'Southeast', 1610612748),
        ('Orlando Magic', 'ORL', 'Orlando', 'East', 'Southeast', 1610612753),
        ('Washington Wizards', 'WAS', 'Washington', 'East', 'Southeast', 1610612764),

        # Western Conference - Northwest
        ('Denver Nuggets', 'DEN', 'Denver', 'West', 'Northwest', 1610612743),
        ('Minnesota Timberwolves', 'MIN', 'Minnesota', 'West', 'Northwest', 1610612750),
        ('Oklahoma City Thunder', 'OKC', 'Oklahoma City', 'West', 'Northwest', 1610612760),
        ('Portland Trail Blazers', 'POR', 'Portland', 'West', 'Northwest', 1610612757),
        ('Utah Jazz', 'UTA', 'Utah', 'West', 'Northwest', 1610612762),

        # Western Conference - Pacific
        ('Golden State Warriors', 'GSW', 'Golden State', 'West', 'Pacific', 1610612744),
        ('Los Angeles Clippers', 'LAC', 'Los Angeles', 'West', 'Pacific', 1610612746),
        ('Los Angeles Lakers', 'LAL', 'Los Angeles', 'West', 'Pacific', 1610612747),
        ('Phoenix Suns', 'PHX', 'Phoenix', 'West', 'Pacific', 1610612756),
        ('Sacramento Kings', 'SAC', 'Sacramento', 'West', 'Pacific', 1610612758),

        # Western Conference - Southwest
        ('Dallas Mavericks', 'DAL', 'Dallas', 'West', 'Southwest', 1610612742),
        ('Houston Rockets', 'HOU', 'Houston', 'West', 'Southwest', 1610612745),
        ('Memphis Grizzlies', 'MEM', 'Memphis', 'West', 'Southwest', 1610612763),
        ('New Orleans Pelicans', 'NOP', 'New Orleans', 'West', 'Southwest', 1610612740),
        ('San Antonio Spurs', 'SAS', 'San Antonio', 'West', 'Southwest', 1610612759),
    ]

    created_teams = []
    for name, abbr, city, conf, div, nba_id in teams_data:
        team = Team.objects.create(
            name=name,
            abbreviation=abbr,
            city=city,
            conference=conf,
            division=div,
            nba_team_id=nba_id
        )
        created_teams.append(team)

    return created_teams


@pytest.fixture
def player(db, eastern_team):
    """Create a player for testing."""
    return Player.objects.create(
        name='Jayson Tatum',
        team=eastern_team,
        position='F',
        nba_player_id=1628369
    )


# ============================================================================
# Mock Fixtures
# ============================================================================

@pytest.fixture
def mock_nba_api(mocker):
    """Mock NBA API calls."""
    mock = mocker.patch('nba_api.stats.endpoints.leagueleaders.LeagueLeaders')
    return mock


@pytest.fixture
def mock_stripe(mocker):
    """Mock Stripe API calls."""
    mock_stripe = mocker.patch('stripe.Webhook.construct_event')
    mock_subscription = mocker.patch('stripe.Subscription.create')

    return {
        'webhook': mock_stripe,
        'subscription': mock_subscription,
    }


# ============================================================================
# Database Fixtures
# ============================================================================

def pytest_configure(config):
    """
    Configure Django settings for tests before Django initializes.
    This runs once before all tests.
    """
    from django.conf import settings

    # Override database to use SQLite in-memory for all tests
    settings.DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
            'ATOMIC_REQUESTS': True,
        }
    }


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.
    Remove this if you want to explicitly mark tests with @pytest.mark.django_db
    """
    pass


# ============================================================================
# Helper Functions
# ============================================================================

def create_question(season, question_type='prop', **kwargs):
    """
    Helper function to create questions of different types.

    Args:
        season: Season instance
        question_type: Type of question ('prop', 'superlative', 'h2h', etc.)
        **kwargs: Additional fields for the question

    Returns:
        Question instance (polymorphic)
    """
    from predictions.models import (
        PropQuestion,
        SuperlativeQuestion,
        HeadToHeadQuestion,
        PlayerStatPredictionQuestion,
        InSeasonTournamentQuestion,
        NBAFinalsPredictionQuestion,
    )

    defaults = {
        'season': season,
        'text': f'Test {question_type} question',
        'point_value': 3,
        'is_active': True,
    }
    defaults.update(kwargs)

    question_classes = {
        'prop': PropQuestion,
        'superlative': SuperlativeQuestion,
        'h2h': HeadToHeadQuestion,
        'player_stat': PlayerStatPredictionQuestion,
        'ist': InSeasonTournamentQuestion,
        'finals': NBAFinalsPredictionQuestion,
    }

    QuestionClass = question_classes.get(question_type, PropQuestion)
    return QuestionClass.objects.create(**defaults)


@pytest.fixture
def create_question_helper():
    """Fixture that provides the create_question helper function."""
    return create_question
