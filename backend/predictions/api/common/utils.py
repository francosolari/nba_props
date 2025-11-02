
"""
Common utilities for API endpoints.
Provides reusable functions for answer resolution and question processing.
"""
from typing import Dict, List, Tuple, Optional
from predictions.models import Answer, Question
from .services.answer_lookup_service import AnswerLookupService


def resolve_answers_optimized(answer_list: List[Answer]) -> Dict[int, str]:
    """
    Ultra-fast answer resolution that skips unnecessary database queries.
    Only resolves player/team IDs to names when actually needed.
    """
    if not answer_list:
        return {}

    # Get cached lookup tables once
    player_lookup, team_lookup = AnswerLookupService.get_lookup_tables()

    resolved_map = {}

    for answer_obj in answer_list:
        answer_val_str = str(answer_obj.answer)

        # Skip non-numeric answers immediately
        if not answer_val_str.isdigit():
            resolved_map[answer_obj.id] = answer_val_str
            continue

        # Use the pre-existing question info to categorize without get_real_instance()
        question_type = answer_obj.question.polymorphic_ctype.model if answer_obj.question.polymorphic_ctype else None

        # Handle special cases first (avoid lookup when possible)
        if question_type == 'inseasontournamentquestion':
            # Check if it's a tiebreaker by looking at the question text
            if "tiebreaker" in answer_obj.question.text.lower() or "points" in answer_obj.question.text.lower():
                resolved_map[answer_obj.id] = answer_val_str
                continue

        if question_type == 'nbafinalspredictionquestion' and "wins" in answer_obj.question.text.lower():
            resolved_map[answer_obj.id] = answer_val_str
            continue

        # Resolve based on question type
        answer_id_int = int(answer_val_str)

        if question_type in ('superlativequestion', 'propquestion', 'playerstatpredictionquestion'):
            resolved_map[answer_obj.id] = player_lookup.get(answer_id_int, f"Player ID {answer_id_int} not found")
        elif question_type in ('inseasontournamentquestion', 'headtoheadquestion', 'nbafinalspredictionquestion'):
            resolved_map[answer_obj.id] = team_lookup.get(answer_id_int, f"Team ID {answer_id_int} not found")
        else:
            resolved_map[answer_obj.id] = answer_val_str

    return resolved_map


def resolve_answers_with_questions(
    answer_list: List[Answer],
    resolve_values: bool = True
) -> Tuple[Dict[int, Question], Dict[int, str]]:
    """
    DEPRECATED: Use resolve_answers_optimized for better performance.
    Kept for backward compatibility.
    """
    if not answer_list:
        return {}, {}

    # For backward compatibility, still provide real questions map
    question_ids = [ans.question_id for ans in answer_list]
    real_questions = Question.objects.filter(id__in=question_ids).get_real_instances()
    real_questions_map = {q.id: q for q in real_questions}

    # Use optimized resolution
    resolved_answer_values_map = {}
    if resolve_values:
        resolved_answer_values_map = resolve_answers_optimized(answer_list)

    return real_questions_map, resolved_answer_values_map