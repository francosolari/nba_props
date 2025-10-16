# File: backend/predictions/api/v2/endpoints/user_submissions.py
"""
User-facing endpoints for question retrieval and answer submission.
Handles all polymorphic question types with proper serialization.
"""

from datetime import datetime, time
from ninja import Router
from django.shortcuts import get_object_or_404
from django.db import transaction
from typing import List, Optional
from django.utils import timezone
from django.contrib.auth import get_user_model
from predictions.models import (
    Season, Question, Answer, 
    SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion,
    HeadToHeadQuestion, InSeasonTournamentQuestion, NBAFinalsPredictionQuestion,
    StandingPrediction, Team, UserStats
)
from predictions.api.v2.schemas import (
    QuestionsListResponse,
    QuestionSchema,
    UserAnswersResponse,
    AnswerSchema,
    BulkAnswerSubmitSchema,
    AnswerSubmitResponseSchema,
    SubmissionStatusSchema,
    StandingPredictionsResponseSchema,
    StandingPredictionsSubmitSchema,
    StandingPredictionsSubmitResponseSchema,
    EntryFeeStatusSchema,
    EntryFeeUpdateSchema,
)
from predictions.utils.deadlines import validate_submission_window, is_submission_open, get_submission_status
from predictions.utils.payments import get_entry_fee_payload
from ninja.errors import HttpError


router = Router(tags=["User Submissions"])


QUESTION_TYPE_MAP = {
    SuperlativeQuestion: "superlative",
    PropQuestion: "prop",
    PlayerStatPredictionQuestion: "player_stat",
    HeadToHeadQuestion: "head_to_head",
    InSeasonTournamentQuestion: "ist",
    NBAFinalsPredictionQuestion: "nba_finals",
}

QUESTION_MODEL_NAME_MAP = {
    SuperlativeQuestion._meta.model_name: "superlative",
    PropQuestion._meta.model_name: "prop",
    PlayerStatPredictionQuestion._meta.model_name: "player_stat",
    HeadToHeadQuestion._meta.model_name: "head_to_head",
    InSeasonTournamentQuestion._meta.model_name: "ist",
    NBAFinalsPredictionQuestion._meta.model_name: "nba_finals",
}


UserModel = get_user_model()


def _resolve_season(season_slug: str) -> Season:
    """Resolve a season slug, supporting the 'current' shortcut."""
    if season_slug == "current":
        season = Season.objects.order_by('-start_date').first()
        if not season:
            raise HttpError(404, "Latest season not found")
        return season
    return get_object_or_404(Season, slug=season_slug)


def _resolve_prediction_user(username: Optional[str], request) -> Optional[UserModel]:
    """
    Resolve the user whose predictions should be viewed.
    Prefers explicit username, otherwise falls back to the request user.
    """
    if username:
        try:
            return UserModel.objects.get(username=username)
        except UserModel.DoesNotExist:
            return None
    if request.user.is_authenticated:
        return request.user
    return None


def _build_entry_fee_status_payload(season: Season, user_stats: UserStats) -> dict:
    """
    Build the serialized entry fee status response for the frontend.
    """
    payment_meta = get_entry_fee_payload()
    return {
        "season_slug": season.slug,
        "is_paid": user_stats.entry_fee_paid,
        "paid_at": user_stats.entry_fee_paid_at,
        "amount_due": payment_meta["amount_display"],
        "venmo_username": payment_meta["venmo_username"],
        "venmo_web_url": payment_meta["venmo_web_url"],
        "venmo_deep_link": payment_meta["venmo_deep_link"],
        "payment_note": payment_meta["payment_note"],
    }


def get_question_type_slug(question: Question) -> str:
    """
    Return the short question type identifier used by the API/Frontend.
    Defaults to 'unknown' if a new question type is introduced without mapping.
    """
    for model, slug in QUESTION_TYPE_MAP.items():
        if isinstance(question, model):
            return slug
    polymorphic_ctype = getattr(question, "polymorphic_ctype", None)
    if polymorphic_ctype is not None:
        return QUESTION_MODEL_NAME_MAP.get(polymorphic_ctype.model, "unknown")
    return "unknown"


def serialize_question(question: Question) -> dict:
    """
    Serialize a polymorphic Question into the appropriate schema format.
    
    Args:
        question: Question instance (any subclass)
        
    Returns:
        Dictionary with question data
    """
    real_question = question.get_real_instance() if hasattr(question, "get_real_instance") else question
    question_type = get_question_type_slug(real_question)

    base_data: dict = {
        "id": real_question.id,
        "season_slug": real_question.season.slug,
        "text": real_question.text,
        "point_value": real_question.point_value,
        "is_manual": real_question.is_manual,
        "last_updated": real_question.last_updated,
        "question_type": question_type,
    }
    
    # Superlative Question
    if isinstance(real_question, SuperlativeQuestion):
        return {
            **base_data,
            "award_id": real_question.award.id,
            "award_name": real_question.award.name,
            "is_finalized": real_question.is_finalized,
            "winners": list(real_question.winners.values_list('id', flat=True)) if real_question.pk else [],
        }
    
    # Prop Question
    elif isinstance(real_question, PropQuestion):
        return {
            **base_data,
            "outcome_type": real_question.outcome_type,
            "related_player_id": real_question.related_player.id if real_question.related_player else None,
            "related_player_name": real_question.related_player.name if real_question.related_player else None,
            "line": real_question.line,
        }
    
    # Player Stat Prediction Question
    elif isinstance(real_question, PlayerStatPredictionQuestion):
        return {
            **base_data,
            "player_stat_id": real_question.player_stat.id,
            "stat_type": real_question.stat_type,
            "fixed_value": real_question.fixed_value,
            "current_leaders": real_question.current_leaders,
            "top_performers": real_question.top_performers,
        }
    
    # Head-to-Head Question
    elif isinstance(real_question, HeadToHeadQuestion):
        return {
            **base_data,
            "team1_id": real_question.team1.id,
            "team1_name": real_question.team1.name,
            "team2_id": real_question.team2.id,
            "team2_name": real_question.team2.name,
        }
    
    # In-Season Tournament Question
    elif isinstance(real_question, InSeasonTournamentQuestion):
        return {
            **base_data,
            "prediction_type": real_question.prediction_type,
            "ist_group": real_question.ist_group,
            "is_tiebreaker": real_question.is_tiebreaker,
        }
    
    # NBA Finals Prediction Question
    elif isinstance(real_question, NBAFinalsPredictionQuestion):
        return {
            **base_data,
            "group_name": real_question.group_name,
        }
    
    # Fallback for base Question (shouldn't normally happen)
    else:
        return {
            **base_data,
            "question_type": "unknown",
        }


@router.get(
    "/entry-fee/{season_slug}",
    response=EntryFeeStatusSchema,
    summary="Get entry fee status",
    description="Retrieve the user's entry fee payment status and Venmo metadata for a season."
)
def get_entry_fee_status(request, season_slug: str):
    """
    Get entry fee payment status for the authenticated user and season.
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    season = _resolve_season(season_slug)
    user_stats, _ = UserStats.objects.get_or_create(user=request.user, season=season)
    return _build_entry_fee_status_payload(season, user_stats)


@router.post(
    "/entry-fee/{season_slug}",
    response=EntryFeeStatusSchema,
    summary="Update entry fee status",
    description="Mark the entry fee as paid or unpaid for the authenticated user."
)
def update_entry_fee_status(request, season_slug: str, payload: EntryFeeUpdateSchema):
    """
    Update entry fee payment status for the authenticated user.
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    season = _resolve_season(season_slug)
    user_stats, _ = UserStats.objects.get_or_create(user=request.user, season=season)
    desired_status = bool(payload.is_paid)

    if desired_status != user_stats.entry_fee_paid:
        user_stats.entry_fee_paid = desired_status
        user_stats.entry_fee_paid_at = timezone.now() if desired_status else None
        user_stats.save(update_fields=["entry_fee_paid", "entry_fee_paid_at"])

    return _build_entry_fee_status_payload(season, user_stats)


@router.get(
    "/standings/{season_slug}",
    response=StandingPredictionsResponseSchema,
    summary="Get standings predictions for a user",
    description="Retrieve regular season standings predictions for a specific user and season."
)
def get_standing_predictions(request, season_slug: str, username: Optional[str] = None):
    """
    Retrieve standings predictions for the requested user.
    Falls back to the authenticated user when no username is provided.
    """
    season = _resolve_season(season_slug)
    user = _resolve_prediction_user(username, request)

    if user is None:
        return {
            "season_slug": season.slug,
            "username": username or (request.user.username if request.user.is_authenticated else None),
            "predictions": [],
            "east": [],
            "west": [],
        }

    predictions_qs = (
        StandingPrediction.objects.filter(user=user, season=season)
        .select_related("team")
        .order_by("predicted_position")
    )

    predictions = []
    east = []
    west = []

    for pred in predictions_qs:
        team = pred.team
        entry = {
            "team_id": team.id,
            "team_name": team.name,
            "team_conference": team.conference,
            "predicted_position": pred.predicted_position,
        }
        predictions.append(entry)
        conference_key = (team.conference or "").lower()
        if conference_key.startswith("e"):
            east.append(entry)
        else:
            west.append(entry)

    east.sort(key=lambda item: item["predicted_position"])
    west.sort(key=lambda item: item["predicted_position"])

    return {
        "season_slug": season.slug,
        "username": user.username,
        "predictions": predictions,
        "east": east,
        "west": west,
    }


@router.post(
    "/standings/{season_slug}",
    response=StandingPredictionsSubmitResponseSchema,
    summary="Submit standings predictions",
    description="Create or update the authenticated user's regular season standings predictions."
)
def submit_standing_predictions(request, season_slug: str, payload: StandingPredictionsSubmitSchema):
    """
    Submit standings predictions for the authenticated user.
    Enforces submission windows and validates payload integrity.
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    season = _resolve_season(season_slug)

    # Ensure submissions are allowed
    validate_submission_window(season)

    predictions_payload = payload.predictions or []
    if not predictions_payload:
        raise HttpError(400, "No predictions provided")

    team_ids = [entry.team_id for entry in predictions_payload]
    if len(team_ids) != len(set(team_ids)):
        raise HttpError(400, "Duplicate team_id values provided")

    teams = Team.objects.in_bulk(team_ids)
    missing = [team_id for team_id in team_ids if team_id not in teams]
    if missing:
        raise HttpError(400, f"Invalid team IDs: {', '.join(map(str, missing))}")

    errors = {}
    east_positions = set()
    west_positions = set()

    for entry in predictions_payload:
        team = teams[entry.team_id]
        position = entry.predicted_position

        if position < 1 or position > 15:
            errors[str(entry.team_id)] = "Predicted position must be between 1 and 15"
            continue

        conference = (team.conference or "").lower()
        position_set = east_positions if conference.startswith("e") else west_positions
        if position in position_set:
            errors[str(entry.team_id)] = f"Duplicate predicted position {position} in {team.conference} conference"
        else:
            position_set.add(position)

    if errors:
        return {
            "status": "error",
            "message": "Validation errors occurred",
            "saved_count": 0,
            "errors": errors,
        }

    saved_count = 0
    with transaction.atomic():
        StandingPrediction.objects.filter(
            user=request.user,
            season=season
        ).exclude(team_id__in=team_ids).delete()

        for entry in predictions_payload:
            team = teams[entry.team_id]
            StandingPrediction.objects.update_or_create(
                user=request.user,
                season=season,
                team=team,
                defaults={"predicted_position": entry.predicted_position},
            )
            saved_count += 1

    return {
        "status": "success",
        "message": "Standings predictions saved",
        "saved_count": saved_count,
        "errors": None,
    }


@router.get(
    "/questions/{season_slug}",
    response=QuestionsListResponse,
    summary="Get Questions for Season",
    description="Retrieve all questions for a specific season with submission window status"
)
def get_questions(request, season_slug: str):
    """
    Get all questions for a specific season.
    Includes submission window status information.
    """
    season = _resolve_season(season_slug)
    
    # Get all questions for the season
    questions = (
        Question.objects.filter(season=season)
        .select_related('season')
        .order_by('id')
    )
    
    # Serialize each question
    serialized_questions = [serialize_question(q) for q in questions]
    
    # Get submission status
    submission_status = get_submission_status(season)
    
    return {
        "season_slug": season_slug,
        "submission_open": submission_status["is_open"],
        "submission_start_date": _serialize_datetime(season.submission_start_date),
        "submission_end_date": _serialize_datetime(season.submission_end_date),
        "submission_status": submission_status,
        "questions": serialized_questions,
    }


@router.get(
    "/answers/{season_slug}",
    response=UserAnswersResponse,
    summary="Get User's Answers",
    description="Retrieve the authenticated user's answers for a specific season"
)
def get_user_answers(request, season_slug: str):
    """
    Get the authenticated user's answers for a specific season.
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
    
    season = _resolve_season(season_slug)
    
    # Get user's answers
    answers = Answer.objects.filter(
        user=request.user,
        question__season=season
    ).select_related('question', 'question__season').order_by('question_id')
    
    # Serialize answers
    serialized_answers = [
        {
            "id": answer.id,
            "question_id": answer.question.id,
            "question_text": answer.question.text,
            "question_type": get_question_type_slug(answer.question),
            "answer": answer.answer,
            "points_earned": answer.points_earned,
            "is_correct": answer.is_correct,
            "submission_date": answer.submission_date,
        }
        for answer in answers
    ]
    
    # Calculate total points
    total_points = sum(a["points_earned"] or 0 for a in serialized_answers)
    
    return {
        "season_slug": season_slug,
        "answers": serialized_answers,
        "total_points": total_points,
    }


@router.post(
    "/answers/{season_slug}",
    response=AnswerSubmitResponseSchema,
    summary="Submit Answers",
    description="Submit or update answers for questions in a season (deadline enforced)"
)
def submit_answers(request, season_slug: str, payload: BulkAnswerSubmitSchema):
    """
    Submit or update answers for a season's questions.
    Enforces submission deadline - returns 403 if deadline has passed.
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
    
    season = get_object_or_404(Season, slug=season_slug)
    
    # Validate submission window
    validate_submission_window(season)
    
    saved_count = 0
    errors = {}
    
    with transaction.atomic():
        for answer_data in payload.answers:
            question_id = answer_data.question_id
            answer_value = answer_data.answer
            
            try:
                # Get question and verify it belongs to this season
                question = get_object_or_404(Question, id=question_id, season=season)
                
                # Create or update answer
                Answer.objects.update_or_create(
                    user=request.user,
                    question=question,
                    defaults={'answer': answer_value}
                )
                
                saved_count += 1
                
            except Exception as e:
                errors[str(question_id)] = str(e)
    
    if errors:
        return {
            "status": "partial_success" if saved_count > 0 else "error",
            "message": f"Saved {saved_count} answer(s), but encountered errors",
            "saved_count": saved_count,
            "errors": errors,
        }
    
    return {
        "status": "success",
        "message": f"Successfully saved {saved_count} answer(s)",
        "saved_count": saved_count,
        "errors": None,
    }


@router.get(
    "/submission-status/{season_slug}",
    response=SubmissionStatusSchema,
    summary="Get Submission Status",
    description="Check if submission window is open for a season"
)
def get_submission_window_status(request, season_slug: str):
    """
    Get detailed submission window status for a season.
    """
    season = _resolve_season(season_slug)
    return get_submission_status(season)


def _serialize_datetime(value):
    if not value:
        return None
    if not isinstance(value, datetime):
        value = datetime.combine(value, time.min)
    if timezone.is_naive(value):
        value = timezone.make_aware(value)
    return timezone.localtime(value)
