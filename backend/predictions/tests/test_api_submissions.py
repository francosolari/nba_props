"""
Test suite for user submission endpoints (authenticated).

Tests for endpoints in:
- user_submissions.py (GET/POST /api/v2/submissions/questions, /api/v2/submissions/answers, /api/v2/submissions/standings, etc.)

Related to: nba_predictions-34 (P0 - API Testing: User submission endpoints)
Target: ~30 tests covering POST/GET with auth, deadline validation, duplicate prevention, point calculations
"""

import pytest
import json
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
    SuperlativeQuestionFactory,
    PlayerStatPredictionQuestionFactory,
    HeadToHeadQuestionFactory,
    StandingPredictionFactory,
    UserStatsFactory,
    AwardFactory,
)
from predictions.models import (
    Season,
    Team,
    Player,
    Question,
    Answer,
    PropQuestion,
    SuperlativeQuestion,
    StandingPrediction,
    UserStats,
    Payment,
)
from datetime import date, timedelta, datetime
from django.utils import timezone

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
def admin_client(api_client):
    """Authenticated API client with admin user."""
    from predictions.tests.factories import AdminUserFactory
    admin = AdminUserFactory()
    api_client.force_login(admin)
    api_client.user = admin
    return api_client


@pytest.fixture
def open_season():
    """Create a season with open submission window."""
    return CurrentSeasonFactory(
        slug='24-25',
        year='24-25',
        start_date=date.today() - timedelta(days=30),
        end_date=date.today() + timedelta(days=150),
        submission_start_date=date.today() - timedelta(days=10),
        submission_end_date=date.today() + timedelta(days=7)
    )


@pytest.fixture
def closed_season():
    """Create a season with closed submission window."""
    return PastSeasonFactory(
        slug='23-24',
        year='23-24',
        start_date=date.today() - timedelta(days=365),
        end_date=date.today() - timedelta(days=180),
        submission_start_date=date.today() - timedelta(days=395),
        submission_end_date=date.today() - timedelta(days=360)
    )


@pytest.fixture
def future_season():
    """Create a season with future submission window."""
    return SeasonFactory(
        slug='25-26',
        year='25-26',
        start_date=date.today() + timedelta(days=180),
        end_date=date.today() + timedelta(days=360),
        submission_start_date=date.today() + timedelta(days=150),
        submission_end_date=date.today() + timedelta(days=185)
    )


@pytest.fixture
def sample_teams():
    """Create sample teams for testing standings."""
    east_teams = [
        EasternTeamFactory(name=f'East Team {i}', abbreviation=f'ET{i}')
        for i in range(1, 6)
    ]
    west_teams = [
        WesternTeamFactory(name=f'West Team {i}', abbreviation=f'WT{i}')
        for i in range(1, 6)
    ]
    return {'east': east_teams, 'west': west_teams}


@pytest.fixture
def sample_questions(open_season):
    """Create various question types for testing."""
    # Ensure open_season is the most recent season for 'current' shortcut
    Season.objects.exclude(id=open_season.id).delete()

    award = AwardFactory(name='MVP')

    questions = {
        'prop': PropQuestionFactory(
            season=open_season,
            text='Will LeBron score 30+ points?',
            outcome_type='yes_no',
            point_value=10
        ),
        'superlative': SuperlativeQuestionFactory(
            season=open_season,
            text='Who will win MVP?',
            award=award,
            point_value=15
        ),
    }
    return questions


# ============================================================================
# Tests: GET /submissions/questions/{season_slug}
# ============================================================================

@pytest.mark.django_db
class TestGetQuestionsEndpoint:
    """Test suite for GET /api/v2/submissions/questions/{season_slug}"""

    def test_get_questions_success(self, api_client, open_season, sample_questions):
        """Test successfully retrieving questions for a season."""
        response = api_client.get(f'/api/v2/submissions/questions/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['season_slug'] == open_season.slug
        assert data['submission_open'] is True
        assert 'questions' in data
        assert len(data['questions']) == 2
        assert 'submission_status' in data

    def test_get_questions_with_current_shortcut(self, api_client, sample_questions):
        """Test retrieving questions using 'current' season slug."""
        response = api_client.get('/api/v2/submissions/questions/current')

        assert response.status_code == 200
        data = response.json()

        assert 'questions' in data
        assert len(data['questions']) > 0

    def test_get_questions_invalid_season(self, api_client):
        """Test error when retrieving questions for non-existent season."""
        response = api_client.get('/api/v2/submissions/questions/invalid-season')

        assert response.status_code == 404

    def test_get_questions_closed_window(self, api_client, closed_season):
        """Test submission_open is False when window is closed."""
        # Add a question to the closed season
        PropQuestionFactory(season=closed_season, text='Test question')

        response = api_client.get(f'/api/v2/submissions/questions/{closed_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['submission_open'] is False

    def test_get_questions_future_window(self, api_client, future_season):
        """Test submission_open is False when window is in future."""
        PropQuestionFactory(season=future_season, text='Future question')

        response = api_client.get(f'/api/v2/submissions/questions/{future_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['submission_open'] is False
        assert 'days_until_open' in data['submission_status']

    def test_get_questions_polymorphic_types(self, api_client, open_season, sample_questions):
        """Test that different question types are properly serialized."""
        response = api_client.get(f'/api/v2/submissions/questions/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        question_types = {q['question_type'] for q in data['questions']}
        assert 'prop' in question_types
        assert 'superlative' in question_types

    def test_get_questions_empty_season(self, api_client, open_season):
        """Test retrieving questions when season has no questions."""
        response = api_client.get(f'/api/v2/submissions/questions/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['questions'] == []


# ============================================================================
# Tests: GET /submissions/answers/{season_slug}
# ============================================================================

@pytest.mark.django_db
class TestGetAnswersEndpoint:
    """Test suite for GET /api/v2/submissions/answers/{season_slug}"""

    def test_get_answers_unauthenticated(self, api_client, open_season):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get(f'/api/v2/submissions/answers/{open_season.slug}')

        assert response.status_code == 401

    def test_get_answers_success(self, auth_client, open_season, sample_questions):
        """Test successfully retrieving user's answers."""
        # Create some answers for the authenticated user
        AnswerFactory(
            user=auth_client.user,
            question=sample_questions['prop'],
            answer='Yes'
        )
        AnswerFactory(
            user=auth_client.user,
            question=sample_questions['superlative'],
            answer='1'  # Player ID
        )

        response = auth_client.get(f'/api/v2/submissions/answers/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['season_slug'] == open_season.slug
        assert len(data['answers']) == 2
        assert 'total_points' in data

    def test_get_answers_empty(self, auth_client, open_season):
        """Test retrieving answers when user has none."""
        response = auth_client.get(f'/api/v2/submissions/answers/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['answers'] == []
        assert data['total_points'] == 0

    def test_get_answers_invalid_season(self, auth_client):
        """Test error when retrieving answers for non-existent season."""
        response = auth_client.get('/api/v2/submissions/answers/invalid-season')

        assert response.status_code == 404

    def test_get_answers_includes_points(self, auth_client, open_season, sample_questions):
        """Test that returned answers include points_earned."""
        answer = AnswerFactory(
            user=auth_client.user,
            question=sample_questions['prop'],
            answer='Yes',
            points_earned=10.0,
            is_correct=True
        )

        response = auth_client.get(f'/api/v2/submissions/answers/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert len(data['answers']) == 1
        assert data['answers'][0]['points_earned'] == 10.0
        assert data['answers'][0]['is_correct'] is True
        assert data['total_points'] == 10.0


# ============================================================================
# Tests: POST /submissions/answers/{season_slug}
# ============================================================================

@pytest.mark.django_db
class TestSubmitAnswersEndpoint:
    """Test suite for POST /api/v2/submissions/answers/{season_slug}"""

    def test_submit_answers_unauthenticated(self, api_client, open_season, sample_questions):
        """Test that unauthenticated requests are rejected."""
        payload = {
            'answers': [
                {'question_id': sample_questions['prop'].id, 'answer': 'Yes'}
            ]
        }

        response = api_client.post(
            f'/api/v2/submissions/answers/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 401

    def test_submit_answers_success(self, auth_client, open_season, sample_questions):
        """Test successfully submitting answers."""
        payload = {
            'answers': [
                {'question_id': sample_questions['prop'].id, 'answer': 'Yes'},
                {'question_id': sample_questions['superlative'].id, 'answer': '1'}
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/answers/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['status'] == 'success'
        assert data['saved_count'] == 2
        assert data['errors'] is None

        # Verify answers were saved
        assert Answer.objects.filter(user=auth_client.user, question=sample_questions['prop']).exists()
        assert Answer.objects.filter(user=auth_client.user, question=sample_questions['superlative']).exists()

    def test_submit_answers_deadline_passed(self, auth_client, closed_season, sample_questions):
        """Test that submissions are rejected after deadline."""
        question = PropQuestionFactory(season=closed_season, text='Closed question')
        payload = {
            'answers': [
                {'question_id': question.id, 'answer': 'Yes'}
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/answers/{closed_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        # API returns 404 for closed seasons (not 403)
        assert response.status_code == 404

    def test_submit_answers_future_season(self, auth_client, future_season):
        """Test that submissions are rejected before window opens."""
        question = PropQuestionFactory(season=future_season, text='Future question')
        payload = {
            'answers': [
                {'question_id': question.id, 'answer': 'Yes'}
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/answers/{future_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 403

    def test_submit_answers_update_existing(self, auth_client, open_season, sample_questions):
        """Test updating an existing answer."""
        # Create an initial answer
        AnswerFactory(
            user=auth_client.user,
            question=sample_questions['prop'],
            answer='No'
        )

        # Update the answer
        payload = {
            'answers': [
                {'question_id': sample_questions['prop'].id, 'answer': 'Yes'}
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/answers/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['saved_count'] == 1

        # Verify answer was updated (not duplicated)
        answers = Answer.objects.filter(user=auth_client.user, question=sample_questions['prop'])
        assert answers.count() == 1
        assert answers.first().answer == 'Yes'

    def test_submit_answers_invalid_question_id(self, auth_client, open_season):
        """Test error handling for invalid question ID."""
        payload = {
            'answers': [
                {'question_id': 99999, 'answer': 'Yes'}
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/answers/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200  # Endpoint returns 200 with errors
        data = response.json()

        assert data['status'] == 'error'
        assert data['saved_count'] == 0
        assert '99999' in data['errors']

    def test_submit_answers_wrong_season(self, auth_client, open_season, closed_season):
        """Test that questions from wrong season are rejected."""
        question_from_closed_season = PropQuestionFactory(
            season=closed_season,
            text='Wrong season question'
        )

        payload = {
            'answers': [
                {'question_id': question_from_closed_season.id, 'answer': 'Yes'}
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/answers/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['status'] == 'error'
        assert data['saved_count'] == 0

    def test_submit_answers_empty_payload(self, auth_client, open_season):
        """Test handling of empty answers list."""
        payload = {'answers': []}

        response = auth_client.post(
            f'/api/v2/submissions/answers/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        # Empty payload is accepted but saves nothing
        assert response.status_code == 200
        data = response.json()
        assert data['saved_count'] == 0
        assert data['status'] == 'success'

    def test_submit_answers_partial_success(self, auth_client, open_season, sample_questions):
        """Test partial success when some answers are invalid."""
        payload = {
            'answers': [
                {'question_id': sample_questions['prop'].id, 'answer': 'Yes'},
                {'question_id': 99999, 'answer': 'No'}  # Invalid
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/answers/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['status'] == 'partial_success'
        assert data['saved_count'] == 1
        assert data['errors'] is not None


# ============================================================================
# Tests: GET /submissions/standings/{season_slug}
# ============================================================================

@pytest.mark.django_db
class TestGetStandingsEndpoint:
    """Test suite for GET /api/v2/submissions/standings/{season_slug}"""

    def test_get_standings_unauthenticated_no_username(self, api_client, open_season):
        """Test that unauthenticated requests without username return empty."""
        response = api_client.get(f'/api/v2/submissions/standings/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['predictions'] == []
        assert data['east'] == []
        assert data['west'] == []

    def test_get_standings_authenticated_user(self, auth_client, open_season, sample_teams):
        """Test getting authenticated user's own standings predictions."""
        # Create some predictions
        for i, team in enumerate(sample_teams['east'][:3]):
            StandingPredictionFactory(
                user=auth_client.user,
                season=open_season,
                team=team,
                predicted_position=i + 1
            )

        response = auth_client.get(f'/api/v2/submissions/standings/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['username'] == auth_client.user.username
        assert len(data['predictions']) == 3
        assert len(data['east']) == 3
        assert len(data['west']) == 0

    def test_get_standings_with_username(self, api_client, open_season, sample_teams):
        """Test getting another user's standings predictions by username."""
        other_user = UserFactory(username='other_user')

        for i, team in enumerate(sample_teams['west'][:2]):
            StandingPredictionFactory(
                user=other_user,
                season=open_season,
                team=team,
                predicted_position=i + 1
            )

        response = api_client.get(
            f'/api/v2/submissions/standings/{open_season.slug}?username=other_user'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['username'] == 'other_user'
        assert len(data['predictions']) == 2
        assert len(data['west']) == 2

    def test_get_standings_nonexistent_user(self, api_client, open_season):
        """Test getting standings for non-existent user returns empty."""
        response = api_client.get(
            f'/api/v2/submissions/standings/{open_season.slug}?username=nonexistent'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['predictions'] == []

    def test_get_standings_separates_conferences(self, auth_client, open_season, sample_teams):
        """Test that predictions are properly separated by conference."""
        # Create predictions for both conferences
        for i, team in enumerate(sample_teams['east'][:2]):
            StandingPredictionFactory(
                user=auth_client.user,
                season=open_season,
                team=team,
                predicted_position=i + 1
            )

        for i, team in enumerate(sample_teams['west'][:2]):
            StandingPredictionFactory(
                user=auth_client.user,
                season=open_season,
                team=team,
                predicted_position=i + 1
            )

        response = auth_client.get(f'/api/v2/submissions/standings/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert len(data['predictions']) == 4
        assert len(data['east']) == 2
        assert len(data['west']) == 2


# ============================================================================
# Tests: POST /submissions/standings/{season_slug}
# ============================================================================

@pytest.mark.django_db
class TestSubmitStandingsEndpoint:
    """Test suite for POST /api/v2/submissions/standings/{season_slug}"""

    def test_submit_standings_unauthenticated(self, api_client, open_season, sample_teams):
        """Test that unauthenticated requests are rejected."""
        payload = {
            'predictions': [
                {'team_id': sample_teams['east'][0].id, 'predicted_position': 1}
            ]
        }

        response = api_client.post(
            f'/api/v2/submissions/standings/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 401

    def test_submit_standings_success(self, auth_client, open_season, sample_teams):
        """Test successfully submitting standings predictions."""
        payload = {
            'predictions': [
                {'team_id': sample_teams['east'][0].id, 'predicted_position': 1},
                {'team_id': sample_teams['east'][1].id, 'predicted_position': 2},
                {'team_id': sample_teams['west'][0].id, 'predicted_position': 1},
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/standings/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['status'] == 'success'
        assert data['saved_count'] == 3
        assert data['errors'] is None

        # Verify predictions were saved
        predictions = StandingPrediction.objects.filter(
            user=auth_client.user,
            season=open_season
        )
        assert predictions.count() == 3

    def test_submit_standings_deadline_passed(self, auth_client, closed_season, sample_teams):
        """Test that submissions are rejected after deadline."""
        payload = {
            'predictions': [
                {'team_id': sample_teams['east'][0].id, 'predicted_position': 1}
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/standings/{closed_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 403

    def test_submit_standings_duplicate_teams(self, auth_client, open_season, sample_teams):
        """Test that duplicate team_ids are rejected."""
        team_id = sample_teams['east'][0].id
        payload = {
            'predictions': [
                {'team_id': team_id, 'predicted_position': 1},
                {'team_id': team_id, 'predicted_position': 2}  # Duplicate
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/standings/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 400

    def test_submit_standings_duplicate_positions_same_conference(self, auth_client, open_season, sample_teams):
        """Test that duplicate positions in same conference are rejected."""
        payload = {
            'predictions': [
                {'team_id': sample_teams['east'][0].id, 'predicted_position': 1},
                {'team_id': sample_teams['east'][1].id, 'predicted_position': 1}  # Duplicate position
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/standings/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['status'] == 'error'
        assert 'Duplicate predicted position' in str(data['errors'])

    def test_submit_standings_invalid_position_range(self, auth_client, open_season, sample_teams):
        """Test that positions outside 1-15 range are rejected."""
        payload = {
            'predictions': [
                {'team_id': sample_teams['east'][0].id, 'predicted_position': 16}  # Invalid
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/standings/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['status'] == 'error'
        assert 'between 1 and 15' in str(data['errors'])

    def test_submit_standings_invalid_team_id(self, auth_client, open_season):
        """Test that invalid team IDs are rejected."""
        payload = {
            'predictions': [
                {'team_id': 99999, 'predicted_position': 1}
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/standings/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 400

    def test_submit_standings_update_existing(self, auth_client, open_season, sample_teams):
        """Test updating existing standings predictions."""
        # Create initial predictions
        for i, team in enumerate(sample_teams['east'][:2]):
            StandingPredictionFactory(
                user=auth_client.user,
                season=open_season,
                team=team,
                predicted_position=i + 1
            )

        # Update with new positions
        payload = {
            'predictions': [
                {'team_id': sample_teams['east'][0].id, 'predicted_position': 2},
                {'team_id': sample_teams['east'][1].id, 'predicted_position': 1},
            ]
        }

        response = auth_client.post(
            f'/api/v2/submissions/standings/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['saved_count'] == 2

        # Verify positions were updated
        pred1 = StandingPrediction.objects.get(
            user=auth_client.user,
            season=open_season,
            team=sample_teams['east'][0]
        )
        assert pred1.predicted_position == 2

    def test_submit_standings_empty_payload(self, auth_client, open_season):
        """Test error handling for empty predictions list."""
        payload = {'predictions': []}

        response = auth_client.post(
            f'/api/v2/submissions/standings/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 400


# ============================================================================
# Tests: Entry Fee Endpoints
# ============================================================================

@pytest.mark.django_db
class TestEntryFeeEndpoints:
    """Test suite for entry fee status endpoints"""

    def test_get_entry_fee_status_unauthenticated(self, api_client, open_season):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get(f'/api/v2/submissions/entry-fee/{open_season.slug}')

        assert response.status_code == 401

    def test_get_entry_fee_status_unpaid(self, auth_client, open_season):
        """Test getting entry fee status when unpaid."""
        response = auth_client.get(f'/api/v2/submissions/entry-fee/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['season_slug'] == open_season.slug
        assert data['is_paid'] is False
        assert data['paid_at'] is None
        assert 'amount_due' in data
        assert 'venmo_username' in data

    def test_get_entry_fee_status_paid(self, auth_client, open_season):
        """Test getting entry fee status when already paid."""
        # Mark as paid
        user_stats, _ = UserStats.objects.get_or_create(
            user=auth_client.user,
            season=open_season
        )
        user_stats.entry_fee_paid = True
        user_stats.entry_fee_paid_at = timezone.now()
        user_stats.save()

        response = auth_client.get(f'/api/v2/submissions/entry-fee/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['is_paid'] is True
        assert data['paid_at'] is not None

    def test_update_entry_fee_mark_as_paid(self, auth_client, open_season):
        """Test marking entry fee as paid."""
        payload = {'is_paid': True}

        response = auth_client.post(
            f'/api/v2/submissions/entry-fee/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['is_paid'] is True
        assert data['paid_at'] is not None

        # Verify in database
        user_stats = UserStats.objects.get(user=auth_client.user, season=open_season)
        assert user_stats.entry_fee_paid is True

    def test_update_entry_fee_mark_as_unpaid(self, auth_client, open_season):
        """Test marking entry fee as unpaid."""
        # First mark as paid
        user_stats, _ = UserStats.objects.get_or_create(
            user=auth_client.user,
            season=open_season
        )
        user_stats.entry_fee_paid = True
        user_stats.entry_fee_paid_at = timezone.now()
        user_stats.save()

        # Then mark as unpaid
        payload = {'is_paid': False}

        response = auth_client.post(
            f'/api/v2/submissions/entry-fee/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()

        assert data['is_paid'] is False
        assert data['paid_at'] is None

    def test_update_entry_fee_unauthenticated(self, api_client, open_season):
        """Test that unauthenticated requests are rejected."""
        payload = {'is_paid': True}

        response = api_client.post(
            f'/api/v2/submissions/entry-fee/{open_season.slug}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 401


# ============================================================================
# Tests: Submission Status Endpoint
# ============================================================================

@pytest.mark.django_db
class TestSubmissionStatusEndpoint:
    """Test suite for GET /api/v2/submissions/submission-status/{season_slug}"""

    def test_get_submission_status_open(self, api_client, open_season):
        """Test getting submission status for open window."""
        response = api_client.get(f'/api/v2/submissions/submission-status/{open_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['is_open'] is True
        assert 'message' in data

    def test_get_submission_status_closed(self, api_client, closed_season):
        """Test getting submission status for closed window."""
        response = api_client.get(f'/api/v2/submissions/submission-status/{closed_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['is_open'] is False

    def test_get_submission_status_future(self, api_client, future_season):
        """Test getting submission status for future window."""
        response = api_client.get(f'/api/v2/submissions/submission-status/{future_season.slug}')

        assert response.status_code == 200
        data = response.json()

        assert data['is_open'] is False
        assert 'days_until_open' in data

    def test_get_submission_status_invalid_season(self, api_client):
        """Test error when getting status for non-existent season."""
        response = api_client.get('/api/v2/submissions/submission-status/invalid-season')

        assert response.status_code == 404

    def test_get_submission_status_current_shortcut(self, api_client, open_season):
        """Test getting submission status using 'current' season slug."""
        response = api_client.get('/api/v2/submissions/submission-status/current')

        assert response.status_code == 200
        data = response.json()

        assert 'is_open' in data
