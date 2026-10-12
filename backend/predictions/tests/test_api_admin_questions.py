"""
Comprehensive test suite for admin question management API endpoints (v2).

Targets: nba_predictions-39 - "API Testing: Admin question management endpoints"
Scope:
- Question CRUD operations (Create, Read, Update, Delete)
- Polymorphic question type handling (Superlative, Prop, PlayerStat, HeadToHead, IST, Finals)
- Permission checks (@admin_required decorator)
- Bulk operations and reordering
- Error handling and validation
- Reference data endpoints

The goal is to provide ~25 high-quality tests ensuring admins can safely manage
all question types through the API with proper authorization and validation.
"""

import json
from decimal import Decimal

import pytest
from django.test import Client

from predictions.models import (
    Question,
    SuperlativeQuestion,
    PropQuestion,
    PlayerStatPredictionQuestion,
    HeadToHeadQuestion,
    InSeasonTournamentQuestion,
    NBAFinalsPredictionQuestion,
    Answer,
)
from predictions.tests.factories import (
    UserFactory,
    AdminUserFactory,
    SeasonFactory,
    AwardFactory,
    PlayerFactory,
    TeamFactory,
    PlayerStatFactory,
    SuperlativeQuestionFactory,
    PropQuestionFactory,
    PlayerStatPredictionQuestionFactory,
    HeadToHeadQuestionFactory,
    InSeasonTournamentQuestionFactory,
    NBAFinalsPredictionQuestionFactory,
    AnswerFactory,
)


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def api_client():
    """Django test client fixture."""
    return Client()


@pytest.fixture
def admin_client(api_client):
    """Client with admin user authenticated."""
    admin = AdminUserFactory()
    api_client.force_login(admin)
    return api_client, admin


@pytest.fixture
def regular_user_client(api_client):
    """Client with regular (non-admin) user authenticated."""
    user = UserFactory()
    api_client.force_login(user)
    return api_client, user


# ============================================================================
# List Questions Tests
# ============================================================================

class TestAdminListQuestions:
    """Tests for GET /api/v2/admin/seasons/{season_slug}/questions."""

    def test_admin_list_questions_success(self, admin_client):
        """Test admin can list all questions for a season."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')

        # Create various question types
        q1 = SuperlativeQuestionFactory(season=season, text="Who wins MVP?")
        q2 = PropQuestionFactory(season=season, text="Will Lakers make playoffs?")
        q3 = PlayerStatPredictionQuestionFactory(season=season, text="LeBron PPG?")

        response = client.get(f'/api/v2/admin/seasons/24-25/questions')

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        question_texts = {q['text'] for q in data}
        assert "Who wins MVP?" in question_texts
        assert "Will Lakers make playoffs?" in question_texts
        counts = {q['id']: q['answer_count'] for q in data}
        assert counts[q2.id] == 0

    def test_admin_list_questions_counts_picks(self, admin_client):
        """Each question reports how many picks it has, for the type-change warning."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        prop = PropQuestionFactory(season=season, outcome_type='yes_no')
        AnswerFactory.create_batch(3, question=prop, answer='yes')

        response = client.get('/api/v2/admin/seasons/24-25/questions')

        assert response.status_code == 200
        [question] = response.json()
        assert question['answer_count'] == 3

    def test_admin_list_questions_permission_required(self, regular_user_client):
        """Test non-admin cannot list questions."""
        client, user = regular_user_client
        season = SeasonFactory(slug='24-25')

        response = client.get(f'/api/v2/admin/seasons/24-25/questions')

        assert response.status_code == 403

    def test_admin_list_questions_invalid_season(self, admin_client):
        """Test listing questions for non-existent season."""
        client, admin = admin_client

        response = client.get('/api/v2/admin/seasons/invalid-season/questions')

        assert response.status_code == 404

    def test_admin_list_questions_empty_season(self, admin_client):
        """Test listing questions for season with no questions."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')

        response = client.get(f'/api/v2/admin/seasons/24-25/questions')

        assert response.status_code == 200
        assert response.json() == []


# ============================================================================
# Create Superlative Question Tests
# ============================================================================

class TestCreateSuperlativeQuestion:
    """Tests for POST /api/v2/admin/questions/superlative."""

    def test_create_superlative_question_success(self, admin_client):
        """Test admin can create superlative question."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")

        payload = {
            "season_slug": "24-25",
            "text": "Who will win MVP?",
            "point_value": 1.0,
            "award_id": award.id
        }

        response = client.post(
            '/api/v2/admin/questions/superlative',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        assert 'question' in data
        assert data['question']['text'] == "Who will win MVP?"

        # Verify question was created in database
        question = SuperlativeQuestion.objects.get(text="Who will win MVP?")
        assert question.award == award
        assert question.point_value == 1.0

    def test_create_superlative_question_permission_required(self, regular_user_client):
        """Test non-admin cannot create superlative question."""
        client, user = regular_user_client
        season = SeasonFactory(slug='24-25')
        award = AwardFactory()

        payload = {
            "season_slug": "24-25",
            "text": "Who will win MVP?",
            "point_value": 1.0,
            "award_id": award.id
        }

        response = client.post(
            '/api/v2/admin/questions/superlative',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 403

    def test_create_superlative_question_invalid_award(self, admin_client):
        """Test creating superlative question with non-existent award."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')

        payload = {
            "season_slug": "24-25",
            "text": "Who will win MVP?",
            "point_value": 1.0,
            "award_id": 99999
        }

        response = client.post(
            '/api/v2/admin/questions/superlative',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 400


# ============================================================================
# Create Prop Question Tests
# ============================================================================

class TestCreatePropQuestion:
    """Tests for POST /api/v2/admin/questions/prop."""

    def test_create_prop_question_success(self, admin_client):
        """Test admin can create prop question."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        player = PlayerFactory(name="LeBron James")

        payload = {
            "season_slug": "24-25",
            "text": "Will LeBron score over 25.5 PPG?",
            "point_value": 0.5,
            "outcome_type": "over_under",
            "related_player_id": player.id,
            "line": 25.5
        }

        response = client.post(
            '/api/v2/admin/questions/prop',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'

        # Verify question was created
        question = PropQuestion.objects.get(text="Will LeBron score over 25.5 PPG?")
        assert question.outcome_type == "over_under"
        assert question.related_player == player
        assert question.line == Decimal('25.5')

    def test_create_prop_question_without_player(self, admin_client):
        """Test creating prop question without related player."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')

        payload = {
            "season_slug": "24-25",
            "text": "Will any team go undefeated in the regular season?",
            "point_value": 0.5,
            "outcome_type": "yes_no",
            "related_player_id": None,
            "line": None
        }

        response = client.post(
            '/api/v2/admin/questions/prop',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question = PropQuestion.objects.get(
            text="Will any team go undefeated in the regular season?"
        )
        assert question.related_player is None

    def test_create_player_stat_prop_with_split_points(self, admin_client):
        """A player stat prop saves as an over/under with its stat and per-answer points."""
        client, admin = admin_client
        SeasonFactory(slug='24-25')
        player = PlayerFactory()

        payload = {
            "season_slug": "24-25",
            "text": "Luka technical fouls (season)",
            "point_value": 2,
            "outcome_type": "over_under",
            "related_player_id": player.id,
            "line": 15.5,
            "stat": "technicals",
            "points_if_correct": {"Over": 1, "Under": 2},
        }

        response = client.post(
            '/api/v2/admin/questions/prop',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question = PropQuestion.objects.get(text="Luka technical fouls (season)")
        assert question.stat == "technicals"
        assert question.points_if_correct == {"Over": 1, "Under": 2}
        body = response.json()['question']
        assert body['stat'] == "technicals"
        assert body['points_if_correct'] == {"Over": 1.0, "Under": 2.0}


# ============================================================================
# Create Player Stat Question Tests
# ============================================================================

class TestCreatePlayerStatQuestion:
    """Tests for POST /api/v2/admin/questions/player-stat."""

    def test_create_player_stat_question_success(self, admin_client):
        """Test admin can create player stat question."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        player = PlayerFactory(name="Luka Doncic")
        player_stat = PlayerStatFactory(player=player, season=season)

        payload = {
            "season_slug": "24-25",
            "text": "How many points will Luka average?",
            "point_value": 1.0,
            "player_stat_id": player_stat.id,
            "stat_type": "ppg",
            "fixed_value": None
        }

        response = client.post(
            '/api/v2/admin/questions/player-stat',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question = PlayerStatPredictionQuestion.objects.get(
            text="How many points will Luka average?"
        )
        assert question.player_stat == player_stat
        assert question.stat_type == "ppg"


# ============================================================================
# Create Head-to-Head Question Tests
# ============================================================================

class TestCreateHeadToHeadQuestion:
    """Tests for POST /api/v2/admin/questions/head-to-head."""

    def test_create_head_to_head_question_success(self, admin_client):
        """Test admin can create head-to-head question."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        team1 = TeamFactory(name="Lakers", conference="West")
        team2 = TeamFactory(name="Celtics", conference="East")

        payload = {
            "season_slug": "24-25",
            "text": "Who will have more wins: Lakers or Celtics?",
            "point_value": 0.5,
            "team1_id": team1.id,
            "team2_id": team2.id
        }

        response = client.post(
            '/api/v2/admin/questions/head-to-head',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question = HeadToHeadQuestion.objects.get(
            text="Who will have more wins: Lakers or Celtics?"
        )
        assert question.team1 == team1
        assert question.team2 == team2


# ============================================================================
# Create IST Question Tests
# ============================================================================

class TestCreateISTQuestion:
    """Tests for POST /api/v2/admin/questions/ist."""

    def test_create_ist_question_success(self, admin_client):
        """Test admin can create IST question."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')

        payload = {
            "season_slug": "24-25",
            "text": "Who will win the In-Season Tournament?",
            "point_value": 2.0,
            "prediction_type": "group_winner",
            "ist_group": "West Group A",
            "is_tiebreaker": False
        }

        response = client.post(
            '/api/v2/admin/questions/ist',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question = InSeasonTournamentQuestion.objects.get(
            text="Who will win the In-Season Tournament?"
        )
        assert question.prediction_type == "group_winner"
        assert question.ist_group == "West Group A"
        assert question.is_tiebreaker is False


# ============================================================================
# Create NBA Finals Question Tests
# ============================================================================

class TestCreateNBAFinalsQuestion:
    """Tests for POST /api/v2/admin/questions/nba-finals."""

    def test_create_nba_finals_question_success(self, admin_client):
        """Test admin can create NBA Finals question."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')

        payload = {
            "season_slug": "24-25",
            "text": "Who will win the NBA Finals?",
            "point_value": 3.0,
            "group_name": "Finals Predictions"
        }

        response = client.post(
            '/api/v2/admin/questions/nba-finals',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question = NBAFinalsPredictionQuestion.objects.get(
            text="Who will win the NBA Finals?"
        )
        assert question.group_name == "Finals Predictions"
        assert question.point_value == 3.0


# ============================================================================
# Update Question Tests
# ============================================================================

class TestUpdateQuestion:
    """Tests for PUT /api/v2/admin/questions/{question_id}."""

    def test_update_question_basic_fields(self, admin_client):
        """Test admin can update basic question fields."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        question = SuperlativeQuestionFactory(
            season=season,
            text="Original text",
            point_value=0.5
        )

        payload = {
            "text": "Updated text",
            "point_value": 1.0
        }

        response = client.put(
            f'/api/v2/admin/questions/{question.id}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question.refresh_from_db()
        assert question.text == "Updated text"
        assert question.point_value == 1.0

    def test_update_superlative_question_award(self, admin_client):
        """Test admin can update superlative question award."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        old_award = AwardFactory(name="MVP")
        new_award = AwardFactory(name="DPOY")
        question = SuperlativeQuestionFactory(season=season, award=old_award)

        payload = {"award_id": new_award.id}

        response = client.put(
            f'/api/v2/admin/questions/{question.id}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question.refresh_from_db()
        real_question = question.get_real_instance()
        assert real_question.award == new_award

    def test_update_prop_question_line(self, admin_client):
        """Test admin can update prop question line."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        question = PropQuestionFactory(season=season, line=Decimal('25.5'))

        payload = {"line": 27.0}

        response = client.put(
            f'/api/v2/admin/questions/{question.id}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 200
        question.refresh_from_db()
        real_question = question.get_real_instance()
        assert real_question.line == Decimal('27.0')

    def test_update_head_to_head_conference_matchup(self, admin_client):
        """Test admin can flag a head-to-head as a conference matchup."""
        client, admin = admin_client
        question = HeadToHeadQuestionFactory(season=SeasonFactory(slug='24-25'))

        response = client.put(
            f'/api/v2/admin/questions/{question.id}',
            data=json.dumps({"conference_matchup": True}),
            content_type='application/json'
        )

        assert response.status_code == 200
        assert response.json()['question']['conference_matchup'] is True
        question.refresh_from_db()
        assert question.conference_matchup is True

    def test_update_question_permission_required(self, regular_user_client):
        """Test non-admin cannot update question."""
        client, user = regular_user_client
        season = SeasonFactory(slug='24-25')
        question = SuperlativeQuestionFactory(season=season)

        payload = {"text": "Hacked text"}

        response = client.put(
            f'/api/v2/admin/questions/{question.id}',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert response.status_code == 403

    def test_update_nonexistent_question(self, admin_client):
        """Test updating non-existent question."""
        client, admin = admin_client

        payload = {"text": "New text"}

        response = client.put(
            '/api/v2/admin/questions/99999',
            data=json.dumps(payload),
            content_type='application/json'
        )

        # Endpoint returns 400 with error message instead of 404
        assert response.status_code == 400


# ============================================================================
# Delete Question Tests
# ============================================================================

class TestDeleteQuestion:
    """Tests for DELETE /api/v2/admin/questions/{question_id}."""

    def test_delete_question_success(self, admin_client):
        """Test admin can delete question."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        question = SuperlativeQuestionFactory(season=season, text="Delete me")

        response = client.delete(f'/api/v2/admin/questions/{question.id}')

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        assert data['deleted_id'] == question.id

        # Verify question was deleted
        assert not Question.objects.filter(id=question.id).exists()

    def test_delete_question_with_answers(self, admin_client):
        """Test deleting question also deletes associated answers."""
        client, admin = admin_client
        season = SeasonFactory(slug='24-25')
        question = SuperlativeQuestionFactory(season=season)
        user = UserFactory()
        answer = Answer.objects.create(
            user=user,
            question=question,
            answer="Lakers"
        )

        response = client.delete(f'/api/v2/admin/questions/{question.id}')

        assert response.status_code == 200
        # Verify both question and answer were deleted
        assert not Question.objects.filter(id=question.id).exists()
        assert not Answer.objects.filter(id=answer.id).exists()

    def test_delete_question_permission_required(self, regular_user_client):
        """Test non-admin cannot delete question."""
        client, user = regular_user_client
        season = SeasonFactory(slug='24-25')
        question = SuperlativeQuestionFactory(season=season)

        response = client.delete(f'/api/v2/admin/questions/{question.id}')

        assert response.status_code == 403
        # Verify question still exists
        assert Question.objects.filter(id=question.id).exists()

    def test_delete_nonexistent_question(self, admin_client):
        """Test deleting non-existent question."""
        client, admin = admin_client

        response = client.delete('/api/v2/admin/questions/99999')

        # Endpoint returns 400 with error message instead of 404
        assert response.status_code == 400


# ============================================================================
# Reference Data Tests
# ============================================================================

class TestGetAwards:
    """Tests for GET /api/v2/admin/reference-data/awards."""

    def test_get_awards_success(self, admin_client):
        """Test admin can retrieve available awards."""
        client, admin = admin_client
        award1 = AwardFactory(name="MVP")
        award2 = AwardFactory(name="DPOY")
        award3 = AwardFactory(name="Rookie of the Year")

        response = client.get('/api/v2/admin/reference-data/awards')

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        award_names = {award['name'] for award in data}
        assert "MVP" in award_names
        assert "DPOY" in award_names
        assert "Rookie of the Year" in award_names

    def test_get_awards_permission_required(self, regular_user_client):
        """Test non-admin cannot retrieve awards."""
        client, user = regular_user_client

        response = client.get('/api/v2/admin/reference-data/awards')

        assert response.status_code == 403

    def test_get_awards_empty_list(self, admin_client):
        """Test retrieving awards when none exist."""
        client, admin = admin_client
        # Clear all awards
        from predictions.models import Award
        Award.objects.all().delete()

        response = client.get('/api/v2/admin/reference-data/awards')

        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.django_db
class TestPlayerHeadToHead:
    """Head-to-heads between two players, e.g. "Who makes more threes?"."""

    def test_create_and_score_a_player_matchup(self, admin_client):
        from predictions.api.common.services.answer_lookup_service import AnswerLookupService

        client, admin = admin_client
        SeasonFactory(slug='26-27')
        ant = PlayerFactory(name='Anthony Edwards', nba_player_id=1630162)
        melo = PlayerFactory(name='LaMelo Ball', nba_player_id=1630163)

        response = client.post(
            '/api/v2/admin/questions/head-to-head',
            data=json.dumps({
                "season_slug": "26-27",
                "text": "Who will make more total 3-pointers?",
                "point_value": 1,
                "player1_id": ant.id,
                "player2_id": melo.id,
            }),
            content_type='application/json',
        )

        assert response.status_code == 200
        body = response.json()['question']
        assert body['matchup'] == 'players'
        assert (body['team1_name'], body['team2_name']) == ('Anthony Edwards', 'LaMelo Ball')
        assert body['team1_logo'].endswith('/1630162.png')

        question = HeadToHeadQuestion.objects.get(text="Who will make more total 3-pointers?")
        assert question.team1 is None and question.player2 == melo
        # A pick stores the player's id; grading resolves it to the name.
        assert AnswerLookupService.resolve_answer(str(ant.id), question) == 'Anthony Edwards'
        question.correct_answer = 'Anthony Edwards'
        assert question.points_for_answer('Anthony Edwards') == 1
        assert question.points_for_answer('LaMelo Ball') == 0

    def test_rejects_a_half_set_matchup(self, admin_client):
        client, admin = admin_client
        SeasonFactory(slug='26-27')
        ant = PlayerFactory(name='Anthony Edwards')

        response = client.post(
            '/api/v2/admin/questions/head-to-head',
            data=json.dumps({"season_slug": "26-27", "text": "Half a matchup", "player1_id": ant.id}),
            content_type='application/json',
        )

        assert response.status_code == 400
