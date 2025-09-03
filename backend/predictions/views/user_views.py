from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.db.models import Sum
from django.views.decorators.http import require_http_methods
from django.forms import formset_factory
from django.contrib import messages
from predictions.models import Season, Prediction, StandingPrediction, Question, Answer, Team, RegularSeasonStandings
from predictions.forms import QuestionForm, PositionPredictionForm, UserProfileForm
import json


def home(request):
    """Homepage with a welcome message and user account creation form."""
    # If the user is authenticated, show the welcome message
    if request.user.is_authenticated:
        return render(request, 'home.html', {'user': request.user})

    # Show account creation form for new users
    form = UserCreationForm()

    return render(request, 'home.html', {'form': form})

@login_required
def profile_view(request):
    user = request.user

    # Handle form submission for user info update
    if request.method == 'POST':
        profile_form = UserProfileForm(request.POST, instance=user)
        if profile_form.is_valid():
            profile_form.save()
            messages.success(request, 'Your profile has been updated.')
            return redirect('profile')
    else:
        profile_form = UserProfileForm(instance=user)

    # Fetch existing predictions for the user, if any
    user_predictions = StandingPrediction.objects.filter(user=user)

    # Seasons for dropdown (latest first). Also determine current season.
    seasons = Season.objects.order_by('-start_date').only('slug', 'year', 'start_date', 'end_date')
    current_season = seasons.first() if seasons.exists() else None

    # Render the enhanced profile template
    seasons_csv = ",".join(seasons.values_list('slug', flat=True)) if seasons else ""
    return render(request, 'profile.html', {
        'profile_form': profile_form,
        'user_predictions': user_predictions,
        'seasons': seasons,
        'current_season': current_season,
        'seasons_csv': seasons_csv,
    })

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
def render_questions(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)
    return render(request, 'predictions/questions.html', {'season': season})

@login_required
def submit_answers(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            answers = data.get('answers', {})
            season_slug = data.get('season_slug')
            season = Season.objects.get(name=season_slug)
            user = request.user
        except Exception as e:
            return JsonResponse({'error': 'Invalid data provided.'}, status=400)

        for question_id, answer_value in answers.items():
            try:
                question = Question.objects.get(id=question_id, season=season)
                # Additional validation based on question_type
                Answer.objects.update_or_create(
                    user=user,
                    question=question,
                    season=season,
                    defaults={'answer': answer_value}
                )
            except Question.DoesNotExist:
                continue  # Or handle as needed

        return JsonResponse({'message': 'Answers submitted successfully.'}, status=200)
    else:
        return JsonResponse({'error': 'Invalid HTTP method.'}, status=405)


@login_required
def view_predictions(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)
    # Assuming you have a method to gather predictions and their corresponding answers
    predictions = Prediction.objects.filter(user=request.user, season=season)
    answers = Answer.objects.filter(user=request.user, question__season=season)

    context = {
        'season': season,
        'predictions': predictions,
        'answers': answers
    }

    return render(request, 'predictions/view_predictions.html', context)


# @login_required
# def view_leaderboard(request, season_slug):
#     season = get_object_or_404(Season, slug=season_slug)
#     # Assuming you have a method to calculate the leaderboard
#     context = {
#         'season': season,
#         # 'leaderboard': leaderboard,
#     }
#
#     return render(request, 'predictions/leaderboard.html', {
#         'season': season,
#         'primary_user': request.user if request.user.is_authenticated else None,
#     })
@login_required
def what_if_view(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)
    user_predictions = StandingPrediction.objects.filter(user=request.user, season=season)

    context = {
        'season': season,
        'user_predictions': list(user_predictions.values('team__id', 'predicted_position')),
    }

    return render(request, 'predictions/what_if_standings.html', context)

@login_required
def view_ist_standings(request, season_slug):
    """
    View to render the IST Standings page for a given season.
    """
    # Fetch the season based on the slug
    season = get_object_or_404(Season, slug=season_slug)

    # Render the template with the season slug passed to the frontend
    return render(request, 'predictions/ist_standings.html', {'season_slug': season.slug})


def user_leaderboard(request, season_slug):
    """
    View to display the user leaderboard based on their standing predictions for the regular season.
    """
    season = get_object_or_404(Season, slug=season_slug)

    # Fetch all predictions for the given season, annotating the total points per user
    user_points = (
        StandingPrediction.objects.filter(season=season)
        .values('user', 'user__first_name', 'user__last_name')  # Accessing first_name and last_name directly
        .annotate(total_points=Sum('points'))  # Summing the points for each user
        .order_by('-total_points')  # Sorting by total points in descending order
    )

    # Fetch the leaderboard for display
    leaderboard = []
    for entry in user_points:
        user = entry['user']  # This is the user ID
        total_points = entry['total_points']

        # Get the user's first name and last initial
        first_name = entry['user__first_name']
        last_name = entry['user__last_name']
        display_name = f"{first_name} {last_name[0]}." if first_name and last_name else f"{first_name} {last_name}"

        leaderboard.append({
            'user': display_name,  # Store the formatted name
            'total_points': total_points
        })

    return render(request, 'user_leaderboard.html', {
        'season_slug': season_slug,
        'leaderboard': leaderboard
    })


@login_required
def leaderboard_page(request, season_slug):
    """
    View to render the leaderboard page with user rankings and points.
    """
    season = get_object_or_404(Season, slug=season_slug)

    # Calculate user points and rankings
    leaderboard_data = (
        StandingPrediction.objects.filter(season=season)
        .values('user', 'user__username', 'user__first_name', 'user__last_name')
        .annotate(total_points=Sum('points'))
        .order_by('-total_points')
    )

    # Format the data for frontend display
    formatted_leaderboard = []
    for entry in leaderboard_data:
        user_info = {
            'username': entry['user__username'],
            'display_name': f"{entry['user__first_name']} {entry['user__last_name'][0]}." if entry[
                                                                                                 'user__first_name'] and
                                                                                             entry[
                                                                                                 'user__last_name'] else
            entry['user__username'],
            'points': entry['total_points'] or 0
        }
        formatted_leaderboard.append(user_info)

    return render(request, 'predictions/leaderboard_page.html', {
        'season': season,
        'leaderboard': formatted_leaderboard,
        'primary_user': request.user
    })


def leaderboard_detail_page(request, season_slug):
    """Render advanced leaderboard detail grid view.
    Reads optional query params: section, user (id) to pre-expand UI.
    """
    season = get_object_or_404(Season, slug=season_slug)
    initial_section = request.GET.get('section', 'standings')
    initial_user_id = request.GET.get('user')  # may be None

    return render(request, 'predictions/leaderboard_detail_page.html', {
        'season': season,
        'initial_section': initial_section,
        'initial_user_id': initial_user_id or '',
    })
