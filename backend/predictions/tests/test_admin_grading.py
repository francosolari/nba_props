"""
Tests for admin grading endpoint (admin_grading.py - 734 lines).

This is a CRITICAL path test covering revenue and data-critical functionality.
Target: 80%+ coverage of admin_grading.py
"""
import pytest
from django.urls import reverse
from rest_framework import status
from predictions.models import PropQuestion, Answer, UserStats
from predictions.tests.factories import (
    UserFactory,
    AdminUserFactory,
    CurrentSeasonFactory,
    PropQuestionFactory,
    AnswerFactory,
)


pytestmark = [pytest.mark.django_db, pytest.mark.critical, pytest.mark.admin]


class TestGradingAuditEndpoint:
    """
    Tests for GET /api/v2/admin/grading/audit

    This endpoint returns ungraded questions for admin review.
    """

    def test_admin_can_access_grading_audit(self, admin_client, current_season):
        """Admin users can access the grading audit endpoint."""
        url = reverse('api-2:admin-grading-audit', kwargs={'season_slug': current_season.slug})
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'ungraded_questions' in response.data

    def test_non_admin_cannot_access_grading_audit(self, authenticated_client, current_season):
        """Regular users cannot access admin grading endpoints."""
        url = reverse('api-2:admin-grading-audit', kwargs={'season_slug': current_season.slug})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_users_cannot_access(self, api_client, current_season):
        """Unauthenticated users get 401."""
        url = reverse('api-2:admin-grading-audit', kwargs={'season_slug': current_season.slug})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_returns_ungraded_questions(self, admin_client, current_season):
        """Returns questions that don't have correct_answer set."""
        # Create graded and ungraded questions
        graded_q = PropQuestionFactory.create(
            season=current_season,
            correct_answer='Lakers',
            is_active=True
        )
        ungraded_q1 = PropQuestionFactory.create(
            season=current_season,
            correct_answer=None,
            is_active=True
        )
        ungraded_q2 = PropQuestionFactory.create(
            season=current_season,
            correct_answer=None,
            is_active=True
        )

        url = reverse('api-2:admin-grading-audit', kwargs={'season_slug': current_season.slug})
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        ungraded = response.data['ungraded_questions']
        assert len(ungraded) == 2
        ungraded_ids = [q['id'] for q in ungraded]
        assert ungraded_q1.id in ungraded_ids
        assert ungraded_q2.id in ungraded_ids
        assert graded_q.id not in ungraded_ids

    def test_filters_by_season(self, admin_client):
        """Only returns questions for the specified season."""
        season1 = CurrentSeasonFactory.create(slug='2024-25')
        season2 = CurrentSeasonFactory.create(slug='2023-24')

        q1 = PropQuestionFactory.create(season=season1, correct_answer=None)
        q2 = PropQuestionFactory.create(season=season2, correct_answer=None)

        url = reverse('api-2:admin-grading-audit', kwargs={'season_slug': season1.slug})
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        ungraded_ids = [q['id'] for q in response.data['ungraded_questions']]
        assert q1.id in ungraded_ids
        assert q2.id not in ungraded_ids

    def test_handles_empty_results(self, admin_client, current_season):
        """Returns empty list when all questions are graded."""
        PropQuestionFactory.create(
            season=current_season,
            correct_answer='Answer',
            is_active=True
        )

        url = reverse('api-2:admin-grading-audit', kwargs={'season_slug': current_season.slug})
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['ungraded_questions'] == []

    def test_invalid_season_returns_404(self, admin_client):
        """Returns 404 for non-existent season."""
        url = reverse('api-2:admin-grading-audit', kwargs={'season_slug': 'invalid-season'})
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestManualGradingEndpoint:
    """
    Tests for POST /api/v2/admin/grading/manual

    This endpoint allows admins to manually grade questions and update user points.
    """

    def test_admin_can_manually_grade_question(self, admin_client, current_season):
        """Admin can set correct answer and grade submissions."""
        question = PropQuestionFactory.create(
            season=current_season,
            correct_answer=None,
            point_value=3
        )
        user = UserFactory.create()
        answer = AnswerFactory.create(
            user=user,
            question=question,
            answer_text='Lakers',
            points_earned=0
        )

        url = reverse('api-2:admin-manual-grading')
        payload = {
            'question_id': question.id,
            'correct_answer': 'Lakers',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        # Verify question updated
        question.refresh_from_db()
        assert question.correct_answer == 'Lakers'

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
            answer_text='Celtics'
        )

        url = reverse('api-2:admin-manual-grading')
        payload = {
            'question_id': question.id,
            'correct_answer': 'Lakers',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

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
            answer_text='Lakers'
        )

        # Create or get user stats
        user_stats, _ = UserStats.objects.get_or_create(
            user=user,
            season=current_season,
            defaults={'total_points': 0}
        )

        url = reverse('api-2:admin-manual-grading')
        payload = {
            'question_id': question.id,
            'correct_answer': 'Lakers',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        # Verify stats updated
        user_stats.refresh_from_db()
        assert user_stats.total_points == 5

    def test_non_admin_cannot_grade(self, authenticated_client, current_season):
        """Regular users cannot grade questions."""
        question = PropQuestionFactory.create(season=current_season)

        url = reverse('api-2:admin-manual-grading')
        payload = {
            'question_id': question.id,
            'correct_answer': 'Lakers',
            'season_slug': current_season.slug
        }
        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_question_id_returns_error(self, admin_client, current_season):
        """Returns error for non-existent question."""
        url = reverse('api-2:admin-manual-grading')
        payload = {
            'question_id': 99999,
            'correct_answer': 'Lakers',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_required_fields_returns_error(self, admin_client, current_season):
        """Returns validation error for missing fields."""
        url = reverse('api-2:admin-manual-grading')
        payload = {
            'question_id': 1,
            # Missing correct_answer
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestBulkGradingOperations:
    """
    Tests for bulk grading operations.

    Admins can grade multiple questions at once.
    """

    def test_bulk_grade_multiple_questions(self, admin_client, current_season):
        """Admin can grade multiple questions in one request."""
        q1 = PropQuestionFactory.create(season=current_season)
        q2 = PropQuestionFactory.create(season=current_season)
        q3 = PropQuestionFactory.create(season=current_season)

        url = reverse('api-2:admin-bulk-grading')
        payload = {
            'season_slug': current_season.slug,
            'gradings': [
                {'question_id': q1.id, 'correct_answer': 'Answer1'},
                {'question_id': q2.id, 'correct_answer': 'Answer2'},
                {'question_id': q3.id, 'correct_answer': 'Answer3'},
            ]
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        # Verify all questions graded
        q1.refresh_from_db()
        q2.refresh_from_db()
        q3.refresh_from_db()

        assert q1.correct_answer == 'Answer1'
        assert q2.correct_answer == 'Answer2'
        assert q3.correct_answer == 'Answer3'

    def test_partial_failure_handling(self, admin_client, current_season):
        """Handles partial failures in bulk grading."""
        q1 = PropQuestionFactory.create(season=current_season)

        url = reverse('api-2:admin-bulk-grading')
        payload = {
            'season_slug': current_season.slug,
            'gradings': [
                {'question_id': q1.id, 'correct_answer': 'Answer1'},
                {'question_id': 99999, 'correct_answer': 'Answer2'},  # Invalid
            ]
        }
        response = admin_client.post(url, payload, format='json')

        # Should return partial success with errors
        assert response.status_code == status.HTTP_207_MULTI_STATUS
        assert 'errors' in response.data
        assert len(response.data['errors']) > 0


class TestGradeCommandExecution:
    """
    Tests for triggering grading commands from admin panel.
    """

    def test_execute_grade_props_command(self, admin_client, current_season, mocker):
        """Admin can trigger grade_props_answers command."""
        mock_command = mocker.patch('django.core.management.call_command')

        url = reverse('api-2:admin-execute-grade-command')
        payload = {
            'command': 'grade_props_answers',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK
        mock_command.assert_called_once_with('grade_props_answers', current_season.slug)

    def test_execute_grade_standings_command(self, admin_client, current_season, mocker):
        """Admin can trigger grade_standing_predictions command."""
        mock_command = mocker.patch('django.core.management.call_command')

        url = reverse('api-2:admin-execute-grade-command')
        payload = {
            'command': 'grade_standing_predictions',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK
        mock_command.assert_called_once()

    def test_invalid_command_rejected(self, admin_client, current_season):
        """Invalid command names are rejected."""
        url = reverse('api-2:admin-execute-grade-command')
        payload = {
            'command': 'drop_database',  # Malicious command
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def current_season():
    """Fixture for current season."""
    return CurrentSeasonFactory.create()


@pytest.fixture
def api_client():
    """DRF API client."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """API client authenticated as regular user."""
    user = UserFactory.create()
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(api_client):
    """API client authenticated as admin user."""
    admin = AdminUserFactory.create()
    api_client.force_authenticate(user=admin)
    return api_client


# ============================================================================
# Integration Tests
# ============================================================================

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
            answer_text='Lakers'
        )
        answer2 = AnswerFactory.create(
            user=user2,
            question=question,
            answer_text='Celtics'
        )

        # 3. Admin grades the question
        url = reverse('api-2:admin-manual-grading')
        payload = {
            'question_id': question.id,
            'correct_answer': 'Lakers',
            'season_slug': current_season.slug
        }
        response = admin_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        # 4. Verify answers graded correctly
        answer1.refresh_from_db()
        answer2.refresh_from_db()

        assert answer1.is_correct is True
        assert answer1.points_earned == 10
        assert answer2.is_correct is False
        assert answer2.points_earned == 0

        # 5. Verify user stats updated
        stats1 = UserStats.objects.get(user=user1, season=current_season)
        stats2 = UserStats.objects.get(user=user2, season=current_season)

        assert stats1.total_points == 10
        assert stats2.total_points == 0
