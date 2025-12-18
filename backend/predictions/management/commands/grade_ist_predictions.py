from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from predictions.models import (
    Season,
    InSeasonTournamentStandings,
    Answer,
    InSeasonTournamentQuestion,
    UserStats,
)


class Command(BaseCommand):
    help = 'Grades IST answers based on current IST standings.'

    def add_arguments(self, parser):
        parser.add_argument(
            'season_slug', type=str, help='The slug of the season to grade IST answers for.'
        )
        parser.add_argument(
            '--force-knockout',
            action='store_true',
            help='Force grading of conference winners / champion picks even if knockout games may be incomplete.'
        )

    def handle(self, *args, **options):
        season_slug = options['season_slug']
        force_knockout = options['force_knockout']

        try:
            season = Season.objects.get(slug=season_slug)
        except Season.DoesNotExist:
            raise CommandError(f'Season with slug "{season_slug}" does not exist.')

        self.stdout.write(f'Grading IST answers for season: {season.slug}')

        # Fetch IST questions for the season
        ist_questions = InSeasonTournamentQuestion.objects.filter(season=season)
        if not ist_questions.exists():
            raise CommandError(f'No IST questions found for season "{season_slug}".')

        # Fetch current IST standings with related team data
        ist_standings = InSeasonTournamentStandings.objects.select_related('team').filter(season=season)
        if not ist_standings.exists():
            raise CommandError(f'No IST standings found for season "{season_slug}".')

        # Calculate games played metrics to infer tournament stage
        games_played_per_team = {
            standing.team_id: (standing.wins or 0) + (standing.losses or 0)
            for standing in ist_standings
        }
        if games_played_per_team:
            max_games_played = max(games_played_per_team.values())
        else:
            max_games_played = 0
        # Group stage ends after four IST games. Anything beyond indicates knockout play.
        knockout_progress_detected = max_games_played > 4
        allow_knockout = force_knockout or knockout_progress_detected

        # Create mappings for quick lookups
        # Mapping for group winners: {(ist_group, team_id): is_group_winner}
        group_winners_map = {
            (standing.ist_group, standing.team_id): standing.ist_group_rank == 1
            for standing in ist_standings
        }

        # Mapping for wildcard winners: {team_id: is_wildcard_winner}
        # Exclude group winners from wildcard consideration
        wildcard_winners_map = {
            standing.team_id: standing.ist_wildcard_rank == 1 and standing.ist_group_rank != 1
            for standing in ist_standings
        }

        # Mapping for conference winners: {team_id: is_conference_winner}
        conference_winners_map = {
            standing.team_id: standing.ist_knockout_rank == 1
            for standing in ist_standings
        }

        # Mapping for NBA Cup champion: {team_id: is_champion}
        champion_map = {
            standing.team_id: standing.ist_champion
            for standing in ist_standings
        }

        # Fetch all answers for IST questions with related question and user data
        answers = Answer.objects.select_related('question', 'user').filter(question__in=ist_questions)

        if not answers.exists():
            self.stdout.write(
                self.style.WARNING(
                    f'No answers found for IST questions in season "{season.slug}".'
                )
            )
            return

        # Begin atomic transaction
        with transaction.atomic():
            answers_to_update = []
            invalid_answers = []

            for answer in answers:
                question = answer.question.get_real_instance()
                if not isinstance(question, InSeasonTournamentQuestion):
                    continue  # Skip if not the correct question type

                # Attempt to parse the team_id from the answer
                try:
                    team_id = int(answer.answer)
                except (ValueError, TypeError):
                    invalid_answers.append(
                        f"Invalid answer for user '{answer.user.username}': '{answer.answer}'. Skipping."
                    )
                    continue

                # Initialize points
                points = 0

                # Determine points based on prediction type
                if question.prediction_type == 'group_winner':
                    is_winner = group_winners_map.get((question.ist_group, team_id), False)
                    points = 1 if is_winner else 0

                elif question.prediction_type == 'wildcard':
                    is_wildcard = wildcard_winners_map.get(team_id, False)
                    points = 1 if is_wildcard else 0

                elif question.prediction_type == 'conference_winner':
                    if allow_knockout:
                        is_conference_winner = conference_winners_map.get(team_id, False)
                        points = 1 if is_conference_winner else 0
                    else:
                        points = 0

                elif question.prediction_type == 'champion':
                    if allow_knockout:
                        is_champion = champion_map.get(team_id, False)
                        points = 1 if is_champion else 0
                    else:
                        points = 0

                # Derive correctness: award points implies a correct prediction
                is_correct = bool(points)

                # Update the answer when points or correctness changed
                if answer.points_earned != points or answer.is_correct != is_correct:
                    answer.points_earned = points
                    answer.is_correct = is_correct
                    answers_to_update.append(answer)

            # Log any invalid answers
            for warning in invalid_answers:
                self.stdout.write(self.style.WARNING(warning))

            # Bulk update answers if there are any changes
            if answers_to_update:
                Answer.objects.bulk_update(answers_to_update, ['points_earned', 'is_correct'])
                self.stdout.write(
                    self.style.SUCCESS(f'Updated {len(answers_to_update)} answers.')
                )
            else:
                self.stdout.write(self.style.WARNING('No answers needed updating.'))

            if not allow_knockout:
                self.stdout.write(
                    self.style.WARNING(
                        'Skipped grading conference winners and NBA Cup champion. '
                        'These will activate automatically once knockout games are recorded (or run with --force-knockout).'
                    )
                )

            # Aggregate user points for IST questions
            user_points = (
                Answer.objects.filter(question__in=ist_questions)
                .values('user_id', 'user__username')
                .annotate(total_points=Sum('points_earned'))
                .order_by('-total_points')
            )

            # Reset points for all users in UserStats for this season
            UserStats.objects.filter(season=season).update(points=0)

            # Prepare UserStats entries for bulk update or creation
            user_stats_to_update = []
            user_stats_to_create = []

            # Fetch existing UserStats for the season
            existing_user_stats = UserStats.objects.filter(season=season)
            user_stats_map = {}
            duplicates = set()

            for us in existing_user_stats:
                if us.user_id in user_stats_map:
                    duplicates.add(us.user_id)
                else:
                    user_stats_map[us.user_id] = us

            if duplicates:
                for user_id in duplicates:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Multiple UserStats entries found for user_id {user_id} in season "{season.slug}". '
                            f'Only the first entry will be updated.'
                        )
                    )

            for user_point in user_points:
                user_id = user_point['user_id']
                total_points = user_point['total_points']
                username = user_point['user__username']

                user_stat = user_stats_map.get(user_id)
                if user_stat:
                    user_stat.points = total_points
                    user_stats_to_update.append(user_stat)
                else:
                    # Create new UserStats instance if it doesn't exist
                    user_stats_to_create.append(UserStats(user_id=user_id, season=season, points=total_points))

            # Bulk update existing UserStats
            if user_stats_to_update:
                UserStats.objects.bulk_update(user_stats_to_update, ['points'])
                self.stdout.write(
                    self.style.SUCCESS(f'Updated {len(user_stats_to_update)} UserStats entries.')
                )
            else:
                self.stdout.write(self.style.WARNING('No UserStats entries needed updating.'))

            # Bulk create missing UserStats
            if user_stats_to_create:
                UserStats.objects.bulk_create(user_stats_to_create)
                self.stdout.write(
                    self.style.SUCCESS(f'Created {len(user_stats_to_create)} new UserStats entries.')
                )
            else:
                self.stdout.write(self.style.WARNING('No UserStats entries needed creating.'))

            # Print user scores as a sorted table
            self.stdout.write("\nUser Scores:")
            self.stdout.write("=" * 60)
            for user_point in user_points:
                self.stdout.write(
                    f"User: {user_point['user__username']}, "
                    f"Total Points for Season \"{season.slug}\": {user_point['total_points']}"
                )
            self.stdout.write("=" * 60)

        self.stdout.write(
            self.style.SUCCESS(f'Successfully graded IST answers for season "{season.slug}".')
        )
