"""
Homepage API Endpoints

This module handles all homepage-related API endpoints including:
- Random predictions for ticker
- Random props/questions for ticker  
- Combined homepage data (mini leaderboard + standings)

Endpoints:
- GET /random-predictions - Get random user predictions for ticker
- GET /random-props - Get random props/questions for ticker
- GET /data - Get all homepage data in one call
"""

import random
from ninja import Router
from django.http import JsonResponse

from predictions.models import (
    Prediction, Answer, Season, UserStats,
    RegularSeasonStandings
)
from predictions.api.v2.schemas import (
    RandomPredictionsResponseSchema, RandomPropsResponseSchema,
    HomepageDataResponseSchema, ErrorSchema
)

# Create router for homepage endpoints
router = Router(tags=["Homepage"])


@router.get(
    "/random-predictions",
    response={200: RandomPredictionsResponseSchema, 500: ErrorSchema},
    summary="Get Random Predictions",
    description="""
    Retrieve random user predictions for the homepage ticker.

    Returns 10 random predictions from the current season with formatted
    messages suitable for display in a ticker/carousel format.
    """
)
def get_random_predictions(request):
    """Get random user predictions for the ticker"""
    try:
        # Get random predictions with user info
        predictions = Prediction.objects.select_related('user', 'user__userprofile').filter(
            season=Season.objects.get(is_current=True)
        ).order_by('?')[:10]  # Get 10 random predictions

        ticker_items = []
        for pred in predictions:
            display_name = getattr(pred.user.userprofile, 'display_name', pred.user.username)

            # Create ticker message based on prediction type
            if hasattr(pred, 'standingprediction'):
                standing_pred = pred.standingprediction
                message = f"{display_name} predicts {standing_pred.team.name} will finish #{standing_pred.predicted_position}"
            elif hasattr(pred, 'playoffprediction'):
                playoff_pred = pred.playoffprediction
                message = f"{display_name} predicts {playoff_pred.team.name} will make the playoffs"
            else:
                message = f"{display_name} made a prediction"

            ticker_items.append({
                'message': message,
                'user': display_name,
                'type': 'prediction'
            })

        return {'ticker_items': ticker_items}

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@router.get(
    "/random-props",
    response={200: RandomPropsResponseSchema, 500: ErrorSchema},
    summary="Get Random Props",
    description="""
    Retrieve random user answers to props/questions for the homepage ticker.

    Returns 10 random answers with formatted messages suitable for 
    display in a ticker/carousel format.
    """
)
def get_random_props(request):
    """Get random props/questions for the ticker"""
    try:
        # Get random answers with their questions
        answers = Answer.objects.select_related('user', 'user__userprofile').order_by('?')[:10]

        ticker_items = []
        for answer in answers:
            display_name = getattr(answer.user.userprofile, 'display_name', answer.user.username)

            # Create different message formats
            message_formats = [
                f"{display_name} says {answer.question.question_text}: {answer.answer_text}",
                f"'{answer.answer_text}' - {display_name} on {answer.question.question_text}",
                f"{display_name}: {answer.answer_text} ({answer.question.question_text})"
            ]

            ticker_items.append({
                'message': random.choice(message_formats),
                'user': display_name,
                'type': 'prop',
                'question': answer.question.question_text,
                'answer': answer.answer_text
            })

        return {'ticker_items': ticker_items}

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@router.get(
    "/data",
    response={200: HomepageDataResponseSchema, 500: ErrorSchema},
    summary="Get Homepage Data",
    description="""
    Get all homepage data in a single optimized call.

    Returns:
    - Mini leaderboard (top 5 users)
    - Mini standings (top 3 from each conference)

    This endpoint combines multiple data sources to minimize API calls
    for the homepage.
    """
)
def get_homepage_data(request):
    """Get all homepage data in one call"""
    try:
        current_season = Season.objects.get(is_current=True)

        # Mini leaderboard (top 5)
        top_users = UserStats.objects.filter(
            season=current_season
        ).select_related('user', 'user__userprofile').order_by('-total_points')[:5]

        mini_leaderboard = []
        for i, user_stat in enumerate(top_users, 1):
            display_name = getattr(user_stat.user.userprofile, 'display_name', user_stat.user.username)
            mini_leaderboard.append({
                'rank': i,
                'user': {
                    'username': user_stat.user.username,
                    'display_name': display_name
                },
                'points': user_stat.total_points
            })

        # Mini standings (top 3 from each conference)
        east_standings = RegularSeasonStandings.objects.filter(
            season=current_season,
            team__conference='Eastern'
        ).select_related('team').order_by('position')[:3]

        west_standings = RegularSeasonStandings.objects.filter(
            season=current_season,
            team__conference='Western'
        ).select_related('team').order_by('position')[:3]

        mini_standings = {
            'eastern': [
                {
                    'team': standing.team.name,
                    'wins': standing.wins,
                    'losses': standing.losses,
                    'position': standing.position
                }
                for standing in east_standings
            ],
            'western': [
                {
                    'team': standing.team.name,
                    'wins': standing.wins,
                    'losses': standing.losses,
                    'position': standing.position
                }
                for standing in west_standings
            ]
        }

        return {
            'mini_leaderboard': mini_leaderboard,
            'mini_standings': mini_standings
        }

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)