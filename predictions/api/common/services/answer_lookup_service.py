# predictions/api/common/services/answer_lookup_service.py

import logging
from django.core.cache import cache
from predictions.models import (
    Answer, Player, Team,
    SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion,
    InSeasonTournamentQuestion, HeadToHeadQuestion, NBAFinalsPredictionQuestion,
    Question
)
from typing import Dict, Tuple, Optional, List

# Configure logging
logger = logging.getLogger(__name__)


class AnswerLookupService:
    """Service class for handling answer lookups with caching."""

    PLAYER_CACHE_KEY = 'answer_admin_player_lookup'
    TEAM_CACHE_KEY = 'answer_admin_team_lookup'
    CACHE_TIMEOUT = 3600  # 1 hour

    @classmethod
    def get_lookup_tables(cls) -> Tuple[Dict[int, str], Dict[int, str]]:
        """
        Build or retrieve separate cached lookup tables for Player and Team IDs.
        Considered alternative: Fetch all players/teams directly if Answer table is very large.
        """
        player_lookup = cache.get(cls.PLAYER_CACHE_KEY)
        team_lookup = cache.get(cls.TEAM_CACHE_KEY)

        # Build player lookup if not cached
        if player_lookup is None:
            logger.info("Building player lookup table cache...")
            # Optimized approach: Fetch all players directly
            all_players = Player.objects.all().values('id', 'name')
            player_lookup = {player['id']: player['name'] for player in all_players}
            cache.set(cls.PLAYER_CACHE_KEY, player_lookup, timeout=cls.CACHE_TIMEOUT)
            logger.info(f"Built player lookup with {len(player_lookup)} entries.")

        # Build team lookup if not cached
        if team_lookup is None:
            logger.info("Building team lookup table cache...")
            # Optimized approach: Fetch all teams directly
            all_teams = Team.objects.all().values('id', 'name')
            team_lookup = {team['id']: team['name'] for team in all_teams}
            cache.set(cls.TEAM_CACHE_KEY, team_lookup, timeout=cls.CACHE_TIMEOUT)
            logger.info(f"Built team lookup with {len(team_lookup)} entries.")

        return player_lookup, team_lookup

    @classmethod
    def resolve_answer(cls, answer_value: str, question_instance: Question) -> str:
        """
        Resolves a single answer value given a "real" question instance.
        Relies on get_lookup_tables for player/team name resolution.
        """
        player_lookup, team_lookup = cls.get_lookup_tables()  # Efficient due to caching

        if not str(answer_value).isdigit():
            return str(answer_value)

        # Handle special cases (question_instance is already the "real" instance)
        if isinstance(question_instance,
                      InSeasonTournamentQuestion) and question_instance.prediction_type == 'tiebreaker':
            return str(answer_value)
        if isinstance(question_instance, NBAFinalsPredictionQuestion) and "How many wins?" in question_instance.text:
            return str(answer_value)

        answer_id_int = int(answer_value)
        if isinstance(question_instance, (SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion)):
            return player_lookup.get(answer_id_int, f"Player ID {answer_id_int} not found")
        elif isinstance(question_instance,
                        (InSeasonTournamentQuestion, HeadToHeadQuestion, NBAFinalsPredictionQuestion)):
            return team_lookup.get(answer_id_int, f"Team ID {answer_id_int} not found")

        return str(answer_value)

    @classmethod
    def bulk_resolve_answers_optimized(cls, answers_list: List[Answer], real_questions_map: Dict[int, Question]) -> \
    Dict[int, str]:
        """
        Efficiently resolves multiple answer values using a pre-fetched map of real question instances.
        """
        logger.info(f"Bulk resolving {len(answers_list)} answers with optimized question map")
        # Get cached lookups once
        player_lookup, team_lookup = cls.get_lookup_tables()

        resolved_map = {}
        for answer_obj in answers_list:
            real_question = real_questions_map.get(answer_obj.question_id)

            if not real_question:
                resolved_map[answer_obj.id] = str(answer_obj.answer)  # Fallback
                logger.warning(
                    f"Real question not found for question_id {answer_obj.question_id} during bulk resolve for answer {answer_obj.id}.")
                continue

            answer_val_str = str(answer_obj.answer)
            if not answer_val_str.isdigit():
                resolved_map[answer_obj.id] = answer_val_str
                continue

            # Handle special cases for specific question types
            if isinstance(real_question, InSeasonTournamentQuestion) and real_question.prediction_type == 'tiebreaker':
                resolved_map[answer_obj.id] = answer_val_str
                continue
            if isinstance(real_question, NBAFinalsPredictionQuestion) and "How many wins?" in real_question.text:
                resolved_map[answer_obj.id] = answer_val_str
                continue

            answer_id_int = int(answer_val_str)
            if isinstance(real_question, (SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion)):
                resolved_map[answer_obj.id] = player_lookup.get(answer_id_int, f"Player ID {answer_id_int} not found")
            elif isinstance(real_question,
                            (InSeasonTournamentQuestion, HeadToHeadQuestion, NBAFinalsPredictionQuestion)):
                resolved_map[answer_obj.id] = team_lookup.get(answer_id_int, f"Team ID {answer_id_int} not found")
            else:
                resolved_map[answer_obj.id] = answer_val_str  # Fallback for other types

        logger.info(f"Resolved {len(resolved_map)} answers using optimized method")
        return resolved_map

    # Keep original bulk_resolve_answers if it's used elsewhere, or mark as deprecated.
    # For this optimization, we are focusing on providing bulk_resolve_answers_optimized.
    @classmethod
    def bulk_resolve_answers(cls, answers: list) -> Dict[int, str]:
        """
        Original method. Consider deprecating or refactoring if all uses switch to optimized version.
        This version makes N calls to get_real_instance() if not already done.
        """
        logger.info(f"Bulk resolving {len(answers)} answers (original method)")
        player_lookup, team_lookup = cls.get_lookup_tables()  # Pre-warm cache

        resolved = {}
        for answer_obj in answers:
            # This is the problematic part if answer_obj.question is not already a real instance
            question_instance = answer_obj.question.get_real_instance()
            # Call the single resolve_answer method which itself calls get_lookup_tables again (though cached)
            resolved[answer_obj.id] = cls.resolve_answer(str(answer_obj.answer), question_instance)

        logger.info(f"Resolved {len(resolved)} answers (original method)")
        return resolved