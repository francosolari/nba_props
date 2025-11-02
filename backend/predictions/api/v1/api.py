"""
API v1 URLs - REST API endpoints
Enterprise pattern: API routes separated by version
"""
from django.urls import path
from predictions.views import api_views

app_name = 'api_v1'

urlpatterns = [
    # Core data endpoints
    path('teams/', api_views.get_all_teams, name='teams'),
    path('players/', api_views.get_all_players, name='players'),
    path('standings/<str:season_slug>/', api_views.get_regular_season_standings, name='standings'),
    path('standings/ist/<str:season_slug>/', api_views.get_ist_standings, name='ist_standings'),

    # User data endpoints
    path('leaderboard/<str:season_slug>/', api_views.get_leaderboard_temp, name='leaderboard'),
    path('latest-season/', api_views.get_latest_season_temp, name='latest_season'),

    # Health check
    path('health/', api_views.health_check, name='health_check'),
]