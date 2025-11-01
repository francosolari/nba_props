"""
Factory classes for creating test data using factory_boy.

These factories provide an easy way to create model instances for testing
with sensible defaults while allowing customization.
"""
import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from predictions.models import (
    Season,
    Team,
    Player,
    PropQuestion,
    SuperlativeQuestion,
    HeadToHeadQuestion,
    Answer,
    UserStats,
    StandingPrediction,
)
from datetime import date, timedelta


User = get_user_model()


# ============================================================================
# User Factories
# ============================================================================

class UserFactory(DjangoModelFactory):
    """Factory for creating test users."""

    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True
    is_staff = False
    is_superuser = False


class AdminUserFactory(UserFactory):
    """Factory for creating admin users."""

    username = factory.Sequence(lambda n: f'admin{n}')
    is_staff = True
    is_superuser = True


class PremiumUserFactory(UserFactory):
    """Factory for creating premium users."""

    username = factory.Sequence(lambda n: f'premium{n}')
    # Add premium-specific fields based on your user model


# ============================================================================
# NBA Data Factories
# ============================================================================

class SeasonFactory(DjangoModelFactory):
    """Factory for creating NBA seasons."""

    class Meta:
        model = Season

    slug = factory.Sequence(lambda n: f'202{3+n}-2{4+n}')
    year = factory.LazyAttribute(lambda obj: obj.slug)
    start_date = factory.LazyFunction(lambda: date.today() - timedelta(days=30))
    end_date = factory.LazyFunction(lambda: date.today() + timedelta(days=150))
    submission_end_date = factory.LazyFunction(lambda: date.today() + timedelta(days=7))
    submissions_open = True


class CurrentSeasonFactory(SeasonFactory):
    """Factory for creating the current active season."""

    slug = '2024-25'
    year = '2024-25'
    submissions_open = True


class PastSeasonFactory(SeasonFactory):
    """Factory for creating a past season."""

    slug = '2023-24'
    year = '2023-24'
    start_date = factory.LazyFunction(lambda: date.today() - timedelta(days=365))
    end_date = factory.LazyFunction(lambda: date.today() - timedelta(days=180))
    submission_end_date = factory.LazyFunction(lambda: date.today() - timedelta(days=200))
    submissions_open = False


class TeamFactory(DjangoModelFactory):
    """Factory for creating NBA teams."""

    class Meta:
        model = Team

    name = factory.Sequence(lambda n: f'Team {n}')
    abbreviation = factory.Sequence(lambda n: f'T{n:02d}')
    city = factory.Sequence(lambda n: f'City {n}')
    conference = factory.Iterator(['East', 'West'])
    division = factory.Iterator(['Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest'])
    nba_team_id = factory.Sequence(lambda n: 1610612700 + n)


class EasternTeamFactory(TeamFactory):
    """Factory for Eastern Conference teams."""

    conference = 'East'
    division = factory.Iterator(['Atlantic', 'Central', 'Southeast'])


class WesternTeamFactory(TeamFactory):
    """Factory for Western Conference teams."""

    conference = 'West'
    division = factory.Iterator(['Northwest', 'Pacific', 'Southwest'])


class PlayerFactory(DjangoModelFactory):
    """Factory for creating NBA players."""

    class Meta:
        model = Player

    name = factory.Sequence(lambda n: f'Player {n}')
    team = factory.SubFactory(TeamFactory)
    position = factory.Iterator(['G', 'F', 'C', 'G-F', 'F-C'])
    nba_player_id = factory.Sequence(lambda n: 1628000 + n)


# ============================================================================
# Question Factories
# ============================================================================

class PropQuestionFactory(DjangoModelFactory):
    """Factory for creating prop questions."""

    class Meta:
        model = PropQuestion

    season = factory.SubFactory(CurrentSeasonFactory)
    text = factory.Sequence(lambda n: f'Prop question {n}')
    point_value = 3
    is_active = True
    correct_answer = None


class SuperlativeQuestionFactory(DjangoModelFactory):
    """Factory for creating superlative questions (MVP, ROY, etc.)."""

    class Meta:
        model = SuperlativeQuestion

    season = factory.SubFactory(CurrentSeasonFactory)
    text = factory.Sequence(lambda n: f'Superlative question {n}')
    point_value = 5
    is_active = True
    award_type = factory.Iterator(['MVP', 'ROY', 'DPOY', 'MIP', 'SMOY', 'COY'])
    correct_answer = None


class HeadToHeadQuestionFactory(DjangoModelFactory):
    """Factory for creating head-to-head questions."""

    class Meta:
        model = HeadToHeadQuestion

    season = factory.SubFactory(CurrentSeasonFactory)
    text = factory.Sequence(lambda n: f'H2H question {n}')
    point_value = 3
    is_active = True
    player_a = factory.SubFactory(PlayerFactory)
    player_b = factory.SubFactory(PlayerFactory)
    stat_category = factory.Iterator(['PPG', 'RPG', 'APG', 'FG%', '3P%', 'FT%'])
    correct_answer = None


# ============================================================================
# Answer Factories
# ============================================================================

class AnswerFactory(DjangoModelFactory):
    """Factory for creating user answers."""

    class Meta:
        model = Answer

    user = factory.SubFactory(UserFactory)
    question = factory.SubFactory(PropQuestionFactory)
    answer_text = factory.Sequence(lambda n: f'Answer {n}')
    points_earned = 0
    is_correct = None


# ============================================================================
# UserStats Factories
# ============================================================================

class UserStatsFactory(DjangoModelFactory):
    """Factory for creating user statistics."""

    class Meta:
        model = UserStats

    user = factory.SubFactory(UserFactory)
    season = factory.SubFactory(CurrentSeasonFactory)
    total_points = 0
    total_possible_points = 0
    questions_answered = 0


# ============================================================================
# StandingPrediction Factories
# ============================================================================

class StandingPredictionFactory(DjangoModelFactory):
    """Factory for creating standing predictions."""

    class Meta:
        model = StandingPrediction

    user = factory.SubFactory(UserFactory)
    season = factory.SubFactory(CurrentSeasonFactory)
    conference = factory.Iterator(['East', 'West'])
    standings_data = factory.LazyFunction(lambda: {})


# ============================================================================
# Batch Creation Helpers
# ============================================================================

def create_full_team_set():
    """
    Create all 30 NBA teams.

    Returns:
        dict: Dictionary with 'east' and 'west' team lists
    """
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

    east_teams = []
    west_teams = []

    for name, abbr, city, conf, div, nba_id in teams_data:
        team = TeamFactory.create(
            name=name,
            abbreviation=abbr,
            city=city,
            conference=conf,
            division=div,
            nba_team_id=nba_id
        )

        if conf == 'East':
            east_teams.append(team)
        else:
            west_teams.append(team)

    return {'east': east_teams, 'west': west_teams}


def create_user_with_submissions(season=None, num_answers=5):
    """
    Create a user with multiple question answers.

    Args:
        season: Season instance (creates one if not provided)
        num_answers: Number of answers to create

    Returns:
        dict: {'user': User, 'answers': [Answer, ...], 'season': Season}
    """
    if season is None:
        season = CurrentSeasonFactory.create()

    user = UserFactory.create()

    answers = []
    for i in range(num_answers):
        question = PropQuestionFactory.create(season=season)
        answer = AnswerFactory.create(
            user=user,
            question=question,
            answer_text=f'Answer {i}'
        )
        answers.append(answer)

    return {
        'user': user,
        'answers': answers,
        'season': season
    }
