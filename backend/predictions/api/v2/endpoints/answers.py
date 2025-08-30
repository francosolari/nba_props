# nba_predictions/predictions/api/v2/endpoints/answers.py

from ninja import Router, Schema
from ninja.pagination import paginate, PageNumberPagination
from ninja.errors import HttpError
from typing import List, Optional, Dict
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from predictions.models import (Answer, Season, Question, UserStats)
from predictions.api.common.question_processor import process_questions_for_season
from predictions.api.common.services.answer_lookup_service import AnswerLookupService
from predictions.api.common.utils import resolve_answers_optimized
from collections import defaultdict


# Schema definitions
class UserSchema(Schema):
    id: int
    username: str
    points: Optional[float] = None


class AnswerSchema(Schema):
    question_id: int
    question_text: str
    question_type: str
    season: str
    answer: str
    points_earned: Optional[float] = None
    is_correct: Optional[bool] = False


class UserAnswersResponse(Schema):
    user: UserSchema
    answers: List[AnswerSchema]


# Create router instance
router = Router(tags=["answers"])


@router.get("/user/{identifier}", response=UserAnswersResponse)
def get_user_answers(
        request,
        identifier: str,
        question_type: Optional[str] = None,
        season_slug: Optional[str] = None,
        resolve_names: bool = True
):
    """
    Retrieve a user's answers with optional human-readable display values.
    Optimized for performance with minimal database queries.
    """
    try:
        if identifier.isdigit():
            user = get_object_or_404(User, id=identifier)
        else:
            user = get_object_or_404(User, username__iexact=identifier)

        answers_qs = Answer.objects.filter(user=user).select_related(
            'question',
            'question__season',
            'question__polymorphic_ctype'
        ).exclude(question__polymorphic_ctype__model='inseasontournamentquestion')

        if season_slug:
            answers_qs = answers_qs.filter(question__season__slug=season_slug)

        if question_type:
            answers_qs = answers_qs.filter(
                question__polymorphic_ctype__model=question_type.lower()
            )

        # Execute the queryset to get Answer objects
        answers_list = list(answers_qs)

        # Use ultra-fast optimized resolution
        resolved_answer_values_map = {}
        if resolve_names:
            resolved_answer_values_map = resolve_answers_optimized(answers_list)

        answer_data = []
        for answer_obj in answers_list:
            # Use base question info (already loaded via select_related)
            question_text = answer_obj.question.text if answer_obj.question else "Unknown Question Text"
            question_type_name = (
                answer_obj.question.polymorphic_ctype.model
                if answer_obj.question and answer_obj.question.polymorphic_ctype
                else "unknown"
            )
            current_season_slug = (
                answer_obj.question.season.slug
                if answer_obj.question and answer_obj.question.season
                else "unknown"
            )

            # Use resolved value if available, otherwise fall back to raw answer
            answer_value = (
                resolved_answer_values_map.get(answer_obj.id, str(answer_obj.answer))
                if resolve_names and resolved_answer_values_map
                else str(answer_obj.answer)
            )

            answer_dict = {
                'question_id': answer_obj.question_id,
                'question_text': question_text,
                'question_type': question_type_name,
                'season': current_season_slug,
                'answer': answer_value,
                'points_earned': answer_obj.points_earned,
                'is_correct': answer_obj.is_correct,
            }
            answer_data.append(answer_dict)

        response_data = {
            'user': {
                'id': user.id,
                'username': user.username
            },
            'answers': answer_data
        }
        return response_data

    except User.DoesNotExist:
        raise HttpError(404, f"User with identifier '{identifier}' not found.")
    except Exception as e:
        raise HttpError(500, "An unexpected error occurred while retrieving user answers.")


@router.get("/all-by-season/", response=List[UserAnswersResponse])
@paginate(PageNumberPagination)
def get_all_users_answers_by_season(
        request,
        season_slug: str,
        question_type: Optional[str] = None,
        resolve_names: bool = True
):
    """
    Retrieve answers for all users for a specific season with efficient batch processing.
    Optimized for performance with minimal database queries.
    """
    try:
        answers_qs = Answer.objects.filter(question__season__slug=season_slug).select_related(
            'user',
            'question',
            'question__season',
            'question__polymorphic_ctype'
        ).exclude(question__polymorphic_ctype__model='inseasontournamentquestion')

        if question_type:
            answers_qs = answers_qs.filter(
                question__polymorphic_ctype__model=question_type.lower()
            )

        all_answers_list = list(answers_qs.order_by('user_id'))

        if not all_answers_list:
            return []

        # Fetch each user's points for the requested season in bulk
        user_ids = {ans.user_id for ans in all_answers_list}
        user_points_map = {
            us.user_id: us.points
            for us in UserStats.objects.filter(
                season__slug=season_slug,
                user_id__in=user_ids
            )
        }

        # Use ultra-fast optimized resolution
        resolved_answer_values_map = {}
        if resolve_names:
            resolved_answer_values_map = resolve_answers_optimized(all_answers_list)

        # Group answers by user and prepare response data
        user_answers_data = defaultdict(lambda: {'user_info': None, 'answers_list': []})

        for answer_obj in all_answers_list:
            user_id = answer_obj.user_id

            # Store user info only once
            if user_answers_data[user_id]['user_info'] is None:
                 user_answers_data[user_id]['user_info'] = UserSchema(
                     id=user_id,
                     username=answer_obj.user.username,
                     points=user_points_map.get(user_id)
                 )

            # Use base question info (already loaded via select_related)
            question_text = answer_obj.question.text if answer_obj.question else "Unknown Question Text"
            question_type_name = (
                answer_obj.question.polymorphic_ctype.model
                if answer_obj.question and answer_obj.question.polymorphic_ctype
                else "unknown"
            )
            current_season_slug = (
                answer_obj.question.season.slug
                if answer_obj.question and answer_obj.question.season
                else season_slug  # Use input season_slug as fallback
            )

            # Use resolved value if available, otherwise fall back to raw answer
            answer_value = (
                resolved_answer_values_map.get(answer_obj.id, str(answer_obj.answer))
                if resolve_names and resolved_answer_values_map
                else str(answer_obj.answer)
            )

            answer_schema_instance = AnswerSchema(
                question_id=answer_obj.question_id,
                question_text=question_text,
                question_type=question_type_name,
                season=current_season_slug,
                answer=answer_value,
                points_earned=answer_obj.points_earned,
                is_correct=answer_obj.is_correct,
            )
            user_answers_data[user_id]['answers_list'].append(answer_schema_instance)

        final_response_list = [
            UserAnswersResponse(user=data['user_info'], answers=data['answers_list'])
            for data in user_answers_data.values()
            if data['user_info'] is not None
        ]

        return final_response_list

    except Season.DoesNotExist:
        raise HttpError(404, f"Season with slug '{season_slug}' not found.")
    except Exception as e:
        raise HttpError(500, f"An unexpected error occurred while retrieving all user answers for season {season_slug}.")


@router.get("/lookup/refresh", response=dict)
def refresh_lookup_cache(request):
    """
    Manually refresh the player and team lookup cache.
    """
    try:
        from django.core.cache import cache

        # Clear existing cache
        cache.delete(AnswerLookupService.PLAYER_CACHE_KEY)
        cache.delete(AnswerLookupService.TEAM_CACHE_KEY)

        # Rebuild cache
        player_lookup, team_lookup = AnswerLookupService.get_lookup_tables()

        return {
            "status": "success",
            "message": "Lookup cache refreshed successfully",
            "player_count": len(player_lookup),
            "team_count": len(team_lookup)
        }
    except Exception as e:
        raise HttpError(500, f"Error refreshing cache: {str(e)}")