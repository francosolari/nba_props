import logging

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.db import transaction
from django.db.models import Sum
from django.forms import formset_factory
from predictions.models import (Season, Prediction, StandingPrediction, Player,
                                Question, Answer, Team, RegularSeasonStandings,
                                InSeasonTournamentStandings, InSeasonTournamentQuestion,
                                UserStats, SuperlativeQuestion, PropQuestion,
                                PlayerStatPredictionQuestion, HeadToHeadQuestion,
                                NBAFinalsPredictionQuestion, PlayoffPrediction)
from predictions.forms import QuestionForm, PositionPredictionForm
import json

@require_http_methods(["GET"])
def get_players_api(request):
    # season = get_object_or_404(Season)
    players = Player.objects.all().values('id','name')
    player_list = list(players)
    return JsonResponse({'players': player_list})

@require_http_methods(["GET"])
def get_teams_api(request):
    # season = get_object_or_404(Season)
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


@require_http_methods(["GET"])
def get_standings_api(request, season_slug):
    """
    API endpoint to retrieve Regular Season Standings for given season,
    sorted by position in ascending order and grouped by conference.

    URL: /api/standings/<season_slug>/
    """
    # Step 1: Get the prior season based on the slug
    season = get_object_or_404(Season, slug=season_slug)

    # Step 2: Fetch Regular Season Standings for the prior season
    standings = RegularSeasonStandings.objects.all().filter(season=season).order_by('team__conference', 'position')
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


@require_http_methods(["GET"])
def get_ist_standings_api(request, season_slug):
    """
    API endpoint to retrieve In-Season Tournament Standings for a given season,
    grouped by conference and group.

    URL: /api/ist-standings/<season_slug>/
    """
    season = get_object_or_404(Season, slug=season_slug)

    # Fetch IST Standings for the season
    standings = InSeasonTournamentStandings.objects.filter(season=season).order_by('team__conference', 'ist_group_rank')

    # Prepare data grouped by conference and then by group
    data = {
        'East': {},
        'West': {}
    }

    for standing in standings:
        team = standing.team
        conference = team.conference  # Assuming Team model has 'conference' field
        group = standing.ist_group  # e.g., 'East Group A'

        if group not in data[conference]:
            data[conference][group] = []

        data[conference][group].append({
            'team_id': team.id,
            'team_name': team.name,
            'group_rank': standing.ist_group_rank,
            'wins': standing.wins,
            'losses': standing.losses,
            # 'points': standing.ist_points,
            'point_differential': standing.ist_differential,
            'wildcard_rank': standing.ist_wildcard_rank,
            'clinch_group': standing.ist_clinch_group,
            'clinch_knockout': standing.ist_clinch_knockout,
            'clinch_wildcard': standing.ist_clinch_wildcard,
        })

    return JsonResponse(data, status=200)

from django.db.models import Sum
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from predictions.models import Season, Answer, InSeasonTournamentQuestion

@require_http_methods(["GET"])
def get_ist_leaderboard_api(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)

    # Step 1: Fetch all IST questions for the season
    ist_questions = InSeasonTournamentQuestion.objects.filter(season=season).values_list('id', flat=True)

    # Step 2: Aggregate scores based on the points earned from `Answer`
    answers = (
        Answer.objects.filter(question_id__in=ist_questions)
        .values('user_id')  # Group by user
        .annotate(total_points=Sum('points_earned'))  # Sum up points for each user
        .order_by('-total_points')  # Sort by highest points
    )

    # Step 3: Retrieve user details for the leaderboard
    leaderboard = []
    for entry in answers:
        try:
            user = User.objects.get(id=entry['user_id'])
            leaderboard.append({
                'user': {'id': user.id, 'username': user.username,
                         'first_name': user.first_name,
                         'last_name': user.last_name},
                'points': entry['total_points'] or 0,  # Ensure points are not None
            })
        except User.DoesNotExist:
            # Handle any inconsistencies
            continue

    return JsonResponse({'top_users': leaderboard})

@login_required
@require_http_methods(["GET"])
def get_user_predictions_api(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)
    predictions = StandingPrediction.objects.filter(user=request.user, season=season)

    # Prepare the data for response
    predictions_data = [
        {
            'user': request.user.username,
            'team_id': pred.team.id,
            'team_name': pred.team.name,
            'team_conference': pred.team.conference,
            'predicted_position': pred.predicted_position,
        }
        for pred in predictions
    ]

    return JsonResponse({'predictions': predictions_data}, status=200)

def get_api_leaderboard(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)
    top_users = UserStats.objects.filter(season=season).order_by('-points')[:10]
    data = {
        'top_users': [
            {
                'user': {
                    'id': stat.user.id,
                    'username': stat.user.username,
                },
                'points': stat.points,
            }
            for stat in top_users
        ]
    }
    print(data)
    return JsonResponse(data)

def latest_season_api(request):
    latest_season = Season.objects.order_by('-end_date').first()
    return JsonResponse({'slug': latest_season.slug})


@require_http_methods(["GET"])
def get_questions_api(request, season_slug):
    """

    :param request:
    :param season_slug:
    :return:

    URL: /api/questions/<season_slug>/
    """
    season = get_object_or_404(Season, slug=season_slug)
    questions = Question.objects.filter(season=season)
    print(questions)

    question_list = []
    for q in questions:
        if isinstance(q, SuperlativeQuestion):
            question_type = 'superlative'
            players = list(q.winners.values('id', 'name'))  # Adjust as needed
            question_list.append({
                'id': q.id,
                'text': q.text,
                'point_value': q.point_value,
                'question_type': question_type,
                'award': q.award.name,  # Assuming Award has a name field
                'players': players,
            })
        elif isinstance(q, PropQuestion):
            if q.outcome_type == 'over_under':
                question_type = 'prop_over_under'
            elif q.outcome_type == 'yes_no':
                question_type = 'prop_yes_no'
            question_data = {
                'id': q.id,
                'text': q.text,
                'point_value': q.point_value,
                'question_type': question_type,
                'outcome_type': q.outcome_type,
                'line': q.line,
            }
            if q.related_player:
                question_data['related_player'] = q.related_player.name
            question_list.append(question_data)
        elif isinstance(q, PlayerStatPredictionQuestion):
            question_type = 'player_stat_prediction'
            question_list.append({
                'id': q.id,
                'text': q.text,
                'point_value': q.point_value,
                'question_type': question_type,
                'player_stat': q.player_stat.name,  # Assuming PlayerStat has a name field
                'stat_type': q.stat_type,
                'fixed_value': q.fixed_value,
                'current_leaders': q.current_leaders,
                'top_performers': q.top_performers,
            })
        elif isinstance(q, HeadToHeadQuestion):
            question_type = 'head_to_head'
            question_list.append({
                'id': q.id,
                'text': q.text,
                'point_value': q.point_value,
                'question_type': question_type,
                'team1': q.team1.name,
                'team2': q.team2.name,
            })
        elif isinstance(q, InSeasonTournamentQuestion):
            question_type = 'ist'
            question_data={
                'id': q.id,
                'text': q.text,
                'point_value': q.point_value,
                'question_type': question_type,
                'ist_group': q.ist_group,
                'prediction_type': q.prediction_type,
            }
            question_list.append(question_data)
        elif isinstance(q, NBAFinalsPredictionQuestion):
            question_type = 'nba_finals'
            question_data = {
                'id': q.id,
                'text': q.text,
                'point_value': q.point_value,
                'question_type': question_type,
                'group_name': q.group_name,
                'wins_choices': [0, 1, 2, 3, 4],  # Game score choices
                'losses_choices': [0, 1, 2, 3, 4],  # Game score choices
            }
            question_list.append(question_data)
        else:
            question_type = 'generic'
            question_list.append({
                'id': q.id,
                'text': q.text,
                'point_value': q.point_value,
                'question_type': question_type,
                'correct_answer': q.correct_answer,
            })

    return JsonResponse({'questions': question_list})

@login_required
@require_http_methods(["POST"])
def submit_answers_api(request, season_slug):
    try:
        # Parse the JSON body
        data = json.loads(request.body)
        answers = data.get('answers', [])

        # Validate that 'answers' is a list
        if not isinstance(answers, list):
            return JsonResponse({'status': 'error', 'message': "'answers' must be a list."}, status=400)

        # Initialize an empty dictionary for errors
        errors = {}

        # Use transaction to ensure atomicity
        with transaction.atomic():
            # Iterate through the submitted answers
            for ans in answers:
                question_id = ans.get('question')
                user_answer = ans.get('answer')

                # Validate presence of question_id and user_answer
                if question_id is None or user_answer is None:
                    errors[str(question_id)] = 'Both "question" and "answer" fields are required.'
                    continue

                try:
                    # Fetch the related question by ID and season_slug
                    question = get_object_or_404(Question, id=question_id, season__slug=season_slug)

                    # Save or update the user's answer
                    Answer.objects.update_or_create(
                        user=request.user,
                        question=question,
                        defaults={'answer': user_answer}
                    )

                except Exception as e:
                    # Log the error and associate it with the question_id
                    errors[str(question_id)] = str(e)

        # If any errors were encountered, return them
        if errors:
            return JsonResponse({'status': 'error', 'errors': errors}, status=400)

        # Success response if no errors occurred
        return JsonResponse({'status': 'success', 'message': 'Answers submitted successfully'}, status=200)

    except json.JSONDecodeError:
        # Handle JSON parsing errors
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON payload'}, status=400)

    except Exception as e:
        # Handle unexpected errors
        return JsonResponse({
            'status': 'error',
            'message': 'An unexpected error occurred',
            'details': str(e)
        }, status=500)


@require_http_methods(["GET"])
def get_user_answers_api(request, identifier):
    """
    Retrieve a user's answers based on either user_id or username,
    with optional filters for question type and season.

    Query Parameters:
    - question_type (optional): Filter answers by specific question type
    - season_slug (optional): Filter answers for a specific season (slug)
    """
    try:
        # Determine if identifier is numeric (user_id) or not (username)
        if identifier.isdigit():
            user = get_object_or_404(User, id=identifier)
        else:
            user = get_object_or_404(User, username=identifier)

        # Optional filters
        question_type = request.GET.get('question_type', None)
        season_slug = request.GET.get('season_slug', None)

        # Initialize queryset
        answers = Answer.objects.filter(user=user)

        # Filter by season if provided
        if season_slug:
            season = get_object_or_404(Season, slug=season_slug)
            answers = answers.filter(question__season=season)

        # Filter by question type if provided
        if question_type:
            answers = answers.filter(question__polymorphic_ctype__model=question_type.lower())

        # Prepare response data
        data = []
        for answer in answers.select_related('question'):
            question = answer.question.get_real_instance()  # Get the real instance of the polymorphic question
            data.append({
                'question_id': question.id,
                'question_text': question.text,
                'question_type': question._meta.model_name,  # Get the question type
                'season': question.season.slug,  # Include the season slug
                'answer': answer.answer,
                'points_earned': answer.points_earned,
            })

        return JsonResponse({'user': {'id': user.id, 'username': user.username}, 'answers': data}, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)