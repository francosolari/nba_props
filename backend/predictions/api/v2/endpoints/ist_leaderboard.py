"""
IST Leaderboard API Endpoint
Provides In-Season Tournament specific leaderboard data
"""
from typing import Dict, List, Optional
from ninja import Router
from django.contrib.auth import get_user_model
from django.core.cache import cache
from collections import defaultdict

from predictions.models import Answer, Season, InSeasonTournamentQuestion
from predictions.api.v2.schemas import UserDisplaySchema
from predictions.api.v2.utils import results_visible
from predictions.api.v2.cache_utils import IST_LEADERBOARD_CACHE_KEY, IST_LEADERBOARD_CACHE_TTL
from pydantic import BaseModel, Field

from predictions.api.common.services.answer_lookup_service import AnswerLookupService

User = get_user_model()

router = Router(tags=["IST Leaderboard"])


class ISTUserPredictionSchema(BaseModel):
    """Schema for a single IST prediction"""
    question_id: int
    question_text: str
    answer: str
    prediction_type: str  # group_winner, wildcard, conference_winner
    ist_group: Optional[str] = None
    points_earned: float = 0.0
    is_correct: Optional[bool] = None
    max_points: float = 1.0


class ISTUserLeaderboardSchema(BaseModel):
    """Schema for IST user leaderboard entry"""
    rank: int
    user: UserDisplaySchema
    total_points: float = 0.0
    accuracy: float = 0.0
    predictions: List[ISTUserPredictionSchema] = Field(default_factory=list)


class SeasonInfoSchema(BaseModel):
    """Schema for season information"""
    slug: str
    year: str


class ISTLeaderboardResponse(BaseModel):
    """Response schema for IST leaderboard"""
    leaderboard: List[ISTUserLeaderboardSchema]
    total_users: int
    total_predictions: int
    avg_accuracy: float
    season: Optional[SeasonInfoSchema] = None


def _compute_ist_leaderboard_data(season) -> Dict:
    """
    Do the actual DB work for the IST leaderboard, returning plain dicts
    (not pydantic instances) so the result can be cached and later
    reconstructed into the response schema on every request cheaply.
    """
    # Get all IST answers for this season (evaluate queryset once for performance)
    ist_answers_qs = Answer.objects.filter(
        question__season=season,
        question__polymorphic_ctype__model='inseasontournamentquestion'
    ).select_related(
        'user',
        'user__userprofile',
        'question'
    )

    ist_answers = list(ist_answers_qs)

    empty = {"leaderboard": [], "total_users": 0, "total_predictions": 0, "avg_accuracy": 0.0}
    if not ist_answers:
        return empty

    question_ids = {answer.question_id for answer in ist_answers}
    ist_questions_map = InSeasonTournamentQuestion.objects.filter(id__in=question_ids).in_bulk()

    # Resolve answer values to friendly names using cached lookups
    resolved_answer_map = AnswerLookupService.bulk_resolve_answers_optimized(
        ist_answers,
        ist_questions_map
    )

    # Group by user
    user_data = defaultdict(lambda: {
        'user': None,
        'predictions': [],
        'total_points': 0.0,
        'correct_count': 0,
        'total_count': 0
    })

    for answer in ist_answers:
        ist_question = ist_questions_map.get(answer.question_id)
        if not ist_question:
            continue

        user_id = answer.user.id
        entry = user_data[user_id]

        if entry['user'] is None:
            entry['user'] = answer.user

        prediction = {
            "question_id": answer.question.id,
            "question_text": answer.question.text,
            "answer": resolved_answer_map.get(answer.id, str(answer.answer)),
            "prediction_type": getattr(ist_question, 'prediction_type', 'unknown'),
            "ist_group": getattr(ist_question, 'ist_group', None),
            "points_earned": float(answer.points_earned or 0),
            "is_correct": answer.is_correct,
            "max_points": float(answer.question.point_value or 1.0),
        }

        entry['predictions'].append(prediction)
        entry['total_points'] += prediction['points_earned']
        entry['total_count'] += 1

        if answer.is_correct:
            entry['correct_count'] += 1

    # Build leaderboard entries
    leaderboard_entries = []
    for user_id, data in user_data.items():
        user = data['user']
        profile = getattr(user, 'userprofile', None)

        accuracy = (
            data['correct_count'] / data['total_count']
            if data['total_count'] > 0 else 0.0
        )

        # Format display name
        display_name = (
            getattr(profile, 'display_name', None) or
            user.get_full_name() or
            user.username
        )

        leaderboard_entries.append({
            "rank": 0,  # Will be set after sorting
            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name or '',
                "last_name": user.last_name or '',
                "display_name": display_name,
            },
            "total_points": data['total_points'],
            "accuracy": accuracy,
            "predictions": data['predictions'],
        })

    # Sort by total points (descending)
    leaderboard_entries.sort(key=lambda x: x['total_points'], reverse=True)

    # Assign ranks
    for rank, entry in enumerate(leaderboard_entries, start=1):
        entry['rank'] = rank

    # Calculate totals
    total_users = len(leaderboard_entries)
    total_predictions = sum(len(e['predictions']) for e in leaderboard_entries)
    total_correct = sum(
        sum(1 for p in e['predictions'] if p['is_correct'])
        for e in leaderboard_entries
    )
    avg_accuracy = (
        total_correct / total_predictions
        if total_predictions > 0 else 0.0
    )

    return {
        "leaderboard": leaderboard_entries,
        "total_users": total_users,
        "total_predictions": total_predictions,
        "avg_accuracy": avg_accuracy,
    }


def _build_ist_leaderboard_data(season) -> Dict:
    """
    Cached entry point. The computation doesn't depend on who is asking, only
    whether they're allowed to see it (handled by the caller via
    ``results_visible``), so it's safe to share across requests briefly.
    """
    cache_key = IST_LEADERBOARD_CACHE_KEY.format(season_slug=season.slug)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    data = _compute_ist_leaderboard_data(season)
    cache.set(cache_key, data, timeout=IST_LEADERBOARD_CACHE_TTL)
    return data


@router.get("/{season_slug}", response=ISTLeaderboardResponse)
def get_ist_leaderboard(request, season_slug: str):
    """
    Get IST leaderboard with user rankings based on IST predictions only.

    This endpoint retrieves all users who have submitted IST predictions
    and ranks them by total points earned from IST questions.
    """
    try:
        # Get season
        if season_slug == 'current':
            season = Season.objects.order_by('-start_date').first()
        else:
            season = Season.objects.get(slug=season_slug)

        # Cup picks are part of the same sealed entry, so they stay private
        # until the submission window closes. Admins are exempt.
        if not season or not results_visible(season, request.user):
            return ISTLeaderboardResponse(
                leaderboard=[],
                total_users=0,
                total_predictions=0,
                avg_accuracy=0.0,
                season=SeasonInfoSchema(slug=season.slug, year=season.year) if season else None
            )

        data = _build_ist_leaderboard_data(season)

        return ISTLeaderboardResponse(
            leaderboard=[ISTUserLeaderboardSchema(**entry) for entry in data["leaderboard"]],
            total_users=data["total_users"],
            total_predictions=data["total_predictions"],
            avg_accuracy=data["avg_accuracy"],
            season=SeasonInfoSchema(slug=season.slug, year=season.year) if season else None
        )

    except Season.DoesNotExist:
        return ISTLeaderboardResponse(
            leaderboard=[],
            total_users=0,
            total_predictions=0,
            avg_accuracy=0.0
        )
    except Exception as e:
        print(f"Error fetching IST leaderboard: {e}")
        return ISTLeaderboardResponse(
            leaderboard=[],
            total_users=0,
            total_predictions=0,
            avg_accuracy=0.0
        )
