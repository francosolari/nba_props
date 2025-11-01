"""
IST Leaderboard API Endpoint
Provides In-Season Tournament specific leaderboard data
"""
from typing import List, Optional
from ninja import Router
from django.db.models import Q, F
from django.contrib.auth import get_user_model
from predictions.models import Answer, Season, InSeasonTournamentQuestion
from predictions.api.v2.schemas import UserDisplaySchema
from pydantic import BaseModel, Field

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

        if not season:
            return ISTLeaderboardResponse(
                leaderboard=[],
                total_users=0,
                total_predictions=0,
                avg_accuracy=0.0
            )

        # Get all IST answers for this season
        ist_answers = Answer.objects.filter(
            question__season=season,
            question__polymorphic_ctype__model='inseasontournamentquestion'
        ).select_related(
            'user',
            'user__userprofile',
            'question'
        )

        # Group by user
        user_data = {}
        for answer in ist_answers:
            user_id = answer.user.id

            if user_id not in user_data:
                user_data[user_id] = {
                    'user': answer.user,
                    'predictions': [],
                    'total_points': 0.0,
                    'correct_count': 0,
                    'total_count': 0
                }

            # Get IST question details
            ist_question = answer.question.get_real_instance()

            prediction = ISTUserPredictionSchema(
                question_id=answer.question.id,
                question_text=answer.question.text,
                answer=answer.answer,
                prediction_type=getattr(ist_question, 'prediction_type', 'unknown'),
                ist_group=getattr(ist_question, 'ist_group', None),
                points_earned=float(answer.points_earned or 0),
                is_correct=answer.is_correct,
                max_points=float(answer.question.point_value or 1.0)
            )

            user_data[user_id]['predictions'].append(prediction)
            user_data[user_id]['total_points'] += prediction.points_earned
            user_data[user_id]['total_count'] += 1

            if answer.is_correct:
                user_data[user_id]['correct_count'] += 1

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

            entry = ISTUserLeaderboardSchema(
                rank=0,  # Will be set after sorting
                user=UserDisplaySchema(
                    id=user.id,
                    username=user.username,
                    first_name=user.first_name or '',
                    last_name=user.last_name or '',
                    display_name=display_name,
                ),
                total_points=data['total_points'],
                accuracy=accuracy,
                predictions=data['predictions']
            )
            leaderboard_entries.append(entry)

        # Sort by total points (descending)
        leaderboard_entries.sort(key=lambda x: x.total_points, reverse=True)

        # Assign ranks
        for rank, entry in enumerate(leaderboard_entries, start=1):
            entry.rank = rank

        # Calculate totals
        total_users = len(leaderboard_entries)
        total_predictions = sum(len(e.predictions) for e in leaderboard_entries)
        total_correct = sum(
            sum(1 for p in e.predictions if p.is_correct)
            for e in leaderboard_entries
        )
        avg_accuracy = (
            total_correct / total_predictions
            if total_predictions > 0 else 0.0
        )

        return ISTLeaderboardResponse(
            leaderboard=leaderboard_entries,
            total_users=total_users,
            total_predictions=total_predictions,
            avg_accuracy=avg_accuracy,
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
