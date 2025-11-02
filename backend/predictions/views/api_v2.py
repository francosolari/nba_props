"""
NBA Predictions API v2 - Django Ninja Implementation
Modern, fast, and type-safe API with automatic documentation.
"""

from typing import List, Optional, Dict, Any
from ninja import NinjaAPI, Schema
from ninja.security import django_auth
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Sum
from predictions.models import (
    Season, Player, Team, RegularSeasonStandings,
    InSeasonTournamentStandings, StandingPrediction,
    Question, Answer, UserStats, InSeasonTournamentQuestion
)

# Create the API instance with metadata
api = NinjaAPI(
    title="NBA Predictions API v2",
    version="2.0.0",
    description="Modern, type-safe API for NBA predictions and standings",
    docs_url="/docs/",  # Available at /api/v2/docs/
)

# Pydantic Schemas for request/response validation
class PlayerSchema(Schema):
    id: int
    name: str

class TeamSchema(Schema):
    id: int
    name: str
    conference: str

class StandingSchema(Schema):
    id: int
    name: str
    conference: str
    wins: int
    losses: int
    position: int
    win_percentage: float

class UserDisplaySchema(Schema):
    id: int
    username: str
    first_name: str
    last_name: str
    display_name: str

class LeaderboardEntrySchema(Schema):
    user: UserDisplaySchema
    points: int

class PredictionSchema(Schema):
    user: str
    team_id: int
    team_name: str
    team_conference: str
    predicted_position: int
    points: int

class AnswerSubmissionSchema(Schema):
    question: int
    answer: str

class AnswersRequestSchema(Schema):
    answers: List[AnswerSubmissionSchema]

# API Endpoints with improved error handling and documentation

@api.get("/players", response=Dict[str, List[PlayerSchema]], tags=["Players"])
def get_players(request):
    """
    Retrieve all NBA players.

    Returns a list of all players with their ID and name.
    """
    players = Player.objects.all().values('id', 'name')
    return {'players': list(players)}

@api.get("/teams", response=Dict[str, List[TeamSchema]], tags=["Teams"])
def get_teams(request):
    """
    Retrieve all NBA teams with conference information.

    Returns teams with ID, name, and conference affiliation.
    """
    teams = Team.objects.all()
    team_data = [
        {
            'id': team.id,
            'name': team.name,
            'conference': team.conference,
        } for team in teams
    ]
    return {'teams': team_data}

@api.get("/standings/{season_slug}", tags=["Standings"])
def get_standings(request, season_slug: str):
    """
    Get Regular Season Standings for a specific season.

    Args:
        season_slug: Season identifier (or 'current' for latest season)

    Returns standings grouped by conference (East/West).
    """
    if season_slug == "current":
        season = Season.objects.order_by('-start_date').first()
        if not season:
            return {"error": "Could not find the latest season"}
    else:
        season = get_object_or_404(Season, slug=season_slug)

    standings = RegularSeasonStandings.objects.filter(
        season=season
    ).order_by('team__conference', 'position')

    data = {'east': [], 'west': []}

    for standing in standings:
        team = standing.team
        entry = {
            'id': team.id,
            'name': team.name,
            'conference': team.conference,
            'wins': standing.wins,
            'losses': standing.losses,
            'position': standing.position,
            'win_percentage': standing.win_percentage
        }
        conference_key = team.conference.lower()
        if conference_key in data:
            data[conference_key].append(entry)

    return data

@api.get("/leaderboard/{season_slug}", response=Dict[str, List[LeaderboardEntrySchema]], tags=["Leaderboard"])
def get_leaderboard(request, season_slug: str):
    """
    Get user leaderboard for a specific season.

    Args:
        season_slug: Season identifier (or 'current' for latest season)

    Returns top users ranked by points.
    """
    if season_slug == "current":
        season = Season.objects.order_by('-end_date').first()
        if not season:
            return {"error": "Could not find the latest season"}
    else:
        season = get_object_or_404(Season, slug=season_slug)

    top_users = UserStats.objects.filter(season=season).order_by('-points')

    leaderboard_data = []
    for stat in top_users:
        user_data = {
            'id': stat.user.id,
            'username': stat.user.username,
            'first_name': stat.user.first_name,
            'last_name': stat.user.last_name,
            'display_name': f"{stat.user.first_name} {stat.user.last_name[0]}" if stat.user.last_name else stat.user.first_name,
        }
        leaderboard_data.append({
            'user': user_data,
            'points': stat.points,
        })

    return {'top_users': leaderboard_data}

@api.get("/user-predictions/{season_slug}", response=Dict[str, List[PredictionSchema]], tags=["Predictions"])
def get_user_predictions(request, season_slug: str, username: Optional[str] = None):
    """
    Get user predictions for a specific season.

    Args:
        season_slug: Season identifier (or 'current' for latest season)
        username: Optional username filter

    Returns user predictions for standings.
    """
    if season_slug == "current":
        season = Season.objects.order_by('-start_date').first()
        if not season:
            return {"error": "Could not find the latest season"}
    else:
        season = get_object_or_404(Season, slug=season_slug)

    if username:
        user = get_object_or_404(User, username=username)
        predictions = StandingPrediction.objects.filter(season=season, user=user)
    else:
        predictions = StandingPrediction.objects.filter(season=season)

    predictions_data = [
        {
            'user': pred.user.username,
            'team_id': pred.team.id,
            'team_name': pred.team.name,
            'team_conference': pred.team.conference,
            'predicted_position': pred.predicted_position,
            'points': pred.points,
        }
        for pred in predictions
    ]

    return {'predictions': predictions_data}

@api.get("/latest-season", tags=["Seasons"])
def get_latest_season(request):
    """Get the slug of the most recent season."""
    latest_season = Season.objects.order_by('-end_date').first()
    return {'slug': latest_season.slug if latest_season else None}

@api.post("/submit-answers/{season_slug}", auth=django_auth, tags=["Answers"])
def submit_answers(request, season_slug: str, data: AnswersRequestSchema):
    """
    Submit answers to questions for a season.

    Requires user authentication.
    Processes multiple answers atomically.
    """
    errors = {}

    with transaction.atomic():
        for answer_data in data.answers:
            question_id = answer_data.question
            user_answer = answer_data.answer

            try:
                question = get_object_or_404(Question, id=question_id, season__slug=season_slug)

                Answer.objects.update_or_create(
                    user=request.user,
                    question=question,
                    defaults={'answer': user_answer}
                )
            except Exception as e:
                errors[str(question_id)] = str(e)

    if errors:
        return {'status': 'error', 'errors': errors}

    return {'status': 'success', 'message': 'Answers submitted successfully'}

# Add more endpoints as needed...