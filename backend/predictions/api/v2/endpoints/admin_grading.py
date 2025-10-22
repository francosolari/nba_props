# File: predictions/api/v2/endpoints/admin_grading.py
"""
Admin Grading API Endpoints

Provides endpoints for:
- Viewing grading audit data with user points breakdown by category
- Manually marking answers as correct/incorrect
- Viewing answer submissions for grading review
- Triggering automated grading processes (wrapper for management commands)
"""

from ninja import Router
from ninja.security import django_auth
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q, Prefetch
from django.contrib.auth.models import User
from django.core.management import call_command
from typing import List, Optional
from datetime import datetime
import logging

from predictions.models import (
    Season, Question, Answer, UserStats,
    StandingPrediction, SuperlativeQuestion,
    InSeasonTournamentQuestion, PropQuestion,
    HeadToHeadQuestion, PlayerStatPredictionQuestion,
    NBAFinalsPredictionQuestion
)
from ..schemas.admin_grading import (
    GradingAuditResponse,
    UserGradingBreakdown,
    CategoryBreakdown,
    QuestionGradingDetail,
    ManualGradeRequest,
    ManualGradeResponse,
    GradingCommandRequest,
    GradingCommandResponse,
    AnswerReviewResponse,
    AnswerReviewItem,
    QuestionForGradingItem,
    QuestionsForGradingResponse,
    UpdateQuestionRequest,
    UpdateQuestionResponse
)

logger = logging.getLogger(__name__)

router = Router(tags=["Admin - Grading"])


def is_admin(request):
    """Check if user is admin"""
    return request.user.is_authenticated and (request.user.is_superuser or request.user.is_staff)


@router.get(
    "/audit/{season_slug}",
    response=GradingAuditResponse,
    summary="Get Grading Audit Data",
    description="Retrieve comprehensive grading breakdown by user and category for auditing purposes",
    auth=django_auth
)
def get_grading_audit(request, season_slug: str):
    """
    Get detailed grading audit for a season, showing points breakdown by category for each user.

    This endpoint is for admin auditing of the grading process. It shows:
    - Total points per user
    - Points breakdown by category (Awards, Props, Standings, IST, etc.)
    - Number of correct/incorrect/pending answers per category
    - Identification of finalized vs non-finalized questions
    """
    if not is_admin(request):
        return JsonResponse({"error": "Admin access required"}, status=403)

    # Get season
    if season_slug == "current":
        season = Season.objects.order_by('-end_date').first()
        if not season:
            return JsonResponse({"error": "No season found"}, status=404)
    else:
        season = get_object_or_404(Season, slug=season_slug)

    # Get all users with stats for this season
    user_stats = UserStats.objects.filter(season=season).select_related('user')

    users_breakdown = []

    for stat in user_stats:
        user = stat.user

        # Get all answers for this user in this season
        answers = Answer.objects.filter(
            user=user,
            question__season=season
        ).select_related('question', 'question__polymorphic_ctype')

        # Get standings predictions
        standing_preds = StandingPrediction.objects.filter(
            user=user,
            season=season
        )

        # Build category breakdown
        categories = {}

        # Group answers by question type
        for answer in answers:
            question = answer.question.get_real_instance()
            question_type = type(question).__name__

            # Determine category
            if isinstance(question, SuperlativeQuestion):
                category = "Awards/Superlatives"
            elif isinstance(question, InSeasonTournamentQuestion):
                category = "In-Season Tournament"
            elif question_type == "PropQuestion":
                category = "Props"
            elif question_type == "PlayerStatPredictionQuestion":
                category = "Player Stats"
            elif question_type == "HeadToHeadQuestion":
                category = "Head-to-Head"
            elif question_type == "NBAFinalsPredictionQuestion":
                category = "NBA Finals"
            else:
                category = "Other"

            if category not in categories:
                categories[category] = {
                    'category_name': category,
                    'total_points': 0,
                    'possible_points': 0,
                    'correct_count': 0,
                    'incorrect_count': 0,
                    'pending_count': 0,
                    'finalized_count': 0,
                    'non_finalized_count': 0,
                    'questions': []
                }

            cat = categories[category]
            cat['total_points'] += answer.points_earned or 0
            cat['possible_points'] += question.point_value or 0

            if answer.is_correct is True:
                cat['correct_count'] += 1
            elif answer.is_correct is False:
                cat['incorrect_count'] += 1
            else:
                cat['pending_count'] += 1

            # Check if question is finalized
            is_finalized = getattr(question, 'is_finalized', False)
            if is_finalized:
                cat['finalized_count'] += 1
            else:
                cat['non_finalized_count'] += 1

            cat['questions'].append({
                'question_id': question.id,
                'question_text': question.text,
                'question_type': question_type,
                'user_answer': answer.answer,
                'correct_answer': question.correct_answer,
                'is_correct': answer.is_correct,
                'points_earned': answer.points_earned or 0,
                'point_value': question.point_value or 0,
                'is_finalized': is_finalized,
                'submission_date': answer.submission_date.isoformat() if answer.submission_date else None
            })

        # Add standings category
        if standing_preds.exists():
            standings_points = standing_preds.aggregate(Sum('points'))['points__sum'] or 0
            standings_count = standing_preds.count()
            correct_standings = standing_preds.filter(points__gte=3).count()
            partial_standings = standing_preds.filter(points=1).count()
            incorrect_standings = standing_preds.filter(points=0).count()

            categories['Regular Season Standings'] = {
                'category_name': 'Regular Season Standings',
                'total_points': standings_points,
                'possible_points': standings_count * 3,  # Max 3 points per prediction
                'correct_count': correct_standings,
                'incorrect_count': incorrect_standings,
                'pending_count': 0,
                'finalized_count': standings_count,
                'non_finalized_count': 0,
                'questions': []  # Could expand this to show individual team predictions
            }

        users_breakdown.append({
            'user_id': user.id,
            'username': user.username,
            'display_name': f"{user.first_name} {user.last_name}" if user.first_name else user.username,
            'total_points': stat.points or 0,
            'categories': list(categories.values())
        })

    # Sort by total points descending
    users_breakdown.sort(key=lambda x: x['total_points'], reverse=True)

    return {
        'season_slug': season.slug,
        'season_year': season.year,
        'users': users_breakdown
    }


@router.get(
    "/answers/{season_slug}",
    response=AnswerReviewResponse,
    summary="Get Answers for Review",
    description="Get all answers for a season with filtering options for grading review",
    auth=django_auth
)
def get_answers_for_review(
    request,
    season_slug: str,
    question_id: Optional[int] = None,
    user_id: Optional[int] = None,
    is_correct: Optional[bool] = None,
    pending_only: bool = False
):
    """
    Get answers for grading review with optional filtering.
    """
    if not is_admin(request):
        return JsonResponse({"error": "Admin access required"}, status=403)

    # Get season
    if season_slug == "current":
        season = Season.objects.order_by('-end_date').first()
        if not season:
            return JsonResponse({"error": "No season found"}, status=404)
    else:
        season = get_object_or_404(Season, slug=season_slug)

    # Build query
    query = Q(question__season=season)

    if question_id:
        query &= Q(question_id=question_id)

    if user_id:
        query &= Q(user_id=user_id)

    if is_correct is not None:
        query &= Q(is_correct=is_correct)

    if pending_only:
        query &= Q(is_correct__isnull=True) | Q(question__correct_answer__isnull=True) | Q(question__correct_answer='')

    answers = Answer.objects.filter(query).select_related(
        'user', 'question', 'question__polymorphic_ctype'
    ).order_by('-submission_date')[:500]  # Limit to 500 for performance

    items = []
    for answer in answers:
        question = answer.question.get_real_instance()
        is_finalized = getattr(question, 'is_finalized', False)

        items.append({
            'answer_id': answer.id,
            'question_id': question.id,
            'question_text': question.text,
            'question_type': type(question).__name__,
            'user_id': answer.user.id,
            'username': answer.user.username,
            'user_answer': answer.answer,
            'correct_answer': question.correct_answer,
            'is_correct': answer.is_correct,
            'points_earned': answer.points_earned or 0,
            'point_value': question.point_value or 0,
            'is_finalized': is_finalized,
            'submission_date': answer.submission_date.isoformat() if answer.submission_date else None
        })

    return {
        'season_slug': season.slug,
        'total_count': len(items),
        'answers': items
    }


@router.post(
    "/grade-manual",
    response=ManualGradeResponse,
    summary="Manually Grade Answer",
    description="Manually mark an answer as correct or incorrect",
    auth=django_auth
)
def manual_grade_answer(request, payload: ManualGradeRequest):
    """
    Manually grade a specific answer by setting is_correct and points_earned.

    This is useful when automated grading fails or needs override.
    """
    if not is_admin(request):
        return JsonResponse({"error": "Admin access required"}, status=403)

    answer = get_object_or_404(Answer, id=payload.answer_id)
    question = answer.question.get_real_instance()

    # Update answer
    answer.is_correct = payload.is_correct

    if payload.points_override is not None:
        answer.points_earned = payload.points_override
    else:
        # Auto-calculate points based on is_correct and point_value
        answer.points_earned = question.point_value if payload.is_correct else 0

    answer.save()

    # Optionally update question's correct answer
    if payload.correct_answer:
        question.correct_answer = payload.correct_answer
        question.save()

    # Recalculate user stats for this season
    season = question.season
    user = answer.user

    # Sum all answer points for this user
    total_answer_points = Answer.objects.filter(
        user=user,
        question__season=season
    ).exclude(
        question__polymorphic_ctype__model='inseasontournamentquestion'
    ).aggregate(Sum('points_earned'))['points_earned__sum'] or 0

    # Sum standing prediction points
    total_standings_points = StandingPrediction.objects.filter(
        user=user,
        season=season
    ).aggregate(Sum('points'))['points__sum'] or 0

    total_points = total_answer_points + total_standings_points

    # Update UserStats
    user_stat, created = UserStats.objects.get_or_create(
        user=user,
        season=season,
        defaults={'points': total_points}
    )
    if not created:
        user_stat.points = total_points
        user_stat.save()

    logger.info(f"Admin {request.user.username} manually graded answer {answer.id} for user {user.username}")

    return {
        'success': True,
        'answer_id': answer.id,
        'is_correct': answer.is_correct,
        'points_earned': answer.points_earned,
        'user_total_points': total_points,
        'message': f"Answer graded successfully. User {user.username} now has {total_points} points."
    }


@router.post(
    "/run-grading-command",
    response=GradingCommandResponse,
    summary="Run Grading Management Command",
    description="Trigger automated grading commands (for local use only - will fail on production if NBA API is blocked)",
    auth=django_auth
)
def run_grading_command(request, payload: GradingCommandRequest):
    """
    Wrapper endpoint to trigger grading management commands.

    WARNING: This should only be used locally where NBA API access is available.
    On production servers, these commands may fail due to NBA API blocking.
    """
    if not is_admin(request):
        return JsonResponse({"error": "Admin access required"}, status=403)

    command = payload.command
    season_slug = payload.season_slug

    allowed_commands = [
        'grade_props_answers',
        'grade_standing_predictions',
        'grade_ist_predictions',
        'update_season_standings',
        'scrape_award_odds'
    ]

    if command not in allowed_commands:
        return JsonResponse({"error": f"Invalid command. Allowed: {allowed_commands}"}, status=400)

    try:
        # Run the command
        call_command(command, season_slug)

        logger.info(f"Admin {request.user.username} triggered {command} for season {season_slug}")

        return {
            'success': True,
            'command': command,
            'season_slug': season_slug,
            'message': f"Command {command} executed successfully for season {season_slug}",
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error running grading command {command}: {str(e)}")
        return JsonResponse({
            "error": f"Command failed: {str(e)}",
            "details": "This may fail on production if NBA API is blocked. Run locally instead."
        }, status=500)


@router.get(
    "/questions/{season_slug}",
    response=QuestionsForGradingResponse,
    summary="Get Questions for Grading",
    description="Get all questions for a season to set correct answers",
    auth=django_auth
)
def get_questions_for_grading(request, season_slug: str):
    """
    Get all questions for a season so admin can set correct answers.

    This is the main endpoint for the question grading interface where admins:
    - View all questions
    - See which have correct answers set
    - See submission counts
    - Update correct answers
    """
    if not is_admin(request):
        return JsonResponse({"error": "Admin access required"}, status=403)

    # Get season
    if season_slug == "current":
        season = Season.objects.order_by('-end_date').first()
        if not season:
            return JsonResponse({"error": "No season found"}, status=404)
    else:
        season = get_object_or_404(Season, slug=season_slug)

    # Get all questions for this season
    questions = Question.objects.filter(season=season).select_related('polymorphic_ctype')

    questions_list = []
    for question in questions:
        question_real = question.get_real_instance()
        question_type = type(question_real).__name__

        # Determine category
        if isinstance(question_real, SuperlativeQuestion):
            category = "Awards/Superlatives"
        elif isinstance(question_real, InSeasonTournamentQuestion):
            category = "In-Season Tournament"
        elif question_type == "PropQuestion":
            category = "Props"
        elif question_type == "PlayerStatPredictionQuestion":
            category = "Player Stats"
        elif question_type == "HeadToHeadQuestion":
            category = "Head-to-Head"
        elif question_type == "NBAFinalsPredictionQuestion":
            category = "NBA Finals"
        else:
            category = "Other"

        # Get submission count
        submission_count = Answer.objects.filter(question=question).count()

        # Check if correct answer is set
        has_correct_answer = bool(question_real.correct_answer and question_real.correct_answer.strip())

        # Check if finalized
        is_finalized = getattr(question_real, 'is_finalized', False)

        # Determine input type and choices based on question type
        input_type = 'text'  # default
        choices = None
        outcome_type = None
        line = None
        team1_name = None
        team2_name = None
        related_player_name = None

        if isinstance(question_real, PropQuestion):
            outcome_type = question_real.outcome_type
            line = question_real.line
            if question_real.related_player:
                related_player_name = question_real.related_player.name

            if outcome_type == 'yes_no':
                input_type = 'yes_no'
                choices = ['Yes', 'No']
            elif outcome_type == 'over_under':
                input_type = 'over_under'
                choices = ['Over', 'Under']

        elif isinstance(question_real, HeadToHeadQuestion):
            input_type = 'team_choice'
            team1_name = question_real.team1.name
            team2_name = question_real.team2.name
            choices = [team1_name, team2_name]

        elif isinstance(question_real, SuperlativeQuestion):
            input_type = 'player_search'
            # Optionally, we could provide top candidates from odds
            if question_real.current_leader:
                choices = [question_real.current_leader.name]
                if question_real.current_runner_up:
                    choices.append(question_real.current_runner_up.name)

        elif isinstance(question_real, PlayerStatPredictionQuestion):
            input_type = 'player_search'

        questions_list.append({
            'question_id': question.id,
            'question_text': question_real.text,
            'question_type': question_type,
            'category': category,
            'correct_answer': question_real.correct_answer or '',
            'point_value': question_real.point_value or 0,
            'is_finalized': is_finalized,
            'submission_count': submission_count,
            'has_correct_answer': has_correct_answer,
            'outcome_type': outcome_type,
            'line': line,
            'team1_name': team1_name,
            'team2_name': team2_name,
            'related_player_name': related_player_name,
            'input_type': input_type,
            'choices': choices
        })

    # Sort by category then by question text
    questions_list.sort(key=lambda x: (x['category'], x['question_text']))

    return {
        'season_slug': season.slug,
        'season_year': season.year,
        'total_questions': len(questions_list),
        'questions': questions_list
    }


@router.post(
    "/update-question",
    response=UpdateQuestionResponse,
    summary="Update Question Correct Answer",
    description="Set the correct answer for a question",
    auth=django_auth
)
def update_question_answer(request, payload: UpdateQuestionRequest):
    """
    Update a question's correct answer and optionally mark it as finalized.

    After setting the correct answer, admin can run grading commands to
    check all user submissions against this answer.
    """
    if not is_admin(request):
        return JsonResponse({"error": "Admin access required"}, status=403)

    question = get_object_or_404(Question, id=payload.question_id)
    question_real = question.get_real_instance()

    # Update correct answer
    question_real.correct_answer = payload.correct_answer

    # Update finalized status if provided
    if payload.is_finalized is not None and isinstance(question_real, SuperlativeQuestion):
        question_real.is_finalized = payload.is_finalized

    question_real.save()

    logger.info(
        f"Admin {request.user.username} updated question {payload.question_id} "
        f"with answer: {payload.correct_answer}"
    )

    return {
        'success': True,
        'question_id': payload.question_id,
        'correct_answer': question_real.correct_answer,
        'is_finalized': getattr(question_real, 'is_finalized', False),
        'message': f"Question updated successfully. Run grading to apply changes."
    }


@router.post(
    "/finalize-question/{question_id}",
    summary="Finalize Question",
    description="Mark a SuperlativeQuestion as finalized (locks the answer)",
    auth=django_auth
)
def finalize_question(request, question_id: int, correct_answer: Optional[str] = None):
    """
    Mark a question (typically SuperlativeQuestion) as finalized.

    This indicates the answer is official and will display a lock icon in the UI.
    """
    if not is_admin(request):
        return JsonResponse({"error": "Admin access required"}, status=403)

    question = get_object_or_404(Question, id=question_id)
    question_real = question.get_real_instance()

    # Update correct answer if provided
    if correct_answer:
        question_real.correct_answer = correct_answer

    # Mark as finalized if it's a SuperlativeQuestion
    if isinstance(question_real, SuperlativeQuestion):
        question_real.is_finalized = True
        question_real.save()

        logger.info(f"Admin {request.user.username} finalized question {question_id}")

        return {
            'success': True,
            'question_id': question_id,
            'is_finalized': True,
            'correct_answer': question_real.correct_answer,
            'message': f"Question {question_id} has been finalized"
        }
    else:
        # For other question types, just save the correct answer
        question_real.save()
        return {
            'success': True,
            'question_id': question_id,
            'is_finalized': False,
            'correct_answer': question_real.correct_answer,
            'message': f"Question {question_id} updated (not a finalizable type)"
        }
