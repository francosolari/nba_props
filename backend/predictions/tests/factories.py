"""
Factory classes for creating test data using factory_boy.

These factories provide an easy way to create model instances for testing
with sensible defaults while allowing customization.
"""
import uuid
import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from predictions.models import (
    Season,
    Team,
    Player,
    PlayerStat,
    PropQuestion,
    SuperlativeQuestion,
    HeadToHeadQuestion,
    InSeasonTournamentQuestion,
    PlayerStatPredictionQuestion,
    NBAFinalsPredictionQuestion,
    Answer,
    UserStats,
    StandingPrediction,
    PlayoffPrediction,
    Award,
    Payment,
    PaymentStatus,
)
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone


User = get_user_model()


# ============================================================================
# User Factories
# ============================================================================

class UserFactory(DjangoModelFactory):
    """Factory for creating test users."""

    class Meta:
        model = User

    username = factory.LazyFunction(lambda: f'user-{uuid.uuid4().hex[:8]}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True
    is_staff = False
    is_superuser = False


class AdminUserFactory(UserFactory):
    """Factory for creating admin users."""

    username = factory.LazyFunction(lambda: f'admin-{uuid.uuid4().hex[:8]}')
    is_staff = True
    is_superuser = True


class PremiumUserFactory(UserFactory):
    """Factory for creating premium users."""

    username = factory.LazyFunction(lambda: f'premium-{uuid.uuid4().hex[:8]}')
    # Add premium-specific fields based on your user model


# ============================================================================
# NBA Data Factories
# ============================================================================

class SeasonFactory(DjangoModelFactory):
    """Factory for creating NBA seasons."""

    class Meta:
        model = Season

    # Use 'YY-YY' format to fit in 7 character limit
    slug = factory.Sequence(lambda n: f'{20+n}-{21+n}')
    year = factory.LazyAttribute(lambda obj: obj.slug)
    start_date = factory.LazyFunction(lambda: date.today() - timedelta(days=30))
    end_date = factory.LazyFunction(lambda: date.today() + timedelta(days=150))
    submission_start_date = factory.LazyFunction(lambda: date.today() - timedelta(days=30))
    submission_end_date = factory.LazyFunction(lambda: date.today() + timedelta(days=7))


class CurrentSeasonFactory(SeasonFactory):
    """Factory for creating the current active season with unique slugs."""

    # Ensure unique slugs with format '24-XXX'
    slug = factory.Sequence(lambda n: f'24-{25+n:02d}')
    year = factory.LazyAttribute(lambda obj: obj.slug)


class PastSeasonFactory(SeasonFactory):
    """Factory for creating a past season with unique slugs."""

    slug = factory.Sequence(lambda n: f'23-{24+n:02d}')
    year = factory.LazyAttribute(lambda obj: obj.slug)
    start_date = factory.LazyFunction(lambda: date.today() - timedelta(days=365))
    end_date = factory.LazyFunction(lambda: date.today() - timedelta(days=180))
    submission_start_date = factory.LazyFunction(lambda: date.today() - timedelta(days=400))
    submission_end_date = factory.LazyFunction(lambda: date.today() - timedelta(days=200))


class TeamFactory(DjangoModelFactory):
    """Factory for creating NBA teams."""

    class Meta:
        model = Team

    name = factory.Sequence(lambda n: f'Team {n}')
    abbreviation = factory.Sequence(lambda n: f'T{n:01d}'[:3])  # Max 3 chars
    conference = factory.Iterator(['East', 'West'])


class EasternTeamFactory(TeamFactory):
    """Factory for Eastern Conference teams."""

    conference = 'East'


class WesternTeamFactory(TeamFactory):
    """Factory for Western Conference teams."""

    conference = 'West'


class PlayerFactory(DjangoModelFactory):
    """Factory for creating NBA players."""

    class Meta:
        model = Player

    name = factory.Sequence(lambda n: f'Player {n}')


class AwardFactory(DjangoModelFactory):
    """Factory for creating NBA awards."""

    class Meta:
        model = Award

    name = factory.Iterator(['MVP', 'DPOY', 'ROY', 'MIP', 'SMOY', '6MOY'])


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
    correct_answer = None
    outcome_type = 'yes_no'  # Required field for PropQuestion


class SuperlativeQuestionFactory(DjangoModelFactory):
    """Factory for creating superlative questions (MVP, ROY, etc.)."""

    class Meta:
        model = SuperlativeQuestion

    season = factory.SubFactory(CurrentSeasonFactory)
    award = factory.SubFactory(AwardFactory)
    text = factory.Sequence(lambda n: f'Superlative question {n}')
    point_value = 5
    correct_answer = None
    is_finalized = False


class HeadToHeadQuestionFactory(DjangoModelFactory):
    """Factory for creating head-to-head questions."""

    class Meta:
        model = HeadToHeadQuestion

    season = factory.SubFactory(CurrentSeasonFactory)
    text = factory.Sequence(lambda n: f'H2H question {n}')
    point_value = 3
    team1 = factory.SubFactory(TeamFactory)
    team2 = factory.SubFactory(TeamFactory)
    correct_answer = None


class InSeasonTournamentQuestionFactory(DjangoModelFactory):
    """Factory for creating IST questions."""

    class Meta:
        model = InSeasonTournamentQuestion

    season = factory.SubFactory(CurrentSeasonFactory)
    text = factory.Sequence(lambda n: f'IST question {n}')
    point_value = 4
    prediction_type = 'group_winner'
    ist_group = 'East Group A'
    correct_answer = None


class PlayerStatFactory(DjangoModelFactory):
    """Factory for creating player stat snapshots."""

    class Meta:
        model = PlayerStat

    player = factory.SubFactory(PlayerFactory)
    season = factory.SubFactory(CurrentSeasonFactory)
    games_played = 10
    points_per_game = Decimal('25.3')


class PlayerStatPredictionQuestionFactory(DjangoModelFactory):
    """Factory for creating player stat prediction questions."""

    class Meta:
        model = PlayerStatPredictionQuestion

    season = factory.SubFactory(CurrentSeasonFactory)
    player_stat = factory.SubFactory(PlayerStatFactory)
    text = factory.Sequence(lambda n: f'Player stat question {n}')
    point_value = 5
    stat_type = 'points'
    fixed_value = 25.0
    correct_answer = None


class NBAFinalsPredictionQuestionFactory(DjangoModelFactory):
    """Factory for creating NBA Finals prediction questions."""

    class Meta:
        model = NBAFinalsPredictionQuestion

    season = factory.SubFactory(CurrentSeasonFactory)
    text = factory.Sequence(lambda n: f'NBA Finals prediction {n}')
    point_value = 6
    group_name = 'NBA Finals'
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
    answer = factory.Sequence(lambda n: f'Answer {n}')
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
    points = 0
    entry_fee_paid = False


# ============================================================================
# Payment Factories
# ============================================================================

class PaymentFactory(DjangoModelFactory):
    """Factory for creating payments."""

    class Meta:
        model = Payment

    user = factory.SubFactory(UserFactory)
    season = factory.SubFactory(CurrentSeasonFactory)
    checkout_session_id = factory.LazyFunction(lambda: f'cs_{uuid.uuid4().hex}')
    payment_intent_id = factory.LazyFunction(lambda: f'pi_{uuid.uuid4().hex}')
    amount = Decimal('20.00')
    currency = 'usd'
    email = factory.LazyAttribute(lambda obj: obj.user.email)
    payment_status = PaymentStatus.PENDING
    created_at = factory.LazyFunction(timezone.now)


class SucceededPaymentFactory(PaymentFactory):
    """Factory for successful payments."""

    payment_status = PaymentStatus.SUCCEEDED
    paid_at = factory.LazyFunction(timezone.now)


# ============================================================================
# StandingPrediction Factories
# ============================================================================

class StandingPredictionFactory(DjangoModelFactory):
    """Factory for creating standing predictions."""

    class Meta:
        model = StandingPrediction

    user = factory.SubFactory(UserFactory)
    season = factory.SubFactory(CurrentSeasonFactory)
    team = factory.SubFactory(TeamFactory)
    predicted_position = factory.Sequence(lambda n: n + 1)
    points = factory.Iterator([0, 1, 3])


class PlayoffPredictionFactory(DjangoModelFactory):
    """Factory for creating playoff predictions."""

    class Meta:
        model = PlayoffPrediction

    user = factory.SubFactory(UserFactory)
    season = factory.SubFactory(CurrentSeasonFactory)
    team = factory.SubFactory(TeamFactory)
    wins = 4
    losses = 2
    round = 4  # NBA Finals
    points = 0


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
            conference=conf
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
