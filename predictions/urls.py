# """
# NBA Predictions URL Configuration
#
# This module defines all URL patterns for the NBA Predictions application,
# including both traditional Django views and the new Django Ninja API.
#
# URL Structure:
# - / - Homepage and user views
# - /predictions/ - Prediction submission and viewing
# - /user/ - Authentication and user management
# - /api/ - Legacy API (v1) for backward compatibility
# - /api/v2/ - Modern Django Ninja API with documentation
# """
#
# from django.urls import path, include
# from django.contrib.auth import views as auth_views
#
# # V1 API (Legacy) - Keep all existing imports for backward compatibility
# from predictions.views.api_views import (
#     get_teams_api, get_players_api, get_standings_api,
#     get_user_predictions_api, get_api_leaderboard, latest_season_api,
#     get_questions_api, submit_answers_api, get_ist_standings_api,
#     get_ist_leaderboard_api, get_user_answers_api
# )
#
# # V2 API (Django Ninja) - Import from the correct location
# from predictions.api.v2.api import api as api_v2
#
# # Traditional Django views - Remove unused imports
# from predictions.views.user_views import (
#     view_predictions, home, view_leaderboard, what_if_view,
#     profile_view, view_ist_standings, user_leaderboard
# )
#
# app_name = 'predictions'
#
# # ====================
# # PREDICTION VIEWS
# # ====================
#
# predictions_patterns = [
#     path('view/<slug:season_slug>/', view_predictions, name='view_predictions'),
#     path('ist-standings/<slug:season_slug>/', view_ist_standings, name='view_ist_standings'),
#     path('regular-leaderboard/<slug:season_slug>/', user_leaderboard, name='get_user_leaderboard'),
#     path('leaderboard/<slug:season_slug>/', view_leaderboard, name='view_leaderboard'),
# ]
#
# # ====================
# # USER AUTHENTICATION
# # ====================
#
# user_patterns = [
#     path('login/', auth_views.LoginView.as_view(), name='login'),
#     path('logout/', auth_views.LogoutView.as_view(), name='logout'),
#     path('profile/', profile_view, name='profile'),
# ]
#
# # ====================
# # API v1 (LEGACY)
# # ====================
# # Maintain existing API endpoints for backward compatibility
#
# api_v1_patterns = [
#     path('teams/', get_teams_api, name='get_teams_api'),
#     path('players/', get_players_api, name='get_players_api'),
#     path('questions/<slug:season_slug>/', get_questions_api, name='get_questions_api'),
#     path('submit-answers/<slug:season_slug>/', submit_answers_api, name='submit_answers_api'),
#     path('standings/<slug:season_slug>/', get_standings_api, name='get_standings_api'),
#     path('ist-standings/<slug:season_slug>/', get_ist_standings_api, name='get_ist_standings_api'),
#     path('user-predictions/<slug:season_slug>/', get_user_predictions_api, name='get_user_predictions_api'),
#     path('leaderboard/<slug:season_slug>/', get_api_leaderboard, name='get_api_leaderboard'),
#     path('latest_season/', latest_season_api, name='latest_season'),
#     path('ist-leaderboard/<slug:season_slug>/', get_ist_leaderboard_api, name='get_ist_leaderboard'),
#     path('user-answers/<str:identifier>/', get_user_answers_api, name='get_user_answers'),
# ]
#
# # ====================
# # MAIN URL PATTERNS
# # ====================
#
# urlpatterns = [
#     # Homepage and core views
#     path('', home, name='home'),
#
#     # Prediction-related views
#     path('predictions/', include(predictions_patterns)),
#
#     # User authentication and management
#     path('user/', include(user_patterns)),
#
#     # API VERSIONING - Industry Standard Approach
#     # Multiple paths for different use cases:
#
#     # 1. Default API route (points to v1 for backward compatibility)
#     path('api/', include(api_v1_patterns)),
#
#     # 2. Explicit v1 API route (legacy will be deprecated)
#     path('api/v1/', include(api_v1_patterns)),
#
#     # 3. Modern v2 API route (Django Ninja with auto-documentation)
#     path('api/v2/', api_v2.urls),
#     # path('api/v2/', include((api_v2.urls, 'api-v2'), namespace='api-v2')),
#
#
#     # Additional view patterns
#     path('leaderboard/<slug:season_slug>/', view_leaderboard, name='view_leaderboard'),
#     path('what_if/<slug:season_slug>/', what_if_view, name='what_if_view'),
# ]