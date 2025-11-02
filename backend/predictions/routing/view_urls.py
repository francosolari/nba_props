"""
View URLs - Web interface routes
File: nba_predictions/predictions/routing/view_urls.py

Enterprise pattern: Separated from API routes for maintainability.
These handle the React frontend mounting points and traditional Django views.
"""
from django.urls import path, include
from django.contrib.auth import views as auth_views
from predictions.views.user_views import (
    home, view_predictions, what_if_view,
    profile_view, view_ist_standings, user_leaderboard,
    submit_predictions, render_questions, submit_answers, leaderboard_page,
    leaderboard_detail_page, submit_predictions_view, admin_panel_view,
    admin_grading_panel_view, admin_dashboard_view, ist_center_view
)

app_name = 'predictions_views'

# Prediction-related view patterns
prediction_patterns = [
    path('view/<slug:season_slug>/', view_predictions, name='view_predictions'),
    path('submit/<slug:season_slug>/', submit_predictions, name='submit_predictions'),
    path('questions/<slug:season_slug>/', render_questions, name='questions'),
    path('submit-answers/', submit_answers, name='submit_answers'),
]

# Leaderboard and standings patterns
leaderboard_patterns = [
    path('user-leaderboard/<slug:season_slug>/', user_leaderboard, name='user_leaderboard'),
    path('ist-standings/<slug:season_slug>/', view_ist_standings, name='view_ist_standings'),
    path('what-if/<slug:season_slug>/', what_if_view, name='what_if_view'),
    path('leaderboard/<slug:season_slug>/', leaderboard_page, name='leaderboard_page'),
    path('leaderboard/<slug:season_slug>/detailed/', leaderboard_detail_page, name='leaderboard_detail_page'),
    path('ist/<slug:season_slug>/', ist_center_view, name='ist_center'),
]

# User authentication patterns
auth_patterns = [
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('profile/', profile_view, name='profile'),
]

# Main URL patterns for web interface
urlpatterns = [
    # Homepage
    path('', home, name='home'),

    # Prediction management
    path('predictions/', include(prediction_patterns)),

    # Leaderboards and standings
    path('', include(leaderboard_patterns)),

    # User management
    path('user/', include(auth_patterns)),

    # Submissions (new)
    path('submit/<slug:season_slug>/', submit_predictions_view, name='submit_predictions_view'),

    # Admin panels
    path('admin-panel/', admin_panel_view, name='admin_panel'),
    path('admin-grading/', admin_grading_panel_view, name='admin_grading'),
    path('admin-grading/<slug:season_slug>/', admin_grading_panel_view, name='admin_grading_season'),
    path('admin-dashboard/', admin_dashboard_view, name='admin_dashboard'),
    path('admin-dashboard/<slug:season_slug>/', admin_dashboard_view, name='admin_dashboard_season'),
]
