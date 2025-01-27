import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from django.db.models import Sum
from predictions.models import (
    Season,
    RegularSeasonStandings,
    StandingPrediction,
    UserStats,
)
from django.conf import settings


class Command(BaseCommand):
    help = 'Grades user standing predictions based on actual standings for a given season.'

    def add_arguments(self, parser):
        parser.add_argument(
            'season_slug', type=str, help='The slug of the season to grade predictions for.'
        )

    def setup_logging(self):
        """
        Configures the logging for the command.
        Logs are written to both the console and a file.
        """
        logger = logging.getLogger('grading_command')
        logger.setLevel(logging.DEBUG)

        # Create handlers
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)  # Adjust as needed

        file_handler = logging.FileHandler('grading_command.log')
        file_handler.setLevel(logging.DEBUG)

        # Create formatters and add to handlers
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)

        # Add handlers to the logger
        if not logger.handlers:
            logger.addHandler(console_handler)
            logger.addHandler(file_handler)

        return logger

    def handle(self, *args, **options):
        # Initialize logger
        logger = self.setup_logging()

        season_slug = options['season_slug']

        try:
            season = Season.objects.get(slug=season_slug)
            logger.info(f'Season "{season.slug}" found.')
        except Season.DoesNotExist:
            error_msg = f'Season with slug "{season_slug}" does not exist.'
            logger.error(error_msg)
            raise CommandError(error_msg)

        self.stdout.write(f'Grading predictions for season: {season.slug}')
        logger.info(f'Starting grading process for season "{season.slug}".')

        # Fetch actual standings for the season
        actual_standings = RegularSeasonStandings.objects.select_related('team').filter(season=season)
        if not actual_standings.exists():
            error_msg = f'No actual standings found for season "{season_slug}".'
            logger.error(error_msg)
            raise CommandError(error_msg)
        logger.info(f'Fetched {actual_standings.count()} actual standings.')

        # Create a mapping of team_id to position
        position_map = {standing.team_id: standing.position for standing in actual_standings}
        logger.debug(f'Position map created with {len(position_map)} entries.')

        # Fetch all standing predictions for the season with related user data
        standing_predictions = StandingPrediction.objects.select_related('user').filter(season=season)
        if not standing_predictions.exists():
            warning_msg = f'No standing predictions found for season "{season.slug}".'
            self.stdout.write(self.style.WARNING(warning_msg))
            logger.warning(warning_msg)
            return

        logger.info(f'Fetched {standing_predictions.count()} standing predictions.')

        # Initialize counters for summary
        total_predictions = 0
        updated_predictions = 0
        skipped_predictions = 0
        user_stats_updated = 0
        user_stats_created = 0
        duplicate_user_stats = set()

        # Begin atomic transaction
        try:
            with transaction.atomic():
                predictions_to_update = []

                for prediction in standing_predictions:
                    total_predictions += 1
                    team_id = prediction.team_id
                    predicted_pos = prediction.predicted_position
                    actual_pos = position_map.get(team_id)

                    if actual_pos is None:
                        warning_msg = (
                            f'Actual position not found for team ID {team_id} '
                            f'in season "{season.slug}". Skipping prediction ID {prediction.id}.'
                        )
                        self.stdout.write(self.style.WARNING(warning_msg))
                        logger.warning(warning_msg)
                        skipped_predictions += 1
                        continue

                    # Calculate points
                    if predicted_pos == actual_pos:
                        points = 3
                    elif abs(predicted_pos - actual_pos) == 1:
                        points = 1
                    else:
                        points = 0

                    # Update points if there's a change
                    if prediction.points != points:
                        prediction.points = points
                        predictions_to_update.append(prediction)
                        updated_predictions += 1

                # Bulk update predictions
                if predictions_to_update:
                    StandingPrediction.objects.bulk_update(predictions_to_update, ['points'])
                    logger.info(f'Updated {updated_predictions} predictions.')
                else:
                    logger.info('No predictions needed updating.')

                # Aggregate user points for IST questions
                user_points = (
                    StandingPrediction.objects.filter(season=season)
                    .values('user_id', 'user__username')
                    .annotate(total_points=Sum('points'))
                    .order_by('-total_points')
                )
                logger.debug(f'Aggregated points for {user_points.count()} users.')

                # Reset points for all users in UserStats for this season
                reset_count = UserStats.objects.filter(season=season).update(points=0)
                logger.info(f'Reset points for {reset_count} users in UserStats.')

                # Fetch existing UserStats for the season
                existing_user_stats = UserStats.objects.filter(season=season)
                user_stats_map = {}
                duplicates = set()

                for us in existing_user_stats:
                    if us.user_id in user_stats_map:
                        duplicates.add(us.user_id)
                        logger.warning(
                            f'Duplicate UserStats found for user_id {us.user_id} in season "{season.slug}".'
                        )
                    else:
                        user_stats_map[us.user_id] = us

                if duplicates:
                    for user_id in duplicates:
                        warning_msg = (
                            f'Multiple UserStats entries found for user_id {user_id} '
                            f'in season "{season.slug}". Only the first entry will be updated.'
                        )
                        self.stdout.write(self.style.WARNING(warning_msg))
                        logger.warning(warning_msg)

                # Prepare lists for bulk operations
                user_stats_to_update = []
                user_stats_to_create = []

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
                        user_stats_to_create.append(
                            UserStats(user_id=user_id, season=season, points=total_points)
                        )

                # Bulk update existing UserStats
                if user_stats_to_update:
                    UserStats.objects.bulk_update(user_stats_to_update, ['points'])
                    user_stats_updated += len(user_stats_to_update)
                    logger.info(f'Updated {len(user_stats_to_update)} UserStats entries.')

                # Bulk create missing UserStats
                if user_stats_to_create:
                    UserStats.objects.bulk_create(user_stats_to_create)
                    user_stats_created += len(user_stats_to_create)
                    logger.info(f'Created {len(user_stats_to_create)} new UserStats entries.')

                # Handle duplicates by only updating the first occurrence
                if duplicates:
                    # Since duplicates are already logged, no further action is taken here
                    pass

                # Print user scores as a sorted table
                self.stdout.write("\nUser Scores:")
                self.stdout.write("=" * 60)
                for user_point in user_points:
                    self.stdout.write(
                        f"User: {user_point['user__username']}, "
                        f"Total Points for Season \"{season.slug}\": {user_point['total_points']}"
                    )
                self.stdout.write("=" * 60)

            # Summary of operations
            summary = (
                f"Total Predictions Processed: {total_predictions}\n"
                f"Predictions Updated: {updated_predictions}\n"
                f"Predictions Skipped: {skipped_predictions}\n"
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