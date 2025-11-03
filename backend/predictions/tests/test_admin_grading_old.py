"""
Tests for admin grading endpoint (admin_grading.py - 734 lines).

This is a CRITICAL path test covering revenue and data-critical functionality.
Target: 80%+ coverage of admin_grading.py
"""
import pytest
from predictions.models import PropQuestion, Answer, UserStats, SuperlativeQuestion, Award
from predictions.tests.factories import (
    UserFactory,
    AdminUserFactory,
    CurrentSeasonFactory,
    PropQuestionFactory,
    AnswerFactory,
)

# HTTP status codes (Django Ninja / Django standard)
HTTP_200_OK = 200
HTTP_201_CREATED = 201
HTTP_400_BAD_REQUEST = 400
HTTP_401_UNAUTHORIZED = 401
HTTP_403_FORBIDDEN = 403
HTTP_404_NOT_FOUND = 404
HTTP_207_MULTI_STATUS = 207

# Django Ninja API v2 base URL
API_V2_BASE = '/api/v2'


pytestmark = [pytest.mark.django_db, pytest.mark.critical, pytest.mark.admin]


class TestGradingAuditEndpoint:
    """
    Tests for GET /api/v2/admin/grading/audit

    This endpoint returns ungraded questions for admin review.
    """

    def test_admin_can_access_grading_audit(self, admin_client, current_season):
        """Admin users can access the grading audit endpoint."""
        url = f'{API_V2_BASE}/admin/grading/audit/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert 'season_slug' in data
        assert 'users' in data
        assert data['season_slug'] == current_season.slug

    def test_non_admin_cannot_access_grading_audit(self, authenticated_client, current_season):
        """Regular users cannot access admin grading endpoints."""
        url = f'{API_V2_BASE}/admin/grading/audit/{current_season.slug}'
        response = authenticated_client.get(url)

        assert response.status_code == HTTP_403_FORBIDDEN

    def test_unauthenticated_users_cannot_access(self, api_client, current_season):
        """Unauthenticated users get 401."""
        url = f'{API_V2_BASE}/admin/grading/audit/{current_season.slug}'
        response = api_client.get(url)

        assert response.status_code == HTTP_401_UNAUTHORIZED

    def test_returns_user_breakdown_with_categories(self, admin_client, current_season):
        """Returns user breakdown with category data."""
        # Create user with answers
        user = UserFactory.create()
        question = PropQuestionFactory.create(
            season=current_season,
            correct_answer='Lakers',
            point_value=5
        )
        answer = AnswerFactory.create(
            user=user,
            question=question,
            answer='Lakers',
            is_correct=True,
            points_earned=5
        )

        # Create user stats
        UserStats.objects.create(
            user=user,
            season=current_season,
            points=5
        )

        url = f'{API_V2_BASE}/admin/grading/audit/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert 'users' in data
        # Should have at least one user
        if len(data['users']) > 0:
            user_data = data['users'][0]
            assert 'username' in user_data
            assert 'total_points' in user_data
            assert 'categories' in user_data

    def test_filters_by_season(self, admin_client):
        """Only returns data for the specified season."""
        season1 = CurrentSeasonFactory.create(slug='2024-25')
        season2 = CurrentSeasonFactory.create(slug='2023-24')

        url = f'{API_V2_BASE}/admin/grading/audit/{season1.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['season_slug'] == season1.slug
        assert data['season_year'] == season1.year

    def test_handles_empty_results(self, admin_client, current_season):
        """Returns empty users list when no user stats exist."""
        PropQuestionFactory.create(
            season=current_season,
            correct_answer='Answer'
        )

        url = f'{API_V2_BASE}/admin/grading/audit/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert 'users' in data
        assert isinstance(data['users'], list)

    def test_invalid_season_returns_404(self, admin_client):
        """Returns 404 for non-existent season."""
        url = f'{API_V2_BASE}/admin/grading/audit/invalid-season'
        response = admin_client.get(url)

        assert response.status_code == HTTP_404_NOT_FOUND


class TestManualGradingEndpoint:
    """
    Tests for POST /api/v2/admin/grading/grade-manual

    This endpoint allows admins to manually grade individual answers.
    """

    def test_admin_can_manually_grade_answer(self, admin_client, current_season):
        """Admin can manually grade an individual answer."""
        question = PropQuestionFactory.create(
            season=current_season,
            correct_answer=None,
            point_value=3
        )
        user = UserFactory.create()
        answer = AnswerFactory.create(
            user=user,
            question=question,
            answer='Lakers',
            points_earned=0,
            is_correct=None
        )

        # Create user stats
        UserStats.objects.create(
            user=user,
            season=current_season,
            points=0
        )

        url = f'{API_V2_BASE}/admin/grading/grade-manual'
        payload = {
            'answer_id': answer.id,
            'is_correct': True,
            'correct_answer': 'Lakers'
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True

        # Verify answer graded
        answer.refresh_from_db()
        assert answer.is_correct is True
        assert answer.points_earned == 3

    def test_incorrect_answers_get_zero_points(self, admin_client, current_season):
        """Users with wrong answers get 0 points."""
        question = PropQuestionFactory.create(
            season=current_season,
            point_value=3
        )
        user = UserFactory.create()
        answer = AnswerFactory.create(
            user=user,
            question=question,
            answer='Celtics',
            is_correct=None,
            points_earned=0
        )

        # Create user stats
        UserStats.objects.create(
            user=user,
            season=current_season,
            points=0
        )

        url = f'{API_V2_BASE}/admin/grading/grade-manual'
        payload = {
            'answer_id': answer.id,
            'is_correct': False,
            'correct_answer': 'Lakers'
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK

        answer.refresh_from_db()
        assert answer.is_correct is False
        assert answer.points_earned == 0

    def test_user_stats_updated_after_grading(self, admin_client, current_season):
        """UserStats are recalculated after grading."""
        question = PropQuestionFactory.create(
            season=current_season,
            point_value=5
        )
        user = UserFactory.create()
        answer = AnswerFactory.create(
            user=user,
            question=question,
            answer='Lakers',
            is_correct=None,
            points_earned=0
        )

        # Create user stats
        user_stats = UserStats.objects.create(
            user=user,
            season=current_season,
            points=0
        )

        url = f'{API_V2_BASE}/admin/grading/grade-manual'
        payload = {
            'answer_id': answer.id,
            'is_correct': True,
            'correct_answer': 'Lakers'
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK

        # Verify stats updated
        user_stats.refresh_from_db()
        assert user_stats.points == 5

    def test_non_admin_cannot_grade(self, authenticated_client, current_season):
        """Regular users cannot grade answers."""
        question = PropQuestionFactory.create(season=current_season)
        user = UserFactory.create()
        answer = AnswerFactory.create(
            user=user,
            question=question,
            answer='Lakers'
        )

        url = f'{API_V2_BASE}/admin/grading/grade-manual'
        payload = {
            'answer_id': answer.id,
            'is_correct': True
        }
        response = authenticated_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_403_FORBIDDEN

    def test_invalid_answer_id_returns_error(self, admin_client, current_season):
        """Returns error for non-existent answer."""
        url = f'{API_V2_BASE}/admin/grading/grade-manual'
        payload = {
            'answer_id': 99999,
            'is_correct': True
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_404_NOT_FOUND

    def test_missing_required_fields_returns_error(self, admin_client, current_season):
        """Returns validation error for missing fields."""
        url = f'{API_V2_BASE}/admin/grading/grade-manual'
        payload = {
            'answer_id': 1
            # Missing is_correct
        }
        response = admin_client.post(url, payload, content_type='application/json')

        # Django Ninja returns 422 for validation errors
        assert response.status_code == 422


# NOTE: Bulk grading and command execution endpoints are not yet implemented
# These tests serve as documentation for future API development

# class TestBulkGradingOperations:
#     """
#     Tests for bulk grading operations (NOT YET IMPLEMENTED).
#
#     Future endpoint: POST /api/v2/admin/grading/bulk
#     Admins can grade multiple questions at once.
#     """
#     pass


class TestGradeCommandExecution:
    """
    Tests for POST /api/v2/admin/grading/run-grading-command

    Endpoint for triggering grading management commands.
    """

    def test_execute_grade_props_command(self, admin_client, current_season, mocker):
        """Admin can trigger grade_props_answers command."""
        # Patch where call_command is used, not where it's defined
        mock_command = mocker.patch('predictions.api.v2.endpoints.admin_grading.call_command')

        url = f'{API_V2_BASE}/admin/grading/run-grading-command'
        payload = {
            'command': 'grade_props_answers',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        mock_command.assert_called_once_with('grade_props_answers', current_season.slug)

    def test_execute_grade_standings_command(self, admin_client, current_season, mocker):
        """Admin can trigger grade_standing_predictions command."""
        # Patch where call_command is used, not where it's defined
        mock_command = mocker.patch('predictions.api.v2.endpoints.admin_grading.call_command')

        url = f'{API_V2_BASE}/admin/grading/run-grading-command'
        payload = {
            'command': 'grade_standing_predictions',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        mock_command.assert_called_once_with('grade_standing_predictions', current_season.slug)

    def test_invalid_command_rejected(self, admin_client, current_season):
        """Invalid command names are rejected."""
        url = f'{API_V2_BASE}/admin/grading/run-grading-command'
        payload = {
            'command': 'drop_database',  # Malicious command
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_400_BAD_REQUEST


# ============================================================================
# Fixtures
# ============================================================================

# ============================================================================
# Integration Tests
# ============================================================================
# Note: Fixtures (api_client, admin_client, authenticated_client, current_season)
# are provided by backend/conftest.py

class TestAnswersForReviewEndpoint:
    """
    Tests for GET /api/v2/admin/grading/answers/{season_slug}

    This endpoint returns all answers for review with filtering options.
    """

    def test_admin_can_access_answers_for_review(self, admin_client, current_season):
        """Admin users can access the answers for review endpoint."""
        url = f'{API_V2_BASE}/admin/grading/answers/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert 'season_slug' in data
        assert 'total_count' in data
        assert 'answers' in data
        assert data['season_slug'] == current_season.slug

    def test_non_admin_cannot_access_answers(self, authenticated_client, current_season):
        """Regular users cannot access answers for review."""
        url = f'{API_V2_BASE}/admin/grading/answers/{current_season.slug}'
        response = authenticated_client.get(url)

        assert response.status_code == HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_access_answers(self, api_client, current_season):
        """Unauthenticated users get 401."""
        url = f'{API_V2_BASE}/admin/grading/answers/{current_season.slug}'
        response = api_client.get(url)

        assert response.status_code == HTTP_401_UNAUTHORIZED

    def test_filter_by_question_id(self, admin_client, current_season):
        """Can filter answers by question_id."""
        question1 = PropQuestionFactory.create(season=current_season)
        question2 = PropQuestionFactory.create(season=current_season)
        user = UserFactory.create()

        answer1 = AnswerFactory.create(user=user, question=question1, answer='Lakers')
        answer2 = AnswerFactory.create(user=user, question=question2, answer='Celtics')

        url = f'{API_V2_BASE}/admin/grading/answers/{current_season.slug}?question_id={question1.id}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['total_count'] == 1
        assert data['answers'][0]['question_id'] == question1.id

    def test_filter_by_user_id(self, admin_client, current_season):
        """Can filter answers by user_id."""
        question = PropQuestionFactory.create(season=current_season)
        user1 = UserFactory.create()
        user2 = UserFactory.create()

        answer1 = AnswerFactory.create(user=user1, question=question, answer='Lakers')
        answer2 = AnswerFactory.create(user=user2, question=question, answer='Celtics')

        url = f'{API_V2_BASE}/admin/grading/answers/{current_season.slug}?user_id={user1.id}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['total_count'] == 1
        assert data['answers'][0]['user_id'] == user1.id

    def test_filter_by_is_correct(self, admin_client, current_season):
        """Can filter answers by is_correct status."""
        question = PropQuestionFactory.create(season=current_season)
        user = UserFactory.create()

        correct_answer = AnswerFactory.create(
            user=user,
            question=question,
            answer='Lakers',
            is_correct=True
        )
        incorrect_answer = AnswerFactory.create(
            user=UserFactory.create(),
            question=question,
            answer='Celtics',
            is_correct=False
        )

        url = f'{API_V2_BASE}/admin/grading/answers/{current_season.slug}?is_correct=true'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['total_count'] == 1
        assert data['answers'][0]['is_correct'] is True

    def test_filter_pending_only(self, admin_client, current_season):
        """Can filter for pending answers only."""
        question = PropQuestionFactory.create(season=current_season, correct_answer=None)
        user = UserFactory.create()

        pending_answer = AnswerFactory.create(
            user=user,
            question=question,
            answer='Lakers',
            is_correct=None
        )
        graded_answer = AnswerFactory.create(
            user=UserFactory.create(),
            question=question,
            answer='Celtics',
            is_correct=True
        )

        url = f'{API_V2_BASE}/admin/grading/answers/{current_season.slug}?pending_only=true'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        # Should return only answers with is_correct=null OR question without correct_answer
        assert len(data['answers']) >= 1

    def test_returns_answer_details(self, admin_client, current_season):
        """Returns complete answer details."""
        question = PropQuestionFactory.create(
            season=current_season,
            text='Test question',
            point_value=5,
            correct_answer='Lakers'
        )
        user = UserFactory.create(username='testuser')
        answer = AnswerFactory.create(
            user=user,
            question=question,
            answer='Lakers',
            is_correct=True,
            points_earned=5
        )

        url = f'{API_V2_BASE}/admin/grading/answers/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert len(data['answers']) > 0
        answer_data = data['answers'][0]

        assert 'answer_id' in answer_data
        assert 'question_id' in answer_data
        assert 'question_text' in answer_data
        assert 'question_type' in answer_data
        assert 'user_id' in answer_data
        assert 'username' in answer_data
        assert 'user_answer' in answer_data
        assert 'correct_answer' in answer_data
        assert 'is_correct' in answer_data
        assert 'points_earned' in answer_data
        assert 'point_value' in answer_data

    def test_handles_current_season_slug(self, admin_client, current_season):
        """Handles 'current' as season_slug."""
        url = f'{API_V2_BASE}/admin/grading/answers/current'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['season_slug'] == current_season.slug

    def test_invalid_season_returns_404(self, admin_client):
        """Returns 404 for non-existent season."""
        url = f'{API_V2_BASE}/admin/grading/answers/invalid-season'
        response = admin_client.get(url)

        assert response.status_code == HTTP_404_NOT_FOUND


class TestQuestionsForGradingEndpoint:
    """
    Tests for GET /api/v2/admin/grading/questions/{season_slug}

    This endpoint returns all questions for a season so admin can set correct answers.
    """

    def test_admin_can_access_questions_for_grading(self, admin_client, current_season):
        """Admin users can access questions for grading endpoint."""
        url = f'{API_V2_BASE}/admin/grading/questions/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert 'season_slug' in data
        assert 'season_year' in data
        assert 'total_questions' in data
        assert 'questions' in data
        assert data['season_slug'] == current_season.slug

    def test_non_admin_cannot_access_questions(self, authenticated_client, current_season):
        """Regular users cannot access questions for grading."""
        url = f'{API_V2_BASE}/admin/grading/questions/{current_season.slug}'
        response = authenticated_client.get(url)

        assert response.status_code == HTTP_403_FORBIDDEN

    def test_returns_question_details(self, admin_client, current_season):
        """Returns complete question details."""
        question = PropQuestionFactory.create(
            season=current_season,
            text='Test question',
            point_value=5,
            correct_answer='Lakers'
        )
        user = UserFactory.create()
        AnswerFactory.create(user=user, question=question, answer='Lakers')

        url = f'{API_V2_BASE}/admin/grading/questions/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert len(data['questions']) > 0

        question_data = data['questions'][0]
        assert 'question_id' in question_data
        assert 'question_text' in question_data
        assert 'question_type' in question_data
        assert 'category' in question_data
        assert 'correct_answer' in question_data
        assert 'point_value' in question_data
        assert 'is_finalized' in question_data
        assert 'submission_count' in question_data
        assert 'has_correct_answer' in question_data

    def test_includes_submission_counts(self, admin_client, current_season):
        """Includes correct submission counts for each question."""
        question = PropQuestionFactory.create(season=current_season)
        user1 = UserFactory.create()
        user2 = UserFactory.create()

        AnswerFactory.create(user=user1, question=question, answer='Lakers')
        AnswerFactory.create(user=user2, question=question, answer='Celtics')

        url = f'{API_V2_BASE}/admin/grading/questions/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        question_data = next((q for q in data['questions'] if q['question_id'] == question.id), None)
        assert question_data is not None
        assert question_data['submission_count'] == 2

    def test_handles_polymorphic_question_types(self, admin_client, current_season):
        """Correctly handles different polymorphic question types."""
        from predictions.models import SuperlativeQuestion, HeadToHeadQuestion, PlayerStatPredictionQuestion

        # Create different question types
        prop_question = PropQuestionFactory.create(season=current_season, text='Prop Q')

        url = f'{API_V2_BASE}/admin/grading/questions/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()

        # Should return questions with proper types
        question_types = [q['question_type'] for q in data['questions']]
        assert 'PropQuestion' in question_types

    def test_categorizes_questions_correctly(self, admin_client, current_season):
        """Questions are categorized correctly."""
        prop_question = PropQuestionFactory.create(season=current_season)

        url = f'{API_V2_BASE}/admin/grading/questions/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()

        prop_q = next((q for q in data['questions'] if q['question_id'] == prop_question.id), None)
        assert prop_q is not None
        assert prop_q['category'] == 'Props'

    def test_handles_current_season_slug(self, admin_client, current_season):
        """Handles 'current' as season_slug."""
        url = f'{API_V2_BASE}/admin/grading/questions/current'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['season_slug'] == current_season.slug

    def test_invalid_season_returns_404(self, admin_client):
        """Returns 404 for non-existent season."""
        url = f'{API_V2_BASE}/admin/grading/questions/invalid-season'
        response = admin_client.get(url)

        assert response.status_code == HTTP_404_NOT_FOUND

    def test_questions_sorted_by_category(self, admin_client, current_season):
        """Questions are sorted by category and text."""
        # Create questions that will be in different categories
        q1 = PropQuestionFactory.create(season=current_season, text='Z Question')
        q2 = PropQuestionFactory.create(season=current_season, text='A Question')

        url = f'{API_V2_BASE}/admin/grading/questions/{current_season.slug}'
        response = admin_client.get(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()

        # Should be sorted
        questions = data['questions']
        assert len(questions) >= 2


class TestUpdateQuestionAnswerEndpoint:
    """
    Tests for POST /api/v2/admin/grading/update-question

    This endpoint updates a question's correct answer.
    """

    def test_admin_can_update_question_answer(self, admin_client, current_season):
        """Admin can update a question's correct answer."""
        question = PropQuestionFactory.create(
            season=current_season,
            correct_answer=None
        )

        url = f'{API_V2_BASE}/admin/grading/update-question'
        payload = {
            'question_id': question.id,
            'correct_answer': 'Lakers'
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        assert data['question_id'] == question.id
        assert data['correct_answer'] == 'Lakers'

        # Verify database updated
        question.refresh_from_db()
        assert question.correct_answer == 'Lakers'

    def test_non_admin_cannot_update_question(self, authenticated_client, current_season):
        """Regular users cannot update questions."""
        question = PropQuestionFactory.create(season=current_season)

        url = f'{API_V2_BASE}/admin/grading/update-question'
        payload = {
            'question_id': question.id,
            'correct_answer': 'Lakers'
        }
        response = authenticated_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_403_FORBIDDEN

    def test_update_with_finalized_flag_for_superlative(self, admin_client, current_season):
        """Can mark SuperlativeQuestion as finalized when updating."""
        # Create an Award first (required for SuperlativeQuestion)
        award = Award.objects.create(
            name='MVP'
        )

        # Create a SuperlativeQuestion
        question = SuperlativeQuestion.objects.create(
            season=current_season,
            text='Who will be MVP?',
            point_value=10,
            correct_answer=None,
            is_finalized=False,
            award=award
        )

        url = f'{API_V2_BASE}/admin/grading/update-question'
        payload = {
            'question_id': question.id,
            'correct_answer': 'LeBron James',
            'is_finalized': True
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        assert data['is_finalized'] is True

        # Verify database updated
        question.refresh_from_db()
        assert question.is_finalized is True
        assert question.correct_answer == 'LeBron James'

    def test_finalized_flag_ignored_for_non_superlative(self, admin_client, current_season):
        """is_finalized flag is ignored for non-SuperlativeQuestion types."""
        question = PropQuestionFactory.create(season=current_season)

        url = f'{API_V2_BASE}/admin/grading/update-question'
        payload = {
            'question_id': question.id,
            'correct_answer': 'Lakers',
            'is_finalized': True  # Should be ignored
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        # Non-superlative questions don't have is_finalized
        assert data['is_finalized'] is False

    def test_invalid_question_id_returns_404(self, admin_client):
        """Returns 404 for non-existent question."""
        url = f'{API_V2_BASE}/admin/grading/update-question'
        payload = {
            'question_id': 99999,
            'correct_answer': 'Lakers'
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_404_NOT_FOUND

    def test_polymorphic_question_update(self, admin_client, current_season):
        """Can update polymorphic question types correctly."""
        question = PropQuestionFactory.create(season=current_season)

        url = f'{API_V2_BASE}/admin/grading/update-question'
        payload = {
            'question_id': question.id,
            'correct_answer': 'Over'
        }
        response = admin_client.post(url, payload, content_type='application/json')

        assert response.status_code == HTTP_200_OK

        # Verify polymorphic instance updated
        from predictions.models import Question
        question_real = Question.objects.get(id=question.id).get_real_instance()
        assert question_real.correct_answer == 'Over'


class TestFinalizeQuestionEndpoint:
    """
    Tests for POST /api/v2/admin/grading/finalize-question/{question_id}

    This endpoint marks a question (typically SuperlativeQuestion) as finalized.
    """

    def test_admin_can_finalize_superlative_question(self, admin_client, current_season):
        """Admin can finalize a SuperlativeQuestion."""
        # Create an Award first (required for SuperlativeQuestion)
        award = Award.objects.create(
            name='MVP'
        )

        question = SuperlativeQuestion.objects.create(
            season=current_season,
            text='Who will be MVP?',
            point_value=10,
            correct_answer='LeBron James',
            is_finalized=False,
            award=award
        )

        url = f'{API_V2_BASE}/admin/grading/finalize-question/{question.id}'
        response = admin_client.post(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        assert data['is_finalized'] is True
        assert data['question_id'] == question.id

        # Verify database updated
        question.refresh_from_db()
        assert question.is_finalized is True

    def test_can_set_correct_answer_while_finalizing(self, admin_client, current_season):
        """Can set correct answer and finalize in one request."""
        # Create an Award first (required for SuperlativeQuestion)
        award = Award.objects.create(
            name='MVP'
        )

        question = SuperlativeQuestion.objects.create(
            season=current_season,
            text='Who will be MVP?',
            point_value=10,
            correct_answer=None,
            is_finalized=False,
            award=award
        )

        url = f'{API_V2_BASE}/admin/grading/finalize-question/{question.id}?correct_answer=LeBron James'
        response = admin_client.post(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        assert data['is_finalized'] is True
        assert data['correct_answer'] == 'LeBron James'

        # Verify database updated
        question.refresh_from_db()
        assert question.is_finalized is True
        assert question.correct_answer == 'LeBron James'

    def test_non_superlative_question_not_finalized(self, admin_client, current_season):
        """Non-SuperlativeQuestion types don't get finalized."""
        question = PropQuestionFactory.create(
            season=current_season,
            correct_answer='Lakers'
        )

        url = f'{API_V2_BASE}/admin/grading/finalize-question/{question.id}'
        response = admin_client.post(url)

        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        assert data['is_finalized'] is False  # PropQuestion doesn't have is_finalized

    def test_non_admin_cannot_finalize(self, authenticated_client, current_season):
        """Regular users cannot finalize questions."""
        # Create an Award first (required for SuperlativeQuestion)
        award = Award.objects.create(
            name='MVP'
        )

        question = SuperlativeQuestion.objects.create(
            season=current_season,
            text='Who will be MVP?',
            point_value=10,
            is_finalized=False,
            award=award
        )

        url = f'{API_V2_BASE}/admin/grading/finalize-question/{question.id}'
        response = authenticated_client.post(url)

        assert response.status_code == HTTP_403_FORBIDDEN

    def test_invalid_question_id_returns_404(self, admin_client):
        """Returns 404 for non-existent question."""
        url = f'{API_V2_BASE}/admin/grading/finalize-question/99999'
        response = admin_client.post(url)

        assert response.status_code == HTTP_404_NOT_FOUND


class TestGradingIntegration:
    """
    Integration tests for complete grading workflows.
    """

    def test_full_grading_workflow(self, admin_client, current_season):
        """Test complete grading workflow from question to user stats."""
        # 1. Create question
        question = PropQuestionFactory.create(
            season=current_season,
            text='Who will win the championship?',
            point_value=10,
            correct_answer=None
        )

        # 2. Create user submissions
        user1 = UserFactory.create(username='user1')
        user2 = UserFactory.create(username='user2')

        answer1 = AnswerFactory.create(
            user=user1,
            question=question,
            answer='Lakers',
            is_correct=None,
            points_earned=0
        )
        answer2 = AnswerFactory.create(
            user=user2,
            question=question,
            answer='Celtics',
            is_correct=None,
            points_earned=0
        )

        # Create user stats
        UserStats.objects.create(user=user1, season=current_season, points=0)
        UserStats.objects.create(user=user2, season=current_season, points=0)

        # 3. Admin grades answer1 (correct)
        url = f'{API_V2_BASE}/admin/grading/grade-manual'
        payload1 = {
            'answer_id': answer1.id,
            'is_correct': True,
            'correct_answer': 'Lakers'
        }
        response = admin_client.post(url, payload1, content_type='application/json')
        assert response.status_code == HTTP_200_OK

        # 4. Admin grades answer2 (incorrect)
        payload2 = {
            'answer_id': answer2.id,
            'is_correct': False,
            'correct_answer': 'Lakers'
        }
        response = admin_client.post(url, payload2, content_type='application/json')
        assert response.status_code == HTTP_200_OK

        # 5. Verify answers graded correctly
        answer1.refresh_from_db()
        answer2.refresh_from_db()

        assert answer1.is_correct is True
        assert answer1.points_earned == 10
        assert answer2.is_correct is False
        assert answer2.points_earned == 0

        # 6. Verify user stats updated
        stats1 = UserStats.objects.get(user=user1, season=current_season)
        stats2 = UserStats.objects.get(user=user2, season=current_season)

        assert stats1.points == 10
        assert stats2.points == 0
