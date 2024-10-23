# predictions/urls.py

from django.urls import path, include
from django.contrib.auth import views as auth_views
from predictions.views.api_views import (get_teams_api, get_players_api, get_standings_api,
                                         get_user_predictions_api, get_api_leaderboard, latest_season_api,
                                         get_questions_api, submit_answers_api, get_ist_standings_api)
from predictions.views.user_views import (submit_predictions, view_predictions, home,
                                          view_leaderboard, what_if_view, profile_view, render_questions)

app_name = 'predictions'

predictions_patterns = [
    # Removing submit predictions for season opening
    # path('submit/<slug:season_slug>/', submit_predictions, name='submit_predictions'),
    path('view/<slug:season_slug>/', view_predictions, name='view_predictions'),
    # path('submit/questions/<slug:season_slug>/', render_questions, name='render_questions'),
]

user_patterns = [
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('profile/', profile_view, name='profile'),
]

api_patterns = [
    path('teams/', get_teams_api, name='get_teams_api'),
    path('players/', get_players_api, name='get_players_api'),
    path('questions/<slug:season_slug>/', get_questions_api, name='get_questions_api'),
    path('submit-answers/<slug:season_slug>/', submit_answers_api, name='submit_answers_api'),
    path('standings/<slug:season_slug>/', get_standings_api, name='get_standings_api'),
    path('ist-standings/<slug:season_slug>/', get_ist_standings_api, name='get_ist_standings_api'),
    path('user_predictions/<slug:season_slug>/', get_user_predictions_api, name='get_user_predictions_api'),
    path('leaderboard/<slug:season_slug>/', get_api_leaderboard, name='get_api_leaderboard'),
    path('latest_season/', latest_season_api, name='latest_season'),
]
urlpatterns = [
    path('', home, name='home'),
    # Add predictions URLs with the 'predictions/' prefix
    path('predictions/', include(predictions_patterns)),

    # Add user URLs with the 'user/' prefix
    path('user/', include(user_patterns)),

    path('api/', include(api_patterns)),

    path('leaderboard/<slug:season_slug>/', view_leaderboard, name='view_leaderboard'),
    path('what_if/<slug:season_slug>/', what_if_view, name='what_if_view'),

]
