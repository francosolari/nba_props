"""
User Insight API Endpoints

Per-user prediction analysis that is too specific for the homepage payload:
unique wins, rare wins, and close calls for a single participant and season.

Endpoints:
- GET /interesting-stats/{username} - Notable predictions for one participant
"""

from ninja import Router
from django.http import JsonResponse

from predictions.models import Answer, Season

router = Router(tags=["User Insights"])


@router.get(
    "/interesting-stats/{username}",
    summary="Get Interesting Stats for User",
    description="""
    Retrieve interesting prediction statistics for a specific user.

    Returns:
    - unique_wins: Predictions only this user got right
    - close_calls: Predictions with near 50/50 split
    - rare_wins: Predictions few users got right
    """
)
def get_interesting_stats(request, username: str, season_slug: str = None):
    """Get interesting prediction stats for a user"""
    try:
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Q, F, Case, When, IntegerField

        User = get_user_model()

        # Get user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        # Get season
        if season_slug:
            try:
                season = Season.objects.get(slug=season_slug)
            except Season.DoesNotExist:
                return JsonResponse({'error': 'Season not found'}, status=404)
        else:
            # Get latest season (no is_current field exists)
            season = Season.objects.order_by('-start_date').first()

        if not season:
            return JsonResponse({'error': 'No active season'}, status=404)

        # Get user's correct answers
        user_correct_answers = Answer.objects.filter(
            user=user,
            question__season=season,
            is_correct=True
        ).select_related('question')

        unique_wins = []
        rare_wins = []

        # Find unique and rare wins
        for answer in user_correct_answers:
            question = answer.question

            # Count total correct answers for this question
            total_correct = Answer.objects.filter(
                question=question,
                is_correct=True
            ).count()

            total_answers = Answer.objects.filter(
                question=question
            ).exclude(is_correct__isnull=True).count()

            if total_answers == 0:
                continue

            correct_percentage = (total_correct / total_answers) * 100 if total_answers > 0 else 0

            stat_item = {
                'question': question.text,
                'answer': str(answer.answer),
                'total_correct': total_correct,
                'total_answers': total_answers,
                'correct_percentage': round(correct_percentage, 1),
                'points_earned': answer.points_earned or 0
            }

            # Unique wins (only user got it right)
            if total_correct == 1:
                unique_wins.append(stat_item)
            # Rare wins (less than 20% got it right)
            elif correct_percentage < 20:
                rare_wins.append(stat_item)

        # Find close calls (near 50/50 split on yes/no or over/under questions)
        from predictions.models import PropQuestion

        close_calls = []
        prop_questions = PropQuestion.objects.filter(
            season=season,
            outcome_type__in=['yes_no', 'over_under']
        )

        for question in prop_questions:
            answers_query = Answer.objects.filter(question=question).exclude(answer='')
            total_count = answers_query.count()

            if total_count < 5:  # Need at least 5 answers for meaningful split
                continue

            # Get answer distribution
            answer_counts = answers_query.values('answer').annotate(
                count=Count('id')
            )

            if len(answer_counts) == 2:
                counts = [ac['count'] for ac in answer_counts]
                split_percentage = min(counts) / total_count * 100

                # If split is between 40-60%, it's a close call
                if 40 <= split_percentage <= 60:
                    user_answer = Answer.objects.filter(
                        question=question,
                        user=user
                    ).first()

                    if user_answer:
                        close_calls.append({
                            'question': question.text,
                            'user_answer': str(user_answer.answer),
                            'is_correct': user_answer.is_correct,
                            'split_percentage': round(split_percentage, 1),
                            'total_responses': total_count,
                            'distribution': {ac['answer']: ac['count'] for ac in answer_counts}
                        })

        return {
            'unique_wins': unique_wins[:5],  # Limit to top 5
            'rare_wins': sorted(rare_wins, key=lambda x: x['correct_percentage'])[:5],
            'close_calls': close_calls[:5],
            'season': season.slug
        }

    except Exception as e:
        import traceback
        print(f"Error in interesting_stats: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)
