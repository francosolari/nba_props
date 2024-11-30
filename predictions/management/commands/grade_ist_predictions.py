from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from predictions.models import Season, InSeasonTournamentStandings, Answer, InSeasonTournamentQuestion, UserStats


class Command(BaseCommand):
    help = 'Grades IST answers based on current IST standings.'

    def add_arguments(self, parser):
        parser.add_argument('season_slug', type=str, help='The slug of the season to grade IST answers for.')

    def handle(self, *args, **options):
        season_slug = options['season_slug']

        try:
            season = Season.objects.get(slug=season_slug)
        except Season.DoesNotExist:
            raise CommandError(f'Season with slug "{season_slug}" does not exist.')

        self.stdout.write(f'Grading IST answers for season: {season.slug}')

        # Fetch IST questions for the season
        ist_questions = InSeasonTournamentQuestion.objects.filter(season=season)
        if not ist_questions.exists():
            raise CommandError(f'No IST questions found for season "{season_slug}".')

        # Fetch current IST standings
        ist_standings = InSeasonTournamentStandings.objects.filter(season=season)
        if not ist_standings.exists():
            raise CommandError(f'No IST standings found for season "{season_slug}".')

        # Create mappings for group winners, wildcard winners, and conference winners
        group_winners = {
            (standing.ist_group, standing.team_id): standing.ist_group_rank == 1
            for standing in ist_standings
        }
        wildcard_winners = {
            (standing.team.conference, standing.team_id): standing.ist_wildcard_rank == 1
            for standing in ist_standings
        }

        # Fetch all answers for IST questions
        answers = Answer.objects.filter(question__in=ist_questions)

        if not answers.exists():
            self.stdout.write(self.style.WARNING(f'No answers found for IST questions in season "{season.slug}".'))
            return

        # Begin atomic transaction
        with transaction.atomic():
            answers_to_update = []
            for answer in answers:
                question = answer.question.get_real_instance()
                if not isinstance(question, InSeasonTournamentQuestion):
                    continue

                team_id = int(answer.answer) if answer.answer.isdigit() else None
                if not team_id:
                    self.stdout.write(
                        self.style.WARNING(f"Invalid answer for user {answer.user.username}: {answer.answer}. Skipping.")
                    )
                    continue

                # Points calculation based on question type
                points = 0
                if question.prediction_type == 'group_winner':
                    # Check if the team is the group winner
                    is_winner = group_winners.get((question.ist_group, team_id), False)
                    points = 1 if is_winner else 0

                elif question.prediction_type == 'wildcard':
                    # Check if the team is the wildcard winner for their conference
                    standings_entry = ist_standings.filter(team_id=team_id).first()
                    if standings_entry and standings_entry.ist_wildcard_rank == 1:
                        points = 1

                elif question.prediction_type == 'conference_winner':
                    # Check if the team is the conference winner
                    standings_entry = ist_standings.filter(team_id=team_id).first()
                    if standings_entry and standings_entry.ist_knockout_rank == 1:
                        points = 1

                # Update the answer points
                answer.points_earned = points
                answers_to_update.append(answer)

            # Bulk update answers
            Answer.objects.bulk_update(answers_to_update, ['points_earned'])

            # Aggregate user points for IST questions
            user_points = (
                Answer.objects.filter(question__in=ist_questions)
                .values('user_id', 'user__username')  # Include username for display
                .annotate(total_points=Sum('points_earned'))
                .order_by('-total_points')  # Sort by total points, descending
            )

            # Reset points for all users in UserStats for this season
            UserStats.objects.filter(season=season).update(points=0)

            # Update or create UserStats entries
            user_stats_to_update = []
            for user_point in user_points:
                user_stats, created = UserStats.objects.get_or_create(
                    user_id=user_point['user_id'], season=season
                )
                user_stats.points = user_point['total_points']
                user_stats_to_update.append(user_stats)

            # Bulk update user stats
            UserStats.objects.bulk_update(user_stats_to_update, ['points'])

            # Print user scores as a sorted table
            self.stdout.write("\nUser Scores:")
            self.stdout.write("=" * 40)
            for user_point in user_points:
                self.stdout.write(
                    f"User: {user_point['user__username']}, Total Points for Season \"{season.slug}\": {user_point['total_points']}"
                )
            self.stdout.write("=" * 40)

        self.stdout.write(self.style.SUCCESS(f'Successfully graded IST answers for season "{season.slug}".'))