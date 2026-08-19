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
        from collections import defaultdict
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Q

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
        user_correct_answers = list(
            Answer.objects.filter(
                user=user,
                question__season=season,
                is_correct=True
            ).select_related('question')
        )

        unique_wins = []
        rare_wins = []

        # Correctness totals for every question the user got right, computed
        # in one bulk aggregate query instead of two queries per answer.
        question_ids = [answer.question_id for answer in user_correct_answers]
        totals_by_question = {
            row['question_id']: row
            for row in (
                Answer.objects.filter(question_id__in=question_ids)
                .exclude(is_correct__isnull=True)
                .values('question_id')
                .annotate(
                    total_answers=Count('id'),
                    total_correct=Count('id', filter=Q(is_correct=True)),
                )
            )
        }

        # Find unique and rare wins
        for answer in user_correct_answers:
            question = answer.question
            totals = totals_by_question.get(question.id)

            if not totals or totals['total_answers'] == 0:
                continue

            total_correct = totals['total_correct']
            total_answers = totals['total_answers']
            correct_percentage = (total_correct / total_answers) * 100

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
        prop_questions = list(
            PropQuestion.objects.filter(
                season=season,
                outcome_type__in=['yes_no', 'over_under']
            )
        )
        prop_question_ids = [q.id for q in prop_questions]

        # One bulk fetch for every candidate question's answers, instead of a
        # count + distribution + user-lookup query per question.
        answers_by_question = defaultdict(list)
        for prop_answer in Answer.objects.filter(
            question_id__in=prop_question_ids
        ).exclude(answer='').only('question_id', 'user_id', 'answer', 'is_correct'):
            answers_by_question[prop_answer.question_id].append(prop_answer)

        for question in prop_questions:
            question_answers = answers_by_question.get(question.id, [])
            total_count = len(question_answers)

            if total_count < 5:  # Need at least 5 answers for meaningful split
                continue

            # Get answer distribution
            answer_counts = defaultdict(int)
            for prop_answer in question_answers:
                answer_counts[prop_answer.answer] += 1

            if len(answer_counts) == 2:
                counts = list(answer_counts.values())
                split_percentage = min(counts) / total_count * 100

                # If split is between 40-60%, it's a close call
                if 40 <= split_percentage <= 60:
                    user_answer = next(
                        (a for a in question_answers if a.user_id == user.id), None
                    )

                    if user_answer:
                        close_calls.append({
                            'question': question.text,
                            'user_answer': str(user_answer.answer),
                            'is_correct': user_answer.is_correct,
                            'split_percentage': round(split_percentage, 1),
                            'total_responses': total_count,
                            'distribution': dict(answer_counts)
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
