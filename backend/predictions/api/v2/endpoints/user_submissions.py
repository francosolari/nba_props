# File: backend/predictions/api/v2/endpoints/user_submissions.py
"""
User-facing endpoints for question retrieval and answer submission.
Handles all polymorphic question types with proper serialization.
"""

from ninja import Router
from django.shortcuts import get_object_or_404
from django.db import transaction
from typing import List
from predictions.models import (
    Season, Question, Answer, 
    SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion,
    HeadToHeadQuestion, InSeasonTournamentQuestion, NBAFinalsPredictionQuestion
)
from predictions.api.v2.schemas import (
    QuestionsListResponse,
    QuestionSchema,
    UserAnswersResponse,
    AnswerSchema,
    BulkAnswerSubmitSchema,
    AnswerSubmitResponseSchema,
    SubmissionStatusSchema,
)
from predictions.utils.deadlines import validate_submission_window, is_submission_open, get_submission_status
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
    season = get_object_or_404(Season, slug=season_slug)
    
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
        "submission_start_date": season.submission_start_date,
        "submission_end_date": season.submission_end_date,
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
    
    season = get_object_or_404(Season, slug=season_slug)
    
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
    season = get_object_or_404(Season, slug=season_slug)
    return get_submission_status(season)
