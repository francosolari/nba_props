from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.forms import formset_factory
from .models import Season, Prediction, StandingPrediction, Question, Answer, Team, RegularSeasonStandings
from .forms import QuestionForm, PositionPredictionForm
import json
# Create your views here.



def index(request):
    return HttpResponse("Hello, world. You're at the predictions index.")


@login_required
@require_http_methods(["GET"])
def get_teams_api(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)
    teams = Team.objects.all()  # Optionally filter by season if needed
    team_data = [
        {
            'id': team.id,
            'name': team.name,
            'conference': team.conference,
            # 'logo': team.logo.url if team.logo else ''  # Ensure logo exists
        } for team in teams
    ]
    return JsonResponse({'teams': team_data})


@login_required
@require_http_methods(["GET"])
def get_standings_api(request, season_slug):
    """
    API endpoint to retrieve Regular Season Standings for the prior season,
    sorted by position in ascending order and grouped by conference.

    URL: /api/standings/<season_slug>/
    """
    # Step 1: Get the prior season based on the slug
    season = get_object_or_404(Season, slug=season_slug)

    # Step 2: Fetch Regular Season Standings for the prior season
    standings = RegularSeasonStandings.objects.all().filter(season=season)
    # Step 3: Prepare the data grouped by conference
    data = {
        'east': [],
        'west': []
    }

    for standing in standings:
        team = standing.team
        entry = {
            'id': team.id,
            'name': team.name,
            'conference': team.conference,
            'wins': standing.wins,
            'losses': standing.losses,
            'position': standing.position
        }
        conference_key = team.conference.lower()
        if conference_key in data:
            data[conference_key].append(entry)
        else:
            # Handle unexpected conference values
            data.setdefault(conference_key, []).append(entry)

    return JsonResponse(data, status=200)

@login_required
@require_http_methods(["GET"])
def get_user_predictions_api(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)
    predictions = StandingPrediction.objects.filter(user=request.user, season=season)

    # Prepare the data for response
    predictions_data = [
        {
            'team_id': pred.team.id,
            'team_name': pred.team.name,
            'predicted_position': pred.predicted_position,
        }
        for pred in predictions
    ]

    return JsonResponse({'predictions': predictions_data}, status=200)

@login_required
def submit_predictions(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)

    if request.method == 'POST':
        try:
            predictions_data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)

        for prediction in predictions_data:
            team_id = prediction.get('id')
            position = prediction.get('position')

            if team_id is None or position is None:
                return JsonResponse({'error': 'Missing team ID or position.'}, status=400)

            try:
                team = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                return JsonResponse({'error': f"Team with ID {team_id} does not exist."}, status=400)

            StandingPrediction.objects.update_or_create(
                user=request.user,
                team=team,
                season=season,
                defaults={'predicted_position': position}  # Use the correct field
            )

        return JsonResponse({'message': 'Predictions saved successfully.'}, status=200)

    # For GET requests, render the HTML template
    return render(request, 'predictions/predictions_nodejs.html', {'season': season})


@login_required
def view_predictions(request, season_id):
    season = get_object_or_404(Season, pk=season_id)
    # Assuming you have a method to gather predictions and their corresponding answers
    predictions = Prediction.objects.filter(user=request.user, season=season)
    answers = Answer.objects.filter(user=request.user, question__season=season)

    context = {
        'season': season,
        'predictions': predictions,
        'answers': answers
    }

    return render(request, 'predictions/view_predictions.html', context)


@login_required
def view_leaderboard(request, season_id):
    season = get_object_or_404(Season, pk=season_id)
    # Assuming you have a method to calculate the leaderboard
    leaderboard = calculate_leaderboard(season)

    context = {
        'season': season,
        'leaderboard': leaderboard,
    }

    return render(request, 'predictions/view_leaderboard.html', context)


# Utility function to calculate leaderboard (placeholder, implement your logic here)
def calculate_leaderboard(season):
    # This function should calculate the points for each user based on their predictions and actual outcomes
    # Return a sorted list of tuples (user, points) representing the leaderboard
    pass
