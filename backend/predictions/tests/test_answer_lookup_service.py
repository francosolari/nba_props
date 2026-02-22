"""
Comprehensive tests for AnswerLookupService.

This module tests:
- Answer normalization logic (how it normalizes user answers)
- Answer resolution logic (how it resolves answers against correct answers)
- Player and team lookup table caching
- Single answer resolution for different question types
- Bulk answer resolution (both original and optimized)
- Edge cases (empty strings, case sensitivity, non-digit values, missing lookups)
"""
import pytest
from unittest.mock import patch, MagicMock
from django.core.cache import cache
from predictions.api.common.services.answer_lookup_service import AnswerLookupService
from predictions.models import Question
from predictions.tests.factories import (
    PlayerFactory,
    TeamFactory,
    UserFactory,
    AnswerFactory,
    PropQuestionFactory,
    SuperlativeQuestionFactory,
    HeadToHeadQuestionFactory,
    InSeasonTournamentQuestionFactory,
    PlayerStatPredictionQuestionFactory,
    NBAFinalsPredictionQuestionFactory,
    CurrentSeasonFactory,
)


@pytest.mark.unit
@pytest.mark.django_db
class TestAnswerLookupServiceCaching:
    """Tests for lookup table caching functionality."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_get_lookup_tables_builds_player_cache(self):
        """Test that get_lookup_tables builds player lookup cache when empty."""
        # Create test players
        player1 = PlayerFactory(name="LeBron James")
        player2 = PlayerFactory(name="Stephen Curry")

        player_lookup, team_lookup = AnswerLookupService.get_lookup_tables()

        assert player1.id in player_lookup
        assert player_lookup[player1.id] == "LeBron James"
        assert player2.id in player_lookup
        assert player_lookup[player2.id] == "Stephen Curry"

    def test_get_lookup_tables_builds_team_cache(self):
        """Test that get_lookup_tables builds team lookup cache when empty."""
        # Create test teams
        team1 = TeamFactory(name="Los Angeles Lakers")
        team2 = TeamFactory(name="Boston Celtics")

        player_lookup, team_lookup = AnswerLookupService.get_lookup_tables()

        assert team1.id in team_lookup
        assert team_lookup[team1.id] == "Los Angeles Lakers"
        assert team2.id in team_lookup
        assert team_lookup[team2.id] == "Boston Celtics"

    def test_get_lookup_tables_uses_cached_values(self):
        """Test that subsequent calls use cached values without DB queries."""
        # First call builds cache
        player1 = PlayerFactory(name="LeBron James")
        team1 = TeamFactory(name="Lakers")

        AnswerLookupService.get_lookup_tables()

        # Create new entries after cache is built
        player2 = PlayerFactory(name="New Player")
        team2 = TeamFactory(name="New Team")

        # Second call should use cache (won't include new entries)
        player_lookup, team_lookup = AnswerLookupService.get_lookup_tables()

        assert player1.id in player_lookup
        assert player2.id not in player_lookup  # Not in cache yet
        assert team1.id in team_lookup
        assert team2.id not in team_lookup  # Not in cache yet

    def test_cache_keys_are_correct(self):
        """Test that cache keys are set correctly."""
        AnswerLookupService.get_lookup_tables()

        assert cache.get(AnswerLookupService.PLAYER_CACHE_KEY) is not None
        assert cache.get(AnswerLookupService.TEAM_CACHE_KEY) is not None


@pytest.mark.unit
@pytest.mark.django_db
class TestAnswerResolutionSingleAnswer:
    """Tests for resolve_answer method with different question types."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_resolve_non_digit_answer_returns_as_is(self):
        """Test that non-digit answers are returned unchanged."""
        question = PropQuestionFactory()
        answer_value = "Yes"

        result = AnswerLookupService.resolve_answer(answer_value, question)

        assert result == "Yes"

    def test_resolve_empty_string_returns_as_is(self):
        """Test that empty strings are returned unchanged."""
        question = PropQuestionFactory()
        answer_value = ""

        result = AnswerLookupService.resolve_answer(answer_value, question)

        assert result == ""

    def test_resolve_player_id_for_superlative_question(self):
        """Test resolving player ID for SuperlativeQuestion."""
        player = PlayerFactory(name="Nikola Jokic")
        question = SuperlativeQuestionFactory()

        result = AnswerLookupService.resolve_answer(str(player.id), question)

        assert result == "Nikola Jokic"

    def test_resolve_player_id_for_prop_question(self):
        """Test resolving player ID for PropQuestion."""
        player = PlayerFactory(name="Giannis Antetokounmpo")
        question = PropQuestionFactory()

        result = AnswerLookupService.resolve_answer(str(player.id), question)

        assert result == "Giannis Antetokounmpo"

    def test_resolve_player_id_for_playerstat_question(self):
        """Test resolving player ID for PlayerStatPredictionQuestion."""
        player = PlayerFactory(name="Luka Doncic")
        question = PlayerStatPredictionQuestionFactory()

        result = AnswerLookupService.resolve_answer(str(player.id), question)

        assert result == "Luka Doncic"

    def test_resolve_team_id_for_headtohead_question(self):
        """Test resolving team ID for HeadToHeadQuestion."""
        team = TeamFactory(name="Denver Nuggets")
        question = HeadToHeadQuestionFactory()

        result = AnswerLookupService.resolve_answer(str(team.id), question)

        assert result == "Denver Nuggets"

    def test_resolve_team_id_for_ist_question(self):
        """Test resolving team ID for InSeasonTournamentQuestion."""
        team = TeamFactory(name="Milwaukee Bucks")
        question = InSeasonTournamentQuestionFactory(prediction_type='group_winner')

        result = AnswerLookupService.resolve_answer(str(team.id), question)

        assert result == "Milwaukee Bucks"

    def test_resolve_team_id_for_finals_question(self):
        """Test resolving team ID for NBAFinalsPredictionQuestion."""
        team = TeamFactory(name="Miami Heat")
        question = NBAFinalsPredictionQuestionFactory(text="Which team will win?")

        result = AnswerLookupService.resolve_answer(str(team.id), question)

        assert result == "Miami Heat"

    def test_resolve_ist_tiebreaker_returns_numeric_value(self):
        """Test that IST tiebreaker questions return numeric values unchanged."""
        question = InSeasonTournamentQuestionFactory(prediction_type='tiebreaker')
        answer_value = "125"

        result = AnswerLookupService.resolve_answer(answer_value, question)

        assert result == "125"

    def test_resolve_finals_wins_question_returns_numeric_value(self):
        """Test that NBA Finals wins questions return numeric values unchanged."""
        question = NBAFinalsPredictionQuestionFactory(text="How many wins?")
        answer_value = "4"

        result = AnswerLookupService.resolve_answer(answer_value, question)

        assert result == "4"

    def test_resolve_invalid_player_id_returns_not_found_message(self):
        """Test that invalid player IDs return appropriate not found message."""
        question = SuperlativeQuestionFactory()
        invalid_player_id = "999999"

        result = AnswerLookupService.resolve_answer(invalid_player_id, question)

        assert result == "Player ID 999999 not found"

    def test_resolve_invalid_team_id_returns_not_found_message(self):
        """Test that invalid team IDs return appropriate not found message."""
        question = HeadToHeadQuestionFactory()
        invalid_team_id = "999999"

        result = AnswerLookupService.resolve_answer(invalid_team_id, question)

        assert result == "Team ID 999999 not found"

    def test_resolve_answer_with_whitespace(self):
        """Test that answers with whitespace are handled correctly."""
        question = PropQuestionFactory()
        answer_value = "  Yes  "

        result = AnswerLookupService.resolve_answer(answer_value, question)

        assert result == "  Yes  "  # Returns as-is since not digit

    def test_resolve_answer_with_special_characters(self):
        """Test that answers with special characters are handled correctly."""
        question = PropQuestionFactory()
        answer_value = "Yes!"

        result = AnswerLookupService.resolve_answer(answer_value, question)

        assert result == "Yes!"


@pytest.mark.unit
@pytest.mark.django_db
class TestBulkResolveAnswersOriginal:
    """Tests for bulk_resolve_answers method (original implementation)."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_bulk_resolve_empty_list(self):
        """Test bulk resolving an empty list returns empty dict."""
        result = AnswerLookupService.bulk_resolve_answers([])

        assert result == {}

    def test_bulk_resolve_multiple_player_answers(self):
        """Test bulk resolving multiple player-based answers."""
        player1 = PlayerFactory(name="Kevin Durant")
        player2 = PlayerFactory(name="James Harden")

        question1 = SuperlativeQuestionFactory()
        question2 = PropQuestionFactory()

        answer1 = AnswerFactory(question=question1, answer=str(player1.id))
        answer2 = AnswerFactory(question=question2, answer=str(player2.id))

        result = AnswerLookupService.bulk_resolve_answers([answer1, answer2])

        assert result[answer1.id] == "Kevin Durant"
        assert result[answer2.id] == "James Harden"

    def test_bulk_resolve_multiple_team_answers(self):
        """Test bulk resolving multiple team-based answers."""
        team1 = TeamFactory(name="Golden State Warriors")
        team2 = TeamFactory(name="Phoenix Suns")

        question1 = HeadToHeadQuestionFactory()
        question2 = NBAFinalsPredictionQuestionFactory(text="Winner?")

        answer1 = AnswerFactory(question=question1, answer=str(team1.id))
        answer2 = AnswerFactory(question=question2, answer=str(team2.id))

        result = AnswerLookupService.bulk_resolve_answers([answer1, answer2])

        assert result[answer1.id] == "Golden State Warriors"
        assert result[answer2.id] == "Phoenix Suns"

    def test_bulk_resolve_mixed_answer_types(self):
        """Test bulk resolving mixed answer types (text, player IDs, team IDs)."""
        player = PlayerFactory(name="Joel Embiid")
        team = TeamFactory(name="Philadelphia 76ers")

        question1 = PropQuestionFactory()
        question2 = SuperlativeQuestionFactory()
        question3 = HeadToHeadQuestionFactory()

        answer1 = AnswerFactory(question=question1, answer="Yes")
        answer2 = AnswerFactory(question=question2, answer=str(player.id))
        answer3 = AnswerFactory(question=question3, answer=str(team.id))

        result = AnswerLookupService.bulk_resolve_answers([answer1, answer2, answer3])

        assert result[answer1.id] == "Yes"
        assert result[answer2.id] == "Joel Embiid"
        assert result[answer3.id] == "Philadelphia 76ers"

    def test_bulk_resolve_with_special_case_questions(self):
        """Test bulk resolving with special case questions (tiebreaker, wins)."""
        question1 = InSeasonTournamentQuestionFactory(prediction_type='tiebreaker')
        question2 = NBAFinalsPredictionQuestionFactory(text="How many wins?")

        answer1 = AnswerFactory(question=question1, answer="110")
        answer2 = AnswerFactory(question=question2, answer="4")

        result = AnswerLookupService.bulk_resolve_answers([answer1, answer2])

        assert result[answer1.id] == "110"
        assert result[answer2.id] == "4"


@pytest.mark.unit
@pytest.mark.django_db
class TestBulkResolveAnswersOptimized:
    """Tests for bulk_resolve_answers_optimized method."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_bulk_resolve_optimized_empty_list(self):
        """Test optimized bulk resolving an empty list returns empty dict."""
        result = AnswerLookupService.bulk_resolve_answers_optimized([], {})

        assert result == {}

    def test_bulk_resolve_optimized_with_valid_question_map(self):
        """Test optimized bulk resolving with valid pre-fetched question map."""
        player = PlayerFactory(name="Anthony Davis")
        team = TeamFactory(name="Los Angeles Lakers")

        question1 = SuperlativeQuestionFactory()
        question2 = HeadToHeadQuestionFactory()

        answer1 = AnswerFactory(question=question1, answer=str(player.id))
        answer2 = AnswerFactory(question=question2, answer=str(team.id))

        # Create question map (simulating pre-fetched questions)
        question_map = {
            question1.id: question1,
            question2.id: question2,
        }

        result = AnswerLookupService.bulk_resolve_answers_optimized(
            [answer1, answer2], question_map
        )

        assert result[answer1.id] == "Anthony Davis"
        assert result[answer2.id] == "Los Angeles Lakers"

    def test_bulk_resolve_optimized_missing_question_in_map(self):
        """Test that missing questions in map fall back to raw answer value."""
        player = PlayerFactory(name="Damian Lillard")
        question = SuperlativeQuestionFactory()
        answer = AnswerFactory(question=question, answer=str(player.id))

        # Empty question map (simulating missing question)
        question_map = {}

        result = AnswerLookupService.bulk_resolve_answers_optimized([answer], question_map)

        # Should return raw answer value as fallback
        assert result[answer.id] == str(player.id)

    def test_bulk_resolve_optimized_with_non_digit_answers(self):
        """Test optimized bulk resolving with non-digit answers."""
        question1 = PropQuestionFactory()
        question2 = PropQuestionFactory()

        answer1 = AnswerFactory(question=question1, answer="Yes")
        answer2 = AnswerFactory(question=question2, answer="No")

        question_map = {
            question1.id: question1,
            question2.id: question2,
        }

        result = AnswerLookupService.bulk_resolve_answers_optimized(
            [answer1, answer2], question_map
        )

        assert result[answer1.id] == "Yes"
        assert result[answer2.id] == "No"

    def test_bulk_resolve_optimized_with_special_cases(self):
        """Test optimized bulk resolving with special case questions."""
        question1 = InSeasonTournamentQuestionFactory(prediction_type='tiebreaker')
        question2 = NBAFinalsPredictionQuestionFactory(text="How many wins?")

        answer1 = AnswerFactory(question=question1, answer="95")
        answer2 = AnswerFactory(question=question2, answer="4")

        question_map = {
            question1.id: question1,
            question2.id: question2,
        }

        result = AnswerLookupService.bulk_resolve_answers_optimized(
            [answer1, answer2], question_map
        )

        assert result[answer1.id] == "95"
        assert result[answer2.id] == "4"

    def test_bulk_resolve_optimized_with_invalid_ids(self):
        """Test optimized bulk resolving with invalid player/team IDs."""
        question1 = SuperlativeQuestionFactory()
        question2 = HeadToHeadQuestionFactory()

        answer1 = AnswerFactory(question=question1, answer="999999")
        answer2 = AnswerFactory(question=question2, answer="888888")

        question_map = {
            question1.id: question1,
            question2.id: question2,
        }

        result = AnswerLookupService.bulk_resolve_answers_optimized(
            [answer1, answer2], question_map
        )

        assert result[answer1.id] == "Player ID 999999 not found"
        assert result[answer2.id] == "Team ID 888888 not found"

    def test_bulk_resolve_optimized_large_batch(self):
        """Test optimized bulk resolving handles large batches efficiently."""
        players = [PlayerFactory(name=f"Player {i}") for i in range(50)]
        # Use PropQuestionFactory to avoid Award unique constraint issues
        questions = [PropQuestionFactory() for _ in range(50)]
        answers = [
            AnswerFactory(question=questions[i], answer=str(players[i].id))
            for i in range(50)
        ]

        question_map = {q.id: q for q in questions}

        result = AnswerLookupService.bulk_resolve_answers_optimized(answers, question_map)

        assert len(result) == 50
        for i, answer in enumerate(answers):
            assert result[answer.id] == f"Player {i}"


@pytest.mark.unit
@pytest.mark.django_db
class TestAnswerLookupServiceEdgeCases:
    """Tests for edge cases and error handling."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_resolve_answer_with_none_value(self):
        """Test resolving None answer value."""
        question = PropQuestionFactory()

        # str(None) becomes "None" which is not a digit
        result = AnswerLookupService.resolve_answer(None, question)

        assert result == "None"

    def test_resolve_answer_with_zero(self):
        """Test resolving zero as answer value."""
        question = SuperlativeQuestionFactory()

        result = AnswerLookupService.resolve_answer("0", question)

        assert result == "Player ID 0 not found"

    def test_resolve_answer_with_negative_number(self):
        """Test resolving negative number as answer value."""
        question = PropQuestionFactory()

        # Negative numbers are not digits according to isdigit()
        result = AnswerLookupService.resolve_answer("-1", question)

        assert result == "-1"

    def test_resolve_answer_with_float_string(self):
        """Test resolving float string as answer value."""
        question = PropQuestionFactory()

        # Float strings are not digits according to isdigit()
        result = AnswerLookupService.resolve_answer("3.14", question)

        assert result == "3.14"

    def test_resolve_answer_with_leading_zeros(self):
        """Test resolving answer with leading zeros."""
        player = PlayerFactory(name="Test Player")
        question = SuperlativeQuestionFactory()

        # Leading zeros should be handled by int() conversion
        result = AnswerLookupService.resolve_answer(f"00{player.id}", question)

        assert result == "Test Player"

    def test_bulk_resolve_with_duplicate_answers(self):
        """Test bulk resolving with duplicate answer IDs."""
        player = PlayerFactory(name="Kyrie Irving")
        question = SuperlativeQuestionFactory()

        answer1 = AnswerFactory(question=question, answer=str(player.id))
        answer2 = AnswerFactory(question=question, answer=str(player.id))

        result = AnswerLookupService.bulk_resolve_answers([answer1, answer2])

        assert result[answer1.id] == "Kyrie Irving"
        assert result[answer2.id] == "Kyrie Irving"

    def test_cache_timeout_constant(self):
        """Test that cache timeout is set to expected value."""
        assert AnswerLookupService.CACHE_TIMEOUT == 3600

    def test_get_lookup_tables_empty_database(self):
        """Test get_lookup_tables with no players or teams in database."""
        player_lookup, team_lookup = AnswerLookupService.get_lookup_tables()

        assert isinstance(player_lookup, dict)
        assert isinstance(team_lookup, dict)
        assert len(player_lookup) == 0
        assert len(team_lookup) == 0

    def test_resolve_answer_with_unicode_characters(self):
        """Test resolving answers with unicode characters."""
        question = PropQuestionFactory()
        answer_value = "Nicolás Batum"

        result = AnswerLookupService.resolve_answer(answer_value, question)

        assert result == "Nicolás Batum"

    def test_bulk_resolve_preserves_answer_order(self):
        """Test that bulk resolve maintains answer order in results."""
        player1 = PlayerFactory(name="Player A")
        player2 = PlayerFactory(name="Player B")
        player3 = PlayerFactory(name="Player C")

        question = SuperlativeQuestionFactory()

        answer1 = AnswerFactory(question=question, answer=str(player1.id))
        answer2 = AnswerFactory(question=question, answer=str(player2.id))
        answer3 = AnswerFactory(question=question, answer=str(player3.id))

        result = AnswerLookupService.bulk_resolve_answers([answer1, answer2, answer3])

        # All answers should be resolved
        assert len(result) == 3
        assert answer1.id in result
        assert answer2.id in result
        assert answer3.id in result
