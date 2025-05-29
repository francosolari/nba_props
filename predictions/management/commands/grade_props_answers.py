import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from django.db.models import Sum
from predictions.models import Season, Question, Answer, UserStats, StandingPrediction
from django.conf import settings

class Command(BaseCommand):
    help = 'Grades user answers based on the correct answers and assigned point values for questions in a given season.'

    def add_arguments(self, parser):
        parser.add_argument(
            'season_slug',
            type=str,
            help='The slug of the season to grade predictions for.'
        )

    def setup_logging(self):
        """
        Configures logging for the command.
        Logs are written to both the console and a file.
        """
        logger = logging.getLogger('qa_grading_command')
        logger.setLevel(logging.DEBUG)

        # Create handlers
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)  # Adjust as needed

        file_handler = logging.FileHandler('qa_grading_command.log')
        file_handler.setLevel(logging.DEBUG)

        # Create and set formatters
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)

        # Attach handlers to logger if they haven't been added already
        if not logger.handlers:
            logger.addHandler(console_handler)
            logger.addHandler(file_handler)

        return logger

    def handle(self, *args, **options):
        logger = self.setup_logging()

        season_slug = options['season_slug']
        try:
            season = Season.objects.get(slug=season_slug)
            logger.info(f'Season "{season.slug}" found.')
        except Season.DoesNotExist:
            error_msg = f'Season with slug "{season_slug}" does not exist.'
            logger.error(error_msg)
            raise CommandError(error_msg)

        self.stdout.write(f'Grading answers for season: {season.slug}')
        logger.info(f'Starting grading process for season "{season.slug}".')

        # Fetch all answers for the season.
        answers = Answer.objects.select_related('user', 'question').filter(question__season=season)
        if not answers.exists():
            warning_msg = f'No answers found for season "{season.slug}".'
            self.stdout.write(self.style.WARNING(warning_msg))
            logger.warning(warning_msg)
            return

        logger.info(f'Fetched {answers.count()} answers.')

        # Initialize counters for summary.
        total_answers = 0
        updated_answers = 0
        skipped_answers = 0
        user_stats_updated = 0
        user_stats_created = 0

        try:
            with transaction.atomic():
                answers_to_update = []

                # Loop over each Answer for grading.
                for answer in answers:
                    total_answers += 1
                    question = answer.question
                    correct_answer = question.correct_answer

                    # If there is no correct answer provided (None or empty), skip grading this answer.
                    if correct_answer is None or not correct_answer.strip():
                        warning_msg = (
                            f'No correct answer set for question ID {question.id} '
                            f'(Answer ID {answer.id}). Skipping.'
                        )
                        self.stdout.write(self.style.WARNING(warning_msg))
                        logger.warning(warning_msg)
                        skipped_answers += 1
                        continue

                    # Compare answers in a case-insensitive manner.
                    if answer.answer.lower().strip() == correct_answer.lower().strip():
                        points = question.point_value
                    else:
                        points = 0

                    # Update points if they differ.
                    if answer.points_earned != points:
                        answer.points_earned = points
                        answers_to_update.append(answer)
                        updated_answers += 1

                # Bulk update the answers that have changed.
                if answers_to_update:
                    Answer.objects.bulk_update(answers_to_update, ['points_earned'])
                    logger.info(f'Updated {updated_answers} answers.')
                else:
                    logger.info('No answers needed updating.')

                # Combine props and standings for a full total
                props_totals = (
                    Answer.objects
                    .filter(question__season=season)
                    .exclude(question__polymorphic_ctype__model='inseasontournamentquestion')
                    .values('user_id')
                    .annotate(props_sum=Sum('points_earned'))
                )
                standings_totals = (
                    StandingPrediction.objects
                    .filter(season=season)
                    .values('user_id')
                    .annotate(standings_sum=Sum('points'))
                )
                props_map = {item['user_id']: item['props_sum'] for item in props_totals}
                standings_map = {item['user_id']: item['standings_sum'] for item in standings_totals}

                # Compute overall points awarded
                total_props_points = sum(props_map.values())
                total_standings_points = sum(standings_map.values())

                # Update UserStats.points to combined sum
                for user_id in set(props_map) | set(standings_map):
                    total = props_map.get(user_id, 0) + standings_map.get(user_id, 0)
                    us, created = UserStats.objects.get_or_create(user_id=user_id, season=season)
                    us.points = total
                    us.save()

                # Output complete leaderboard
                self.stdout.write("\nUser Scores:")
                self.stdout.write("=" * 60)
                for user_id in sorted(
                    set(props_map) | set(standings_map),
                    key=lambda uid: props_map.get(uid, 0) + standings_map.get(uid, 0),
                    reverse=True
                ):
                    user = UserStats.objects.get(user_id=user_id, season=season).user
                    props_points = props_map.get(user_id, 0)
                    standings_points = standings_map.get(user_id, 0)
                    total = props_points + standings_points
                    self.stdout.write(
                        f"User: {user.username}, Total: {total} "
                        f"(Standings: {standings_points}, Props: {props_points})"
                    )
                self.stdout.write("=" * 60)

            summary = (
                f"Total Props Points Awarded: {total_props_points}\n"
                f"Total Standings Points Awarded: {total_standings_points}\n"
                f"Total Answers Processed (props): {total_answers}\n"
                f"Answers Updated (props): {updated_answers}\n"
                f"Answers Skipped (props): {skipped_answers}\n"
                f"UserStats Updated: {user_stats_updated}\n"
                f"UserStats Created: {user_stats_created}"
            )
            self.stdout.write("\nSummary:")
            self.stdout.write("=" * 60)
            self.stdout.write(summary)
            self.stdout.write("=" * 60)
            logger.info("Grading process completed successfully.")
            logger.info(summary)

        except IntegrityError as e:
            error_msg = f'Database integrity error occurred: {str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg)
            raise CommandError(error_msg)
        except Exception as e:
            error_msg = f'An unexpected error occurred: {str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg, exc_info=True)
            raise CommandError(error_msg)