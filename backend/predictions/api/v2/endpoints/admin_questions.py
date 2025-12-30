# File: backend/predictions/api/v2/endpoints/admin_questions.py
"""
Admin endpoints for question management (CRUD operations).
Protected by @admin_required decorator - only accessible to authorized users.
"""

from ninja import Router
from django.shortcuts import get_object_or_404
from django.db import transaction
from typing import List
from predictions.models import (
    Season, Question, Award, Player, Team, PlayerStat,
    SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion,
    HeadToHeadQuestion, InSeasonTournamentQuestion, NBAFinalsPredictionQuestion
)
from predictions.api.v2.schemas import (
    SuperlativeQuestionCreateSchema,
    PropQuestionCreateSchema,
    PlayerStatPredictionQuestionCreateSchema,
    HeadToHeadQuestionCreateSchema,
    InSeasonTournamentQuestionCreateSchema,
    NBAFinalsPredictionQuestionCreateSchema,
    QuestionUpdateSchema,
    QuestionReorderSchema,
    QuestionDeleteResponseSchema,
    QuestionSchema,
)
from predictions.api.v2.utils import admin_required
from predictions.api.v2.endpoints.user_submissions import (
    build_questions_with_real_map,
    serialize_question,
)
from ninja.errors import HttpError


router = Router(tags=["Admin - Questions"])


@router.get(
    "/seasons/{season_slug}/questions",
    response=List[QuestionSchema],
    summary="[Admin] List All Questions",
    description="Get all questions for a season (admin view with full details)"
)
@admin_required
def admin_list_questions(request, season_slug: str):
    """
    List all questions for a season with full admin details.
    """
    season = get_object_or_404(Season, slug=season_slug)
    
    questions, real_questions_map = build_questions_with_real_map(season)
    
    return [serialize_question(q, real_questions_map=real_questions_map) for q in questions]


@router.post(
    "/questions/superlative",
    response=dict,
    summary="[Admin] Create Superlative Question",
    description="Create a new superlative (award) question"
)
@admin_required
def create_superlative_question(request, payload: SuperlativeQuestionCreateSchema):
    """
    Create a new superlative question.
    """
    try:
        season = get_object_or_404(Season, slug=payload.season_slug)
        award = get_object_or_404(Award, id=payload.award_id)
        
        question = SuperlativeQuestion.objects.create(
            season=season,
            text=payload.text,
            point_value=payload.point_value,
            award=award,
        )
        
        return {
            "status": "success",
            "message": "Superlative question created successfully",
            "question": serialize_question(question)
        }
    except Exception as e:
        raise HttpError(400, f"Error creating question: {str(e)}")


@router.post(
    "/questions/prop",
    response=dict,
    summary="[Admin] Create Prop Question",
    description="Create a new prop (over/under or yes/no) question"
)
@admin_required
def create_prop_question(request, payload: PropQuestionCreateSchema):
    """
    Create a new prop question.
    """
    try:
        season = get_object_or_404(Season, slug=payload.season_slug)
        related_player = None
        if payload.related_player_id:
            related_player = get_object_or_404(Player, id=payload.related_player_id)
        
        question = PropQuestion.objects.create(
            season=season,
            text=payload.text,
            point_value=payload.point_value,
            outcome_type=payload.outcome_type,
            related_player=related_player,
            line=payload.line,
        )
        
        return {
            "status": "success",
            "message": "Prop question created successfully",
            "question": serialize_question(question)
        }
    except Exception as e:
        raise HttpError(400, f"Error creating question: {str(e)}")


@router.post(
    "/questions/player-stat",
    response=dict,
    summary="[Admin] Create Player Stat Question",
    description="Create a new player stat prediction question"
)
@admin_required
def create_player_stat_question(request, payload: PlayerStatPredictionQuestionCreateSchema):
    """
    Create a new player stat prediction question.
    """
    try:
        season = get_object_or_404(Season, slug=payload.season_slug)
        player_stat = get_object_or_404(PlayerStat, id=payload.player_stat_id)
        
        question = PlayerStatPredictionQuestion.objects.create(
            season=season,
            text=payload.text,
            point_value=payload.point_value,
            player_stat=player_stat,
            stat_type=payload.stat_type,
            fixed_value=payload.fixed_value,
        )
        
        return {
            "status": "success",
            "message": "Player stat question created successfully",
            "question": serialize_question(question)
        }
    except Exception as e:
        raise HttpError(400, f"Error creating question: {str(e)}")


@router.post(
    "/questions/head-to-head",
    response=dict,
    summary="[Admin] Create Head-to-Head Question",
    description="Create a new head-to-head team comparison question"
)
@admin_required
def create_head_to_head_question(request, payload: HeadToHeadQuestionCreateSchema):
    """
    Create a new head-to-head question.
    """
    try:
        season = get_object_or_404(Season, slug=payload.season_slug)
        team1 = get_object_or_404(Team, id=payload.team1_id)
        team2 = get_object_or_404(Team, id=payload.team2_id)
        
        question = HeadToHeadQuestion.objects.create(
            season=season,
            text=payload.text,
            point_value=payload.point_value,
            team1=team1,
            team2=team2,
        )
        
        return {
            "status": "success",
            "message": "Head-to-head question created successfully",
            "question": serialize_question(question)
        }
    except Exception as e:
        raise HttpError(400, f"Error creating question: {str(e)}")


@router.post(
    "/questions/ist",
    response=dict,
    summary="[Admin] Create IST Question",
    description="Create a new In-Season Tournament question"
)
@admin_required
def create_ist_question(request, payload: InSeasonTournamentQuestionCreateSchema):
    """
    Create a new In-Season Tournament question.
    """
    try:
        season = get_object_or_404(Season, slug=payload.season_slug)
        
        question = InSeasonTournamentQuestion.objects.create(
            season=season,
            text=payload.text,
            point_value=payload.point_value,
            prediction_type=payload.prediction_type,
            ist_group=payload.ist_group,
            is_tiebreaker=payload.is_tiebreaker,
        )
        
        return {
            "status": "success",
            "message": "IST question created successfully",
            "question": serialize_question(question)
        }
    except Exception as e:
        raise HttpError(400, f"Error creating question: {str(e)}")


@router.post(
    "/questions/nba-finals",
    response=dict,
    summary="[Admin] Create NBA Finals Question",
    description="Create a new NBA Finals prediction question"
)
@admin_required
def create_nba_finals_question(request, payload: NBAFinalsPredictionQuestionCreateSchema):
    """
    Create a new NBA Finals question.
    """
    try:
        season = get_object_or_404(Season, slug=payload.season_slug)
        
        question = NBAFinalsPredictionQuestion.objects.create(
            season=season,
            text=payload.text,
            point_value=payload.point_value,
            group_name=payload.group_name,
        )
        
        return {
            "status": "success",
            "message": "NBA Finals question created successfully",
            "question": serialize_question(question)
        }
    except Exception as e:
        raise HttpError(400, f"Error creating question: {str(e)}")


@router.put(
    "/questions/{question_id}",
    response=dict,
    summary="[Admin] Update Question",
    description="Update an existing question's properties including type-specific fields"
)
@admin_required
def update_question(request, question_id: int, payload: QuestionUpdateSchema):
    """
    Update an existing question, including type-specific fields.
    """
    try:
        question = get_object_or_404(Question, id=question_id)
        real_question = question.get_real_instance()

        # Update common fields
        if payload.text is not None:
            real_question.text = payload.text
        if payload.point_value is not None:
            real_question.point_value = payload.point_value

        # Update type-specific fields
        question_type = real_question.__class__.__name__

        if question_type == "SuperlativeQuestion":
            if payload.award_id is not None:
                award = get_object_or_404(Award, id=payload.award_id)
                real_question.award = award

        elif question_type == "PropQuestion":
            if payload.outcome_type is not None:
                real_question.outcome_type = payload.outcome_type
            if payload.related_player_id is not None:
                player = get_object_or_404(Player, id=payload.related_player_id)
                real_question.related_player = player
            elif hasattr(payload, 'related_player_id') and payload.related_player_id is None:
                # Explicitly set to None if provided as null
                real_question.related_player = None
            if payload.line is not None:
                real_question.line = payload.line
            elif hasattr(payload, 'line') and payload.line is None:
                # Explicitly set to None if provided as null
                real_question.line = None

        elif question_type == "PlayerStatPredictionQuestion":
            if payload.player_stat_id is not None:
                player_stat = get_object_or_404(PlayerStat, id=payload.player_stat_id)
                real_question.player_stat = player_stat
            if payload.stat_type is not None:
                real_question.stat_type = payload.stat_type
            if payload.fixed_value is not None:
                real_question.fixed_value = payload.fixed_value
            elif hasattr(payload, 'fixed_value') and payload.fixed_value is None:
                real_question.fixed_value = None

        elif question_type == "HeadToHeadQuestion":
            if payload.team1_id is not None:
                team1 = get_object_or_404(Team, id=payload.team1_id)
                real_question.team1 = team1
            if payload.team2_id is not None:
                team2 = get_object_or_404(Team, id=payload.team2_id)
                real_question.team2 = team2

        elif question_type == "InSeasonTournamentQuestion":
            if payload.prediction_type is not None:
                real_question.prediction_type = payload.prediction_type
            if payload.ist_group is not None:
                real_question.ist_group = payload.ist_group
            elif hasattr(payload, 'ist_group') and payload.ist_group is None:
                real_question.ist_group = None
            if payload.is_tiebreaker is not None:
                real_question.is_tiebreaker = payload.is_tiebreaker

        elif question_type == "NBAFinalsPredictionQuestion":
            if payload.group_name is not None:
                real_question.group_name = payload.group_name
            elif hasattr(payload, 'group_name') and payload.group_name is None:
                real_question.group_name = None

        real_question.save()

        # Refresh from database to get latest state
        question = Question.objects.get(id=question_id)
        question = question.get_real_instance()

        return {
            "status": "success",
            "message": "Question updated successfully",
            "question": serialize_question(question)
        }
    except Exception as e:
        raise HttpError(400, f"Error updating question: {str(e)}")


@router.delete(
    "/questions/{question_id}",
    response=QuestionDeleteResponseSchema,
    summary="[Admin] Delete Question",
    description="Delete a question (caution: also deletes all associated answers)"
)
@admin_required
def delete_question(request, question_id: int):
    """
    Delete a question and all associated answers.
    """
    try:
        question = get_object_or_404(Question, id=question_id)
        question_text = question.text
        
        with transaction.atomic():
            question.delete()
        
        return {
            "status": "success",
            "message": f"Question '{question_text}' deleted successfully",
            "deleted_id": question_id
        }
    except Exception as e:
        raise HttpError(400, f"Error deleting question: {str(e)}")


@router.post(
    "/questions/reorder",
    response=dict,
    summary="[Admin] Reorder Questions",
    description="Reorder questions for a season (for display purposes)"
)
@admin_required
def reorder_questions(request, payload: QuestionReorderSchema):
    """
    Reorder questions (future enhancement - requires order field in model).
    For now, this is a placeholder that acknowledges the request.
    """
    # Note: Full implementation would require adding an 'order' field to Question model
    # and updating the database schema. For now, we'll return success.
    
    return {
        "status": "success",
        "message": "Question reordering acknowledged (full implementation pending order field)",
        "question_ids": payload.question_ids
    }


@router.get(
    "/reference-data/awards",
    response=List[dict],
    summary="[Admin] Get Available Awards",
    description="Get list of available awards for superlative questions"
)
@admin_required
def get_awards(request):
    """
    Get all available awards for creating superlative questions.
    """
    awards = Award.objects.all()
    return [
        {
            "id": award.id,
            "name": award.name,
        }
        for award in awards
    ]
