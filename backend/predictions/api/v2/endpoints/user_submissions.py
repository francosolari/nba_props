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
from predictions.api.v2.schemas.questions import (
    QuestionsListResponse, QuestionBaseSchema,
    SuperlativeQuestionSchema, PropQuestionSchema, PlayerStatPredictionQuestionSchema,
    HeadToHeadQuestionSchema, InSeasonTournamentQuestionSchema, NBAFinalsPredictionQuestionSchema,
    UserAnswersResponse, AnswerSchema,
    BulkAnswerSubmitSchema, AnswerSubmitResponseSchema
)
from predictions.utils.deadlines import validate_submission_window, is_submission_open, get_submission_status
from ninja.errors import HttpError


router = Router(tags=["User Submissions"])


def serialize_question(question: Question) -> dict:
    """
    Serialize a polymorphic Question into the appropriate schema format.
    
    Args:
        question: Question instance (any subclass)
        
    Returns:
        Dictionary with question data
    """
    base_data = {
        "id": question.id,
        "season_slug": question.season.slug,
        "text": question.text,
        "point_value": question.point_value,
        "is_manual": question.is_manual,
        "last_updated": question.last_updated,
    }
    
    # Superlative Question
    if isinstance(question, SuperlativeQuestion):
        return {
            **base_data,
            "question_type": "superlative",
            "award_id": question.award.id,
            "award_name": question.award.name,
            "is_finalized": question.is_finalized,
            "winners": list(question.winners.values_list('id', flat=True)) if question.winners.exists() else None,
        }
    
    # Prop Question
    elif isinstance(question, PropQuestion):
        return {
            **base_data,
            "question_type": "prop",
            "outcome_type": question.outcome_type,
            "related_player_id": question.related_player.id if question.related_player else None,
            "related_player_name": question.related_player.name if question.related_player else None,
            "line": question.line,
        }
    
    # Player Stat Prediction Question
    elif isinstance(question, PlayerStatPredictionQuestion):
        return {
            **base_data,
            "question_type": "player_stat",
            "player_stat_id": question.player_stat.id,
            "stat_type": question.stat_type,
            "fixed_value": question.fixed_value,
            "current_leaders": question.current_leaders,
            "top_performers": question.top_performers,
        }
    
    # Head-to-Head Question
    elif isinstance(question, HeadToHeadQuestion):
        return {
            **base_data,
            "question_type": "head_to_head",
            "team1_id": question.team1.id,
            "team1_name": question.team1.name,
            "team2_id": question.team2.id,
            "team2_name": question.team2.name,
        }
    
    # In-Season Tournament Question
    elif isinstance(question, InSeasonTournamentQuestion):
        return {
            **base_data,
            "question_type": "ist",
            "prediction_type": question.prediction_type,
            "ist_group": question.ist_group,
            "is_tiebreaker": question.is_tiebreaker,
        }
    
    # NBA Finals Prediction Question
    elif isinstance(question, NBAFinalsPredictionQuestion):
        return {
            **base_data,
            "question_type": "nba_finals",
            "group_name": question.group_name,
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
    questions = Question.objects.filter(season=season).select_related(
        'season', 'award'
    ).prefetch_related('winners').order_by('id')
    
    # Get polymorphic instances (important!)
    questions = questions.select_subclasses()
    
    # Serialize each question
    serialized_questions = [serialize_question(q) for q in questions]
    
    # Get submission status
    submission_status = get_submission_status(season)
    
    return {
        "season_slug": season_slug,
        "submission_open": submission_status["is_open"],
        "submission_start_date": season.submission_start_date,
        "submission_end_date": season.submission_end_date,
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
            "question_type": answer.question.polymorphic_ctype.model if answer.question.polymorphic_ctype else "unknown",
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
    response=dict,
    summary="Get Submission Status",
    description="Check if submission window is open for a season"
)
def get_submission_window_status(request, season_slug: str):
    """
    Get detailed submission window status for a season.
    """
    season = get_object_or_404(Season, slug=season_slug)
    return get_submission_status(season)
