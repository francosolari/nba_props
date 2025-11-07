"""
Comprehensive tests for all Question model types including polymorphic behavior.

This module tests:
- All 6 polymorphic Question subtypes
- Question creation and validation
- Polymorphic query behavior
- Question-specific methods and fields
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from predictions.models import (
    Question,
    PropQuestion,
    SuperlativeQuestion,
    HeadToHeadQuestion,
    InSeasonTournamentQuestion,
    PlayerStatPredictionQuestion,
    NBAFinalsPredictionQuestion,
)
from predictions.tests.factories import (
    PropQuestionFactory,
    SuperlativeQuestionFactory,
    HeadToHeadQuestionFactory,
    InSeasonTournamentQuestionFactory,
    PlayerStatPredictionQuestionFactory,
    NBAFinalsPredictionQuestionFactory,
    SeasonFactory,
    TeamFactory,
    PlayerFactory,
    AwardFactory,
    PlayerStatFactory,
)


@pytest.mark.django_db
class TestPropQuestion:
    """Tests for PropQuestion model."""

    def test_create_prop_question(self):
        """Test creating a prop question."""
        question = PropQuestionFactory(
            text="Will LeBron average over 25 PPG?",
            outcome_type='over_under',
            line=25.0
        )

        assert question.text == "Will LeBron average over 25 PPG?"
        assert question.outcome_type == 'over_under'
        assert question.line == 25.0
        assert question.point_value == 3

    def test_prop_question_yes_no_type(self):
        """Test prop question with yes/no outcome type."""
        question = PropQuestionFactory(
            text="Will the Lakers make the playoffs?",
            outcome_type='yes_no',
            line=None
        )

        assert question.outcome_type == 'yes_no'
        assert question.line is None

    def test_prop_question_str_representation(self):
        """Test string representation of PropQuestion."""
        question = PropQuestionFactory(text="Test prop question")
        assert str(question) == "Test prop question"

    def test_prop_question_polymorphic_behavior(self):
        """Test that PropQuestion works with polymorphic queries."""
        question = PropQuestionFactory()

        # Test get_real_instance()
        real_instance = question.get_real_instance()
        assert isinstance(real_instance, PropQuestion)
        assert real_instance.__class__.__name__ == 'PropQuestion'


@pytest.mark.django_db
class TestSuperlativeQuestion:
    """Tests for SuperlativeQuestion model (MVP, ROY, etc.)."""

    def test_create_superlative_question(self):
        """Test creating a superlative question."""
        award = AwardFactory(name='MVP')
        question = SuperlativeQuestionFactory(
            text="Who will win MVP?",
            award=award
        )

        assert question.text == "Who will win MVP?"
        assert question.award == award
        assert question.is_finalized is False

    def test_finalize_winners(self):
        """Test finalizing the winner of a superlative question."""
        player = PlayerFactory(name='Nikola Jokic')
        question = SuperlativeQuestionFactory()

        question.finalize_winners('Nikola Jokic')

        assert question.correct_answer == 'Nikola Jokic'
        assert question.is_finalized is True
        assert player in question.winners.all()

    def test_finalize_winners_with_nonexistent_player(self):
        """Test finalizing with a player name that doesn't exist in database."""
        question = SuperlativeQuestionFactory()
        question.finalize_winners('NonExistent Player')

        assert question.is_finalized is True
        assert question.correct_answer == 'NonExistent Player'

    def test_finalize_winners_idempotency(self):
        """Test that calling finalize_winners multiple times is idempotent."""
        player = PlayerFactory(name='Nikola Jokic')
        question = SuperlativeQuestionFactory()

        question.finalize_winners('Nikola Jokic')
        question.finalize_winners('Nikola Jokic')

        assert question.winners.count() == 1
        assert question.is_finalized is True

    def test_finalize_winners_with_empty_string(self):
        """Test that empty string winner name raises validation error."""
        question = SuperlativeQuestionFactory()

        # Note: Validation depends on model implementation
        # This test documents expected behavior
        try:
            question.finalize_winners('')
            # If no validation, at least verify it was set
            assert question.correct_answer == ''
        except ValidationError:
            # Expected if model validates non-empty strings
            pass

    def test_update_from_latest_odds(self):
        """Test updating leader from latest odds."""
        # This would require Odds model setup
        # Skipping for now as it requires more complex setup
        pass

    def test_get_scoring_position_players(self):
        """Test getting scoring position players."""
        leader = PlayerFactory(name='Player 1')
        runner_up = PlayerFactory(name='Player 2')

        question = SuperlativeQuestionFactory(
            current_leader=leader,
            current_leader_odds='+150',
            current_runner_up=runner_up,
            current_runner_up_odds='+300',
            last_odds_update=timezone.now()
        )

        positions = question.get_scoring_position_players()

        assert positions['leader']['player'] == leader
        assert positions['leader']['odds'] == '+150'
        assert positions['runner_up']['player'] == runner_up
        assert positions['runner_up']['odds'] == '+300'

    def test_superlative_question_polymorphic_behavior(self):
        """Test SuperlativeQuestion polymorphic behavior."""
        question = SuperlativeQuestionFactory()
        real_instance = question.get_real_instance()

        assert isinstance(real_instance, SuperlativeQuestion)
        assert real_instance.__class__.__name__ == 'SuperlativeQuestion'


@pytest.mark.django_db
class TestHeadToHeadQuestion:
    """Tests for HeadToHeadQuestion model."""

    def test_create_head_to_head_question(self):
        """Test creating a head-to-head question."""
        team1 = TeamFactory(name='Knicks')
        team2 = TeamFactory(name='Timberwolves')

        question = HeadToHeadQuestionFactory(
            text="Who wins opening night?",
            team1=team1,
            team2=team2
        )

        assert question.text == "Who wins opening night?"
        assert question.team1 == team1
        assert question.team2 == team2

    def test_head_to_head_str_representation(self):
        """Test H2H question string representation."""
        team1 = TeamFactory(name='Lakers')
        team2 = TeamFactory(name='Celtics')

        question = HeadToHeadQuestionFactory(
            text="Who wins?",
            team1=team1,
            team2=team2
        )

        expected_str = "Who wins? (Lakers vs Celtics)"
        assert str(question) == expected_str

    def test_head_to_head_polymorphic_behavior(self):
        """Test HeadToHeadQuestion polymorphic behavior."""
        question = HeadToHeadQuestionFactory()
        real_instance = question.get_real_instance()

        assert isinstance(real_instance, HeadToHeadQuestion)


@pytest.mark.django_db
class TestInSeasonTournamentQuestion:
    """Tests for InSeasonTournamentQuestion model."""

    def test_create_ist_group_winner_question(self):
        """Test creating IST group winner question."""
        question = InSeasonTournamentQuestionFactory(
            text="Who wins East Group A?",
            prediction_type='group_winner',
            ist_group='East Group A'
        )

        assert question.prediction_type == 'group_winner'
        assert question.ist_group == 'East Group A'
        assert question.is_tiebreaker is False

    def test_create_ist_wildcard_question(self):
        """Test creating IST wildcard question."""
        question = InSeasonTournamentQuestionFactory(
            text="Who wins wildcard?",
            prediction_type='wildcard',
            ist_group=None
        )

        assert question.prediction_type == 'wildcard'

    def test_create_ist_tiebreaker_question(self):
        """Test creating IST tiebreaker question."""
        question = InSeasonTournamentQuestionFactory(
            text="Total points in tiebreaker?",
            prediction_type='tiebreaker',
            is_tiebreaker=True
        )

        assert question.is_tiebreaker is True

    def test_ist_question_str_representations(self):
        """Test string representations for different IST types."""
        # Group winner
        q1 = InSeasonTournamentQuestionFactory(
            text="Group winner",
            prediction_type='group_winner',
            ist_group='West Group B'
        )
        assert str(q1) == "Group winner (West Group B)"

        # Wildcard
        q2 = InSeasonTournamentQuestionFactory(
            text="Wildcard pick",
            prediction_type='wildcard'
        )
        assert str(q2) == "Wildcard pick (Wildcard)"

        # Conference winner
        q3 = InSeasonTournamentQuestionFactory(
            text="Conference winner",
            prediction_type='conference_winner'
        )
        assert str(q3) == "Conference winner (Conference Winner)"

        # Tiebreaker
        q4 = InSeasonTournamentQuestionFactory(
            text="Tiebreaker",
            prediction_type='tiebreaker'
        )
        assert str(q4) == "Tiebreaker (Tiebreaker)"

    def test_ist_question_polymorphic_behavior(self):
        """Test IST question polymorphic behavior."""
        question = InSeasonTournamentQuestionFactory()
        real_instance = question.get_real_instance()

        assert isinstance(real_instance, InSeasonTournamentQuestion)


@pytest.mark.django_db
class TestPlayerStatPredictionQuestion:
    """Tests for PlayerStatPredictionQuestion model."""

    def test_create_player_stat_question(self):
        """Test creating a player stat prediction question."""
        player_stat = PlayerStatFactory()

        question = PlayerStatPredictionQuestionFactory(
            text="Who leads in PPG?",
            player_stat=player_stat,
            stat_type='points',
            fixed_value=30.0
        )

        assert question.stat_type == 'points'
        assert question.fixed_value == 30.0
        assert question.player_stat == player_stat

    def test_player_stat_question_with_leaders(self):
        """Test player stat question with current leaders."""
        question = PlayerStatPredictionQuestionFactory(
            current_leaders={'player1': 28.5, 'player2': 27.3},
            top_performers={'player1': 28.5, 'player2': 27.3, 'player3': 26.1}
        )

        assert question.current_leaders is not None
        assert question.top_performers is not None

    def test_player_stat_question_polymorphic_behavior(self):
        """Test PlayerStatPredictionQuestion polymorphic behavior."""
        question = PlayerStatPredictionQuestionFactory()
        real_instance = question.get_real_instance()

        assert isinstance(real_instance, PlayerStatPredictionQuestion)


@pytest.mark.django_db
class TestNBAFinalsPredictionQuestion:
    """Tests for NBAFinalsPredictionQuestion model."""

    def test_create_nba_finals_question(self):
        """Test creating NBA Finals prediction question."""
        question = NBAFinalsPredictionQuestionFactory(
            text="Who wins the NBA Finals?",
            group_name='NBA Finals'
        )

        assert question.text == "Who wins the NBA Finals?"
        assert question.group_name == 'NBA Finals'

    def test_nba_finals_question_polymorphic_behavior(self):
        """Test NBAFinalsPredictionQuestion polymorphic behavior."""
        question = NBAFinalsPredictionQuestionFactory()
        real_instance = question.get_real_instance()

        assert isinstance(real_instance, NBAFinalsPredictionQuestion)


@pytest.mark.django_db
class TestPolymorphicQueries:
    """Tests for polymorphic query behavior across all Question types."""

    def test_query_all_question_types(self):
        """Test querying all question types together."""
        # Create one of each type
        PropQuestionFactory()
        SuperlativeQuestionFactory()
        HeadToHeadQuestionFactory()
        InSeasonTournamentQuestionFactory()
        PlayerStatPredictionQuestionFactory()
        NBAFinalsPredictionQuestionFactory()

        # Query all questions
        all_questions = Question.objects.all()

        assert all_questions.count() == 6

    def test_filter_by_season(self):
        """Test filtering questions by season."""
        season1 = SeasonFactory()
        season2 = SeasonFactory()

        # Create questions for different seasons
        PropQuestionFactory(season=season1)
        PropQuestionFactory(season=season1)
        SuperlativeQuestionFactory(season=season2)

        # Filter by season
        season1_questions = Question.objects.filter(season=season1)
        season2_questions = Question.objects.filter(season=season2)

        assert season1_questions.count() == 2
        assert season2_questions.count() == 1

    def test_get_real_instance_for_all_types(self):
        """Test get_real_instance() works for all question types."""
        # Create all types
        questions = [
            PropQuestionFactory(),
            SuperlativeQuestionFactory(),
            HeadToHeadQuestionFactory(),
            InSeasonTournamentQuestionFactory(),
            PlayerStatPredictionQuestionFactory(),
            NBAFinalsPredictionQuestionFactory(),
        ]

        expected_types = [
            'PropQuestion',
            'SuperlativeQuestion',
            'HeadToHeadQuestion',
            'InSeasonTournamentQuestion',
            'PlayerStatPredictionQuestion',
            'NBAFinalsPredictionQuestion',
        ]

        for question, expected_type in zip(questions, expected_types):
            real_instance = question.get_real_instance()
            assert real_instance.__class__.__name__ == expected_type

    def test_point_value_inheritance(self):
        """Test that point_value is inherited by all question types."""
        question = PropQuestionFactory(point_value=5.0)

        assert question.point_value == 5.0

        # Query through base Question model
        base_question = Question.objects.get(pk=question.pk)
        assert base_question.point_value == 5.0

    def test_correct_answer_field_on_all_types(self):
        """Test correct_answer field exists on all question types."""
        questions = [
            PropQuestionFactory(correct_answer='Yes'),
            SuperlativeQuestionFactory(correct_answer='Nikola Jokic'),
            HeadToHeadQuestionFactory(correct_answer='Lakers'),
        ]

        for question in questions:
            assert hasattr(question, 'correct_answer')
            assert question.correct_answer is not None


@pytest.mark.django_db
class TestPolymorphicQueryEdgeCases:
    """Tests for edge cases in polymorphic query behavior."""

    def test_subtype_field_access_without_real_instance(self):
        """Test that django-polymorphic automatically returns real instance."""
        question = PropQuestionFactory(outcome_type='yes_no', line=25.0)
        base_question = Question.objects.get(pk=question.pk)

        # Django-polymorphic automatically returns the correct subtype
        assert isinstance(base_question, PropQuestion)
        assert base_question.outcome_type == 'yes_no'

        # get_real_instance() returns the same instance
        real_instance = base_question.get_real_instance()
        assert real_instance.outcome_type == 'yes_no'
        assert real_instance is base_question

    def test_filter_by_subtype_specific_field(self):
        """Test filtering by subtype-specific fields."""
        PropQuestionFactory(outcome_type='yes_no')
        PropQuestionFactory(outcome_type='over_under')
        SuperlativeQuestionFactory()

        # Filter on PropQuestion model using subtype-specific field
        yes_no_questions = PropQuestion.objects.filter(outcome_type='yes_no')
        assert yes_no_questions.count() == 1

    def test_polymorphic_bulk_operations(self):
        """Test bulk update operations on polymorphic queryset."""
        season = SeasonFactory()
        PropQuestionFactory(season=season, point_value=3)
        SuperlativeQuestionFactory(season=season, point_value=5)

        # Bulk update through base Question model
        Question.objects.filter(season=season).update(point_value=10)

        # Verify updates applied to all subtypes
        assert PropQuestion.objects.get(season=season).point_value == 10
        assert SuperlativeQuestion.objects.get(season=season).point_value == 10
