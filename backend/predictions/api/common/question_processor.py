# predictions/api/common/question_processor.py

from django.shortcuts import get_object_or_404
from predictions.models import Season, Question, SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion, HeadToHeadQuestion, InSeasonTournamentQuestion, NBAFinalsPredictionQuestion

def process_questions_for_season(season_slug):
    """
    Process and return a list of questions for the given season.

    Args:
        season_slug (str): The slug of the season

    Returns:
        list: A list of dictionaries containing question data
    """
    season = get_object_or_404(Season, slug=season_slug)
    questions = Question.objects.filter(season=season)

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

    return question_list