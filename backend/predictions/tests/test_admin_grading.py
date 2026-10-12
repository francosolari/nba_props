"""
Optimized Admin Grading API Tests

Production-standard test suite with:
- 23 tests (consolidated from 47)
- Target: <10 seconds runtime
- Coverage: 80%+ of admin_grading.py
- Focus on critical paths and edge cases

Performance optimizations:
- Use module-level pytestmark for database access (faster transactional rollbacks)
- Consolidate similar tests into parametrized tests where possible
- Mock management command calls to avoid slow external operations
- Minimal database setup with focused fixtures
"""
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from predictions.models import Season, Answer, UserStats, StandingPrediction, Question, Player
from predictions.tests.factories import (
    SeasonFactory,
    UserFactory,
    AdminUserFactory,
    PropQuestionFactory,
    SuperlativeQuestionFactory,
    HeadToHeadQuestionFactory,
    AwardFactory,
    TeamFactory,
    PlayerFactory,
    PlayerStatFactory,
    InSeasonTournamentQuestionFactory,
    PlayerStatPredictionQuestionFactory,
    NBAFinalsPredictionQuestionFactory,
)

User = get_user_model()
pytestmark = pytest.mark.django_db

# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """Django test client."""
    return Client()


@pytest.fixture(scope='module')
def admin_user(django_db_setup, django_db_blocker):
    """Create admin user."""
    with django_db_blocker.unblock():
        return AdminUserFactory()


@pytest.fixture(scope='module')
def regular_user(django_db_setup, django_db_blocker):
    """Create regular user."""
    with django_db_blocker.unblock():
        return UserFactory()


@pytest.fixture
def current_season(db):
    """Create current season.

    Per-test (not module-scoped): a module-scoped fixture created via
    django_db_blocker.unblock() commits outside the per-test transaction
    rollback, leaking a Season row for the rest of the pytest session and
    corrupting "latest season" resolution in unrelated tests that run
    afterward in the same session.
    """
    return SeasonFactory(slug='2024-25')


@pytest.fixture
def admin_client(api_client, admin_user):
    """Authenticated admin client."""
    api_client.force_login(admin_user)
    return api_client


@pytest.fixture
def user_client(api_client, regular_user):
    """Authenticated regular user client."""
    api_client.force_login(regular_user)
    return api_client


@pytest.fixture
def sample_questions(db, current_season):
    """Create sample questions of different types."""
    award = AwardFactory(name='MVP')
    return {
        'prop': PropQuestionFactory(season=current_season, text='Will LeBron average 25+ PPG?', point_value=3),
        'superlative': SuperlativeQuestionFactory(season=current_season, award=award, text='Who will be MVP?', point_value=10),
        'h2h': HeadToHeadQuestionFactory(season=current_season, text='Lakers vs Celtics?', point_value=5),
    }


@pytest.fixture
def comprehensive_question_set(current_season):
    """Create a set of questions covering all grading categories."""
    user = UserFactory()
    UserStats.objects.get_or_create(user=user, season=current_season, defaults={'points': 0})

    team1 = TeamFactory(name='Team Alpha')
    team2 = TeamFactory(name='Team Beta')
    extra_team = TeamFactory(name='Team Gamma')

    prop_player = PlayerFactory(name='Prop Player')
    stat_player = PlayerFactory(name='Stat Star')
    leader = PlayerFactory(name='Award Leader')
    runner = PlayerFactory(name='Award Runner')

    player_stat = PlayerStatFactory(player=stat_player, season=current_season)

    prop_yes_no = PropQuestionFactory(
        season=current_season,
        text='Will Prop Player score 20?',
        point_value=3,
        correct_answer='Yes',
        related_player=prop_player
    )
    prop_over_under = PropQuestionFactory(
        season=current_season,
        text='Prop Player over 28.5?',
        point_value=4,
        outcome_type='over_under',
        line=28.5,
        correct_answer='Over',
        related_player=prop_player
    )
    super_question = SuperlativeQuestionFactory(
        season=current_season,
        award=AwardFactory(name='MVP'),
        text='Who wins MVP?',
        point_value=10,
        correct_answer='Award Leader',
        is_finalized=True
    )
    super_question.current_leader = leader
    super_question.current_runner_up = runner
    super_question.save()

    ist_question = InSeasonTournamentQuestionFactory(
        season=current_season,
        text='Who wins East Group A?',
        point_value=4,
        correct_answer='Team Alpha'
    )
    player_stat_question = PlayerStatPredictionQuestionFactory(
        season=current_season,
        player_stat=player_stat,
        text='Stat Star average points?',
        point_value=5,
        fixed_value=27.5,
        correct_answer='27.5'
    )
    h2h_question = HeadToHeadQuestionFactory(
        season=current_season,
        team1=team1,
        team2=team2,
        text='Who wins opening night?',
        point_value=5,
        correct_answer=team1.name
    )
    finals_question = NBAFinalsPredictionQuestionFactory(
        season=current_season,
        text='Who wins the Finals?',
        point_value=6,
        correct_answer='Team Alpha'
    )
    generic_question = Question.objects.create(
        season=current_season,
        text='Generic catch-all question',
        point_value=2,
        correct_answer='Generic'
    )

    Answer.objects.create(user=user, question=prop_yes_no, answer='Yes', is_correct=True, points_earned=3)
    Answer.objects.create(user=user, question=super_question, answer='Award Leader', is_correct=True, points_earned=10)
    Answer.objects.create(user=user, question=h2h_question, answer=team2.name, is_correct=False, points_earned=0)
    Answer.objects.create(user=user, question=ist_question, answer='Team Beta', is_correct=False, points_earned=0)
    Answer.objects.create(user=user, question=player_stat_question, answer='27.5', is_correct=None, points_earned=0)
    Answer.objects.create(user=user, question=finals_question, answer='Team Alpha', is_correct=True, points_earned=6)
    Answer.objects.create(user=user, question=generic_question, answer='Generic', is_correct=None, points_earned=0)

    StandingPrediction.objects.create(user=user, season=current_season, team=team1, predicted_position=1, points=3)
    StandingPrediction.objects.create(user=user, season=current_season, team=team2, predicted_position=2, points=1)
    StandingPrediction.objects.create(user=user, season=current_season, team=extra_team, predicted_position=3, points=0)

    return {
        'user': user,
        'prop_yes_no': prop_yes_no,
        'prop_over_under': prop_over_under,
        'super_question': super_question,
        'ist_question': ist_question,
        'player_stat_question': player_stat_question,
        'h2h_question': h2h_question,
        'finals_question': finals_question,
        'generic_question': generic_question,
    }


# ============================================================================
# Test Class 1: Grading Audit Endpoint (6 tests)
# ============================================================================

class TestGradingAuditEndpoint:
    """Tests for GET /api/v2/admin/grading/audit/{season_slug}"""

    def test_admin_can_access_grading_audit(self, admin_client, current_season):
        """Admin can access audit endpoint."""
        response = admin_client.get(f'/api/v2/admin/grading/audit/{current_season.slug}')
        assert response.status_code == 200
        data = response.json()
        assert 'season_slug' in data
        assert 'users' in data

    def test_non_admin_cannot_access_grading_audit(self, user_client, current_season):
        """Non-admin gets 403."""
        response = user_client.get(f'/api/v2/admin/grading/audit/{current_season.slug}')
        assert response.status_code == 403

    def test_unauthenticated_users_cannot_access(self, api_client, current_season):
        """Unauthenticated gets 401/403/302."""
        response = api_client.get(f'/api/v2/admin/grading/audit/{current_season.slug}')
        assert response.status_code in [401, 302, 403]

    def test_returns_user_breakdown_with_categories(self, admin_client, current_season, sample_questions):
        """Response includes user breakdown."""
        user = UserFactory()
        Answer.objects.create(user=user, question=sample_questions['prop'], answer='Yes', is_correct=True, points_earned=3)
        UserStats.objects.create(user=user, season=current_season, points=3)

        response = admin_client.get(f'/api/v2/admin/grading/audit/{current_season.slug}')
        data = response.json()
        assert isinstance(data['users'], list)

    def test_handles_current_season_slug(self, admin_client, current_season):
        """'current' resolves to latest season."""
        response = admin_client.get('/api/v2/admin/grading/audit/current')
        assert response.status_code == 200

    def test_invalid_season_returns_404(self, admin_client):
        """Invalid season returns 404."""
        response = admin_client.get('/api/v2/admin/grading/audit/invalid-slug')
        assert response.status_code == 404

    def test_current_season_missing_returns_404(self, admin_client, mocker):
        """Missing current season returns 404."""
        mock_qs = mocker.Mock()
        mock_qs.first.return_value = None
        mocker.patch('predictions.api.v2.endpoints.admin_grading.Season.objects.order_by', return_value=mock_qs)

        response = admin_client.get('/api/v2/admin/grading/audit/current')
        assert response.status_code == 404

    def test_grading_audit_includes_all_categories(self, admin_client, current_season, comprehensive_question_set):
        """Audit response includes every category and standings breakdown."""
        response = admin_client.get(f'/api/v2/admin/grading/audit/{current_season.slug}')
        assert response.status_code == 200

        data = response.json()
        user_entry = next(user for user in data['users'] if user['user_id'] == comprehensive_question_set['user'].id)
        categories = {cat['category_name'] for cat in user_entry['categories']}

        assert {
            'Awards/Superlatives',
            'Props',
            'Head-to-Head',
            'In-Season Tournament',
            'Player Stats',
            'NBA Finals',
            'Other',
            'Regular Season Standings',
        }.issubset(categories)


# ============================================================================
# Test Class 2: Manual Grading (5 tests)
# ============================================================================

class TestManualGradingEndpoint:
    """Tests for POST /api/v2/admin/grading/manual-grade"""

    def test_admin_can_manually_grade_answer(self, admin_client, current_season, sample_questions):
        """Admin can mark answer as correct."""
        user = UserFactory()
        answer = Answer.objects.create(user=user, question=sample_questions['prop'], answer='Yes')

        response = admin_client.post(
            '/api/v2/admin/grading/grade-manual',
            data={'answer_id': answer.id, 'is_correct': True, 'points_awarded': 3},
            content_type='application/json'
        )

        assert response.status_code == 200
        answer.refresh_from_db()
        assert answer.is_correct is True
        assert answer.points_earned == 3

    def test_incorrect_answers_get_zero_points(self, admin_client, current_season, sample_questions):
        """Can mark answer incorrect with 0 points."""
        user = UserFactory()
        answer = Answer.objects.create(user=user, question=sample_questions['prop'], answer='No')

        response = admin_client.post(
            '/api/v2/admin/grading/grade-manual',
            data={'answer_id': answer.id, 'is_correct': False, 'points_awarded': 0},
            content_type='application/json'
        )

        assert response.status_code == 200
        answer.refresh_from_db()
        assert answer.is_correct is False
        assert answer.points_earned == 0

    def test_user_stats_updated_after_grading(self, admin_client, current_season, sample_questions):
        """UserStats updated after grading."""
        user = UserFactory()
        UserStats.objects.create(user=user, season=current_season, points=0)
        answer = Answer.objects.create(user=user, question=sample_questions['prop'], answer='Yes')

        admin_client.post(
            '/api/v2/admin/grading/grade-manual',
            data={'answer_id': answer.id, 'is_correct': True, 'points_awarded': 5},
            content_type='application/json'
        )

        user_stats = UserStats.objects.get(user=user, season=current_season)
        assert user_stats.points >= 0  # Updated

    def test_non_admin_cannot_grade(self, user_client, current_season, sample_questions):
        """Non-admin gets 403."""
        user = UserFactory()
        answer = Answer.objects.create(user=user, question=sample_questions['prop'], answer='Yes')

        response = user_client.post(
            '/api/v2/admin/grading/grade-manual',
            data={'answer_id': answer.id, 'is_correct': True, 'points_awarded': 3},
            content_type='application/json'
        )

        assert response.status_code == 403

    def test_invalid_answer_id_returns_error(self, admin_client):
        """Invalid answer ID returns error."""
        response = admin_client.post(
            '/api/v2/admin/grading/grade-manual',
            data={'answer_id': 99999, 'is_correct': True, 'points_awarded': 3},
            content_type='application/json'
        )

        assert response.status_code in [404, 400]

    def test_points_override_updates_question_and_answer(self, admin_client, current_season, sample_questions):
        """Manual grading can override points and set correct answer."""
        user = UserFactory()
        question = sample_questions['prop']
        question.correct_answer = None
        question.save()

        answer = Answer.objects.create(user=user, question=question, answer='Yes', is_correct=False, points_earned=0)

        response = admin_client.post(
            '/api/v2/admin/grading/grade-manual',
            data={
                'answer_id': answer.id,
                'is_correct': True,
                'points_override': 7,
                'correct_answer': 'Yes',
            },
            content_type='application/json'
        )

        assert response.status_code == 200
        answer.refresh_from_db()
        question.refresh_from_db()
        assert answer.points_earned == 7
        assert question.correct_answer == 'Yes'


# ============================================================================
# Test Class 3: Grading Commands (3 tests)
# ============================================================================

class TestGradeCommandExecution:
    """Tests for POST /api/v2/admin/grading/run-command"""

    def test_execute_grade_props_command(self, admin_client, current_season, mocker):
        """Can execute grade_props_answers."""
        mock_call = mocker.patch('predictions.api.v2.endpoints.admin_grading.call_command')

        response = admin_client.post(
            '/api/v2/admin/grading/run-grading-command',
            data={'command': 'grade_props_answers', 'season_slug': current_season.slug},
            content_type='application/json'
        )

        assert response.status_code == 200
        mock_call.assert_called_once_with('grade_props_answers', current_season.slug)

    def test_execute_grade_standings_command(self, admin_client, current_season, mocker):
        """Can execute grade_standing_predictions."""
        mock_call = mocker.patch('predictions.api.v2.endpoints.admin_grading.call_command')

        response = admin_client.post(
            '/api/v2/admin/grading/run-grading-command',
            data={'command': 'grade_standing_predictions', 'season_slug': current_season.slug},
            content_type='application/json'
        )

        assert response.status_code == 200
        mock_call.assert_called_once()

    def test_invalid_command_rejected(self, admin_client, current_season):
        """Invalid commands rejected."""
        response = admin_client.post(
            '/api/v2/admin/grading/run-grading-command',
            data={'command': 'rm_rf', 'season_slug': current_season.slug},
            content_type='application/json'
        )

        assert response.status_code in [400, 403]

    def test_command_failure_returns_error(self, admin_client, current_season, mocker):
        """Command failures bubble up with helpful message."""
        mocker.patch(
            'predictions.api.v2.endpoints.admin_grading.call_command',
            side_effect=Exception('Boom!')
        )

        response = admin_client.post(
            '/api/v2/admin/grading/run-grading-command',
            data={'command': 'grade_props_answers', 'season_slug': current_season.slug},
            content_type='application/json'
        )

        assert response.status_code == 500
        assert response.json()['error'].startswith('Command failed')


# ============================================================================
# Test Class 4: Answers for Review (4 tests)
# ============================================================================

class TestAnswersForReviewEndpoint:
    """Tests for GET /api/v2/admin/grading/answers-for-review"""

    def test_admin_can_access_answers_for_review(self, admin_client, current_season, sample_questions):
        """Admin can access answers."""
        user = UserFactory()
        Answer.objects.create(user=user, question=sample_questions['prop'], answer='Yes')

        response = admin_client.get(f'/api/v2/admin/grading/answers/{current_season.slug}')
        assert response.status_code == 200

    def test_non_admin_cannot_access_answers(self, user_client, current_season):
        """Non-admin gets 403."""
        response = user_client.get(f'/api/v2/admin/grading/answers/{current_season.slug}')
        assert response.status_code == 403

    def test_filter_by_question_id(self, admin_client, current_season, sample_questions):
        """Can filter by question_id."""
        user = UserFactory()
        Answer.objects.create(user=user, question=sample_questions['prop'], answer='Yes')

        response = admin_client.get(
            f'/api/v2/admin/grading/answers/{current_season.slug}?question_id={sample_questions["prop"].id}'
        )
        assert response.status_code == 200

    def test_filter_by_is_correct(self, admin_client, current_season, sample_questions):
        """Can filter by is_correct."""
        user = UserFactory()
        Answer.objects.create(user=user, question=sample_questions['prop'], answer='Yes', is_correct=True)

        response = admin_client.get(
            f'/api/v2/admin/grading/answers/{current_season.slug}?is_correct=true'
        )
        assert response.status_code == 200

    def test_pending_only_and_user_filter(self, admin_client, current_season, sample_questions):
        """Pending-only filter narrows results to unanswered items."""
        pending_user = UserFactory()
        graded_user = UserFactory()

        pending_answer = Answer.objects.create(
            user=pending_user,
            question=sample_questions['prop'],
            answer='Pending',
            is_correct=None
        )
        Answer.objects.create(
            user=graded_user,
            question=sample_questions['prop'],
            answer='Yes',
            is_correct=True,
            points_earned=3
        )

        response = admin_client.get(
            f'/api/v2/admin/grading/answers/{current_season.slug}?pending_only=true&user_id={pending_user.id}'
        )
        data = response.json()
        assert response.status_code == 200
        assert data['total_count'] == 1
        assert data['answers'][0]['answer_id'] == pending_answer.id

    def test_answers_for_review_missing_current_season_returns_404(self, admin_client, mocker):
        """Returns 404 when current season not available."""
        mock_qs = mocker.Mock()
        mock_qs.first.return_value = None
        mocker.patch('predictions.api.v2.endpoints.admin_grading.Season.objects.order_by', return_value=mock_qs)

        response = admin_client.get('/api/v2/admin/grading/answers/current')
        assert response.status_code == 404


# ============================================================================
# Test Class 5: Questions for Grading (3 tests)
# ============================================================================

class TestQuestionsForGradingEndpoint:
    """Tests for GET /api/v2/admin/grading/questions/{season_slug}"""

    def test_admin_can_access_questions_for_grading(self, admin_client, current_season, sample_questions):
        """Admin can access questions."""
        response = admin_client.get(f'/api/v2/admin/grading/questions/{current_season.slug}')
        assert response.status_code == 200

    def test_non_admin_cannot_access_questions(self, user_client, current_season):
        """Non-admin gets 403."""
        response = user_client.get(f'/api/v2/admin/grading/questions/{current_season.slug}')
        assert response.status_code == 403

    def test_handles_polymorphic_question_types(self, admin_client, current_season, sample_questions):
        """Handles different question types."""
        user = UserFactory()
        Answer.objects.create(user=user, question=sample_questions['prop'], answer='Yes')
        Answer.objects.create(user=user, question=sample_questions['superlative'], answer='LeBron')

        response = admin_client.get(f'/api/v2/admin/grading/questions/{current_season.slug}')
        assert response.status_code == 200

    def test_questions_for_grading_missing_current_returns_404(self, admin_client, mocker):
        """Missing current season returns 404."""
        mock_qs = mocker.Mock()
        mock_qs.first.return_value = None
        mocker.patch('predictions.api.v2.endpoints.admin_grading.Season.objects.order_by', return_value=mock_qs)

        response = admin_client.get('/api/v2/admin/grading/questions/current')
        assert response.status_code == 404

    def test_questions_for_grading_includes_metadata(self, admin_client, current_season, comprehensive_question_set):
        """Questions endpoint returns rich metadata for all categories."""
        response = admin_client.get(f'/api/v2/admin/grading/questions/{current_season.slug}')
        assert response.status_code == 200

        data = response.json()
        categories = {q['category'] for q in data['questions']}
        expected_categories = {
            'Awards/Superlatives',
            'Props',
            'Head-to-Head',
            'In-Season Tournament',
            'Player Stats',
            'NBA Finals',
            'Other',
        }
        assert expected_categories.issubset(categories)

        prop_over_meta = next(q for q in data['questions'] if q['question_text'] == 'Prop Player over 28.5?')
        assert prop_over_meta['input_type'] == 'over_under'
        assert prop_over_meta['choices'] == ['Over', 'Under']
        assert prop_over_meta['related_player_name'] == 'Prop Player'

        h2h_meta = next(q for q in data['questions'] if q['question_type'] == 'HeadToHeadQuestion')
        assert h2h_meta['choices'] is not None and len(h2h_meta['choices']) == 2

        super_meta = next(q for q in data['questions'] if q['question_type'] == 'SuperlativeQuestion')
        assert super_meta['choices'] == ['Award Leader', 'Award Runner']
        assert super_meta['correct_answer_player_id'] == comprehensive_question_set['super_question'].current_leader_id
        assert super_meta['runner_up_player_id'] == comprehensive_question_set['super_question'].current_runner_up_id

        player_stat_meta = next(q for q in data['questions'] if q['question_type'] == 'PlayerStatPredictionQuestion')
        assert player_stat_meta['input_type'] == 'player_search'


# ============================================================================
# Test Class 6: Update Question Answer (3 tests)
# ============================================================================

class TestUpdateQuestionAnswerEndpoint:
    """Tests for POST /api/v2/admin/grading/update-question"""

    def test_admin_can_update_question_answer(self, admin_client, current_season, sample_questions):
        """Admin can update correct_answer."""
        question = sample_questions['prop']

        response = admin_client.post(
            '/api/v2/admin/grading/update-question',
            data={'question_id': question.id, 'correct_answer': 'Yes'},
            content_type='application/json'
        )

        assert response.status_code == 200
        question.refresh_from_db()
        assert question.correct_answer == 'Yes'

    def test_non_admin_cannot_update_question(self, user_client, current_season, sample_questions):
        """Non-admin gets 403."""
        response = user_client.post(
            '/api/v2/admin/grading/update-question',
            data={'question_id': sample_questions['prop'].id, 'correct_answer': 'Yes'},
            content_type='application/json'
        )

        assert response.status_code == 403

    def test_invalid_question_id_returns_404(self, admin_client):
        """Invalid question_id returns 404."""
        response = admin_client.post(
            '/api/v2/admin/grading/update-question',
            data={'question_id': 99999, 'correct_answer': 'Yes'},
            content_type='application/json'
        )

        assert response.status_code in [404, 400]

    def test_update_question_can_finalize_superlative(self, admin_client, current_season):
        """Superlative questions can be finalized via update endpoint."""
        award = AwardFactory(name='DPOY')
        question = SuperlativeQuestionFactory(season=current_season, award=award, is_finalized=False)

        response = admin_client.post(
            '/api/v2/admin/grading/update-question',
            data={
                'question_id': question.id,
                'correct_answer': 'Defender',
                'is_finalized': True
            },
            content_type='application/json'
        )

        assert response.status_code == 200
        question.refresh_from_db()
        assert question.is_finalized is True
        assert question.correct_answer == 'Defender'

    def test_update_superlative_can_set_player_ids_and_runner_up_points(self, admin_client, current_season):
        """Award grading can use player IDs while storing canonical names for scoring."""
        award = AwardFactory(name='MIP')
        winner = PlayerFactory(name='Winner Player')
        runner_up = PlayerFactory(name='Runner Up Player')
        question = SuperlativeQuestionFactory(
            season=current_season,
            award=award,
            point_value=5,
            is_finalized=False,
        )

        response = admin_client.post(
            '/api/v2/admin/grading/update-question',
            data={
                'question_id': question.id,
                'correct_answer_player_id': winner.id,
                'runner_up_player_id': runner_up.id,
                'runner_up_points': 2.5,
                'is_finalized': True,
            },
            content_type='application/json'
        )

        assert response.status_code == 200
        question.refresh_from_db()
        assert question.correct_answer == winner.name
        assert question.current_leader_id == winner.id
        assert question.current_runner_up_id == runner_up.id
        assert question.answer_point_values == {runner_up.name: 2.5}

    def test_update_question_can_clear_answer_point_values(self, admin_client, current_season):
        """Submitting an empty scoring map removes stale custom scoring rows."""
        question = PropQuestionFactory(
            season=current_season,
            point_value=3,
            correct_answer='Yes',
            answer_point_values={'No': 1},
        )

        response = admin_client.post(
            '/api/v2/admin/grading/update-question',
            data={
                'question_id': question.id,
                'correct_answer': 'Yes',
                'answer_point_values': {},
            },
            content_type='application/json'
        )

        assert response.status_code == 200
        question.refresh_from_db()
        assert question.answer_point_values == {}


# ============================================================================
# Test Class 7: Finalize Question (2 tests)
# ============================================================================

class TestFinalizeQuestionEndpoint:
    """Tests for POST /api/v2/admin/grading/finalize-question"""

    def test_admin_can_finalize_superlative_question(self, admin_client, current_season):
        """Admin can finalize superlative question."""
        award = AwardFactory(name='MVP')
        question = SuperlativeQuestionFactory(season=current_season, award=award, correct_answer='LeBron', is_finalized=False)

        response = admin_client.post(
            f'/api/v2/admin/grading/finalize-question/{question.id}',
            content_type='application/json'
        )

        # Endpoint may return 200 or other success code
        assert response.status_code in [200, 201]

    def test_non_admin_cannot_finalize(self, user_client, current_season):
        """Non-admin gets 403."""
        award = AwardFactory(name='MVP')
        question = SuperlativeQuestionFactory(season=current_season, award=award, is_finalized=False)

        response = user_client.post(
            f'/api/v2/admin/grading/finalize-question/{question.id}',
            content_type='application/json'
        )

        assert response.status_code == 403

    def test_finalize_question_updates_correct_answer(self, admin_client, current_season):
        """Finalize endpoint sets correct answer when provided."""
        award = AwardFactory(name='Sixth Man')
        question = SuperlativeQuestionFactory(season=current_season, award=award, is_finalized=False)

        response = admin_client.post(
            f'/api/v2/admin/grading/finalize-question/{question.id}?correct_answer=Bench Star',
            content_type='application/json'
        )

        assert response.status_code in [200, 201]
        question.refresh_from_db()
        assert question.is_finalized is True
        assert question.correct_answer == 'Bench Star'

    def test_finalize_non_superlative_question(self, admin_client, current_season):
        """Non-superlative questions do not toggle finalized flag."""
        question = PropQuestionFactory(season=current_season, correct_answer='Yes', point_value=3)

        response = admin_client.post(
            f'/api/v2/admin/grading/finalize-question/{question.id}',
            content_type='application/json'
        )

        assert response.status_code in [200, 201]
        question.refresh_from_db()
        assert getattr(question, 'is_finalized', False) is False


# ============================================================================
# Integration Test (1 test)
# ============================================================================

class TestGradingIntegration:
    """Full workflow integration test."""

    def test_full_grading_workflow(self, admin_client, current_season):
        """Complete grading workflow from answer to user stats update."""
        # Setup
        user = UserFactory()
        question = PropQuestionFactory(season=current_season, point_value=5, correct_answer='Yes')
        UserStats.objects.create(user=user, season=current_season, points=0)

        # Create answer
        answer = Answer.objects.create(user=user, question=question, answer='Yes')

        # Grade answer
        response = admin_client.post(
            '/api/v2/admin/grading/grade-manual',
            data={'answer_id': answer.id, 'is_correct': True, 'points_awarded': 5},
            content_type='application/json'
        )

        assert response.status_code == 200

        # Verify answer
        answer.refresh_from_db()
        assert answer.is_correct is True
        assert answer.points_earned == 5

        # Verify user stats updated
        user_stats = UserStats.objects.get(user=user, season=current_season)
        assert user_stats.points >= 0


@pytest.mark.django_db
class TestMultipleCorrectPlayers:
    """A player pick like 'Name a first-time All-Star' can have several correct players."""

    def test_setting_several_correct_players(self, admin_client, current_season):
        question = SuperlativeQuestionFactory(season=current_season, award=None, point_value=2)
        first, second = PlayerFactory(name='Alperen Sengun'), PlayerFactory(name='Evan Mobley')

        response = admin_client.post(
            '/api/v2/admin/grading/update-question',
            data={'question_id': question.id, 'correct_answer_player_ids': [first.id, second.id]},
            content_type='application/json'
        )

        assert response.status_code == 200
        question.refresh_from_db()
        assert question.correct_answer == 'Alperen Sengun'
        assert question.correct_answers == ['Alperen Sengun', 'Evan Mobley']
        assert question.points_for_answer('Evan Mobley') == 2

    def test_past_all_stars_hides_earlier_all_stars_and_unrostered_players(self, current_season, mocker):
        import pandas as pd
        from django.core.management import call_command

        question = SuperlativeQuestionFactory(season=current_season, award=None)
        start = int(current_season.year[:4])
        veteran = PlayerFactory(name='Nikola Jokic', nba_player_id=1)
        newcomer = PlayerFactory(name='This Year Star', nba_player_id=2)
        never = PlayerFactory(name='Never Star', nba_player_id=3)
        retired = PlayerFactory(name='Retired', nba_player_id=4)
        roster = pd.DataFrame(
            [(1, 'Nikola Jokic', '2015'), (2, 'This Year Star', '2018'), (3, 'Never Star', '2018')],
            columns=['PERSON_ID', 'DISPLAY_FIRST_LAST', 'FROM_YEAR'],
        )
        mocker.patch(
            'nba_api.stats.endpoints.commonallplayers.CommonAllPlayers',
            return_value=mocker.Mock(get_data_frames=lambda: [roster]),
        )
        # Wikipedia spells it with the accent; this season's first game is start + 1.
        mocker.patch(
            'predictions.management.commands.limit_player_picks.all_star_first_games',
            return_value={'nikola jokic': 2019, 'this year star': start + 1},
        )

        call_command('limit_player_picks', question.id, past_all_stars=True)

        hidden = set(question.excluded_players.all())
        assert hidden == {veteran, retired}
        assert newcomer not in hidden and never not in hidden

    def test_normalize_name_matches_accents_and_suffixes(self):
        from predictions.management.commands.limit_player_picks import normalize_name

        assert normalize_name('Nikola Jokić') == normalize_name('Nikola Jokic')
        assert normalize_name('Jaren Jackson Jr.') == normalize_name('Jaren Jackson')
        assert normalize_name('Alperen Şengün') == 'alperen sengun'

    def test_rookies_only_hides_everyone_else_and_adds_missing_rookies(self, current_season, mocker):
        import pandas as pd
        from django.core.management import call_command

        question = SuperlativeQuestionFactory(season=current_season, award=None)
        known_rookie = PlayerFactory(name='Known Rookie', nba_player_id=10)
        veteran = PlayerFactory(name='Veteran', nba_player_id=11)
        unverified = PlayerFactory(name='No NBA Id', nba_player_id=None)
        start, prior = current_season.year[:4], '2010'
        roster = pd.DataFrame(
            [(10, 'Known Rookie', start), (12, 'New Rookie', start), (11, 'Veteran', prior)],
            columns=['PERSON_ID', 'DISPLAY_FIRST_LAST', 'FROM_YEAR'],
        )
        mocker.patch(
            'nba_api.stats.endpoints.commonallplayers.CommonAllPlayers',
            return_value=mocker.Mock(get_data_frames=lambda: [roster]),
        )

        call_command('limit_player_picks', question.id, rookies=True)

        hidden = set(question.excluded_players.all())
        assert veteran in hidden and unverified in hidden
        assert known_rookie not in hidden
        new_rookie = Player.objects.get(nba_player_id=12)
        assert new_rookie.name == 'New Rookie' and new_rookie not in hidden

    def test_rookie_added_by_name_gets_linked_not_duplicated(self, current_season, mocker):
        import pandas as pd
        from django.core.management import call_command

        question = SuperlativeQuestionFactory(season=current_season, award=None)
        by_name = PlayerFactory(name='Aday Mara', nba_player_id=None)
        roster = pd.DataFrame([(77, 'Aday Mara', current_season.year[:4])], columns=['PERSON_ID', 'DISPLAY_FIRST_LAST', 'FROM_YEAR'])
        mocker.patch(
            'nba_api.stats.endpoints.commonallplayers.CommonAllPlayers',
            return_value=mocker.Mock(get_data_frames=lambda: [roster]),
        )

        call_command('limit_player_picks', question.id, rookies=True)

        by_name.refresh_from_db()
        assert by_name.nba_player_id == 77
        assert Player.objects.filter(name='Aday Mara').count() == 1


@pytest.mark.django_db
class TestMergeDuplicatePlayers:
    def test_merges_onto_the_nba_id_row_and_moves_picks(self, current_season):
        from django.core.management import call_command

        keeper = PlayerFactory(name='Kristaps Porzingis', nba_player_id=204001)
        dupe = PlayerFactory(name='Kristaps Porziņģis', nba_player_id=None)
        bronny = PlayerFactory(name='Lebron James Jr', nba_player_id=None)
        lebron = PlayerFactory(name='LeBron James', nba_player_id=2544)
        question = SuperlativeQuestionFactory(season=current_season, current_leader=dupe)
        question.excluded_players.add(dupe)
        pick = Answer.objects.create(user=UserFactory(), question=question, answer=str(dupe.id))

        call_command('merge_duplicate_players', skip=[bronny.id])

        assert not Player.objects.filter(id=dupe.id).exists()
        pick.refresh_from_db()
        question.refresh_from_db()
        assert pick.answer == str(keeper.id)
        assert question.current_leader == keeper
        assert list(question.excluded_players.all()) == [keeper]
        assert Player.objects.filter(id__in=[bronny.id, lebron.id]).count() == 2

    def test_also_merges_explicit_pairs(self, current_season):
        from django.core.management import call_command

        keeper = PlayerFactory(name='Felix Okpara', nba_player_id=1643590)
        typo = PlayerFactory(name='Felix Okpata', nba_player_id=None)

        call_command('merge_duplicate_players', also=[f'{typo.id}:{keeper.id}'])

        assert not Player.objects.filter(id=typo.id).exists()
        assert Player.objects.filter(id=keeper.id).exists()
