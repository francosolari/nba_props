"""
API v1 URLs - Legacy REST API endpoints
File: nba_predictions/predictions/api/v1/urls.py

This maintains backward compatibility while organizing the API properly.
All existing endpoints are preserved with the same functionality.
"""
from django.urls import path
from predictions.views.api_views import (
    get_teams_api, get_players_api, get_standings_api,
    get_user_predictions_api, get_api_leaderboard, latest_season_api,
    get_questions_api, submit_answers_api, get_ist_standings_api,
    get_ist_leaderboard_api, get_user_answers_api
)

# app_name = 'api_v1'

urlpatterns = [
    # Core data endpoints
    path('teams/', get_teams_api, name='teams'),
    path('players/', get_players_api, name='players'),

    # Season and standings
    path('standings/<slug:season_slug>/', get_standings_api, name='standings'),
    path('ist-standings/<slug:season_slug>/', get_ist_standings_api, name='ist_standings'),
    path('latest_season/', latest_season_api, name='latest_season'),

    # User predictions and leaderboards
    path('user-predictions/<slug:season_slug>/', get_user_predictions_api, name='user_predictions'),
    path('leaderboard/<slug:season_slug>/', get_api_leaderboard, name='leaderboard'),
    path('ist-leaderboard/<slug:season_slug>/', get_ist_leaderboard_api, name='ist_leaderboard'),

    # Questions and answers
    path('questions/<slug:season_slug>/', get_questions_api, name='questions'),
    path('submit-answers/<slug:season_slug>/', submit_answers_api, name='submit_answers'),
    path('user-answers/<str:identifier>/', get_user_answers_api, name='user_answers'),
]