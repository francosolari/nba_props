from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from predictions.models import Season, RegularSeasonStandings, StandingPrediction, UserStats


class Command(BaseCommand):
    help = 'Grades user standing predictions based on actual standings for a given season.'

    def add_arguments(self, parser):
        parser.add_argument('season_slug', type=str, help='The slug of the season to grade predictions for.')

    def handle(self, *args, **options):
        season_slug = options['season_slug']

        try:
            season = Season.objects.get(slug=season_slug)
        except Season.DoesNotExist:
            raise CommandError(f'Season with slug "{season_slug}" does not exist.')

        self.stdout.write(f'Grading predictions for season: {season.slug}')

        # Fetch actual standings for the season
        actual_standings = RegularSeasonStandings.objects.filter(season=season)
        if not actual_standings.exists():
            raise CommandError(f'No actual standings found for season "{season_slug}".')

        # Create a mapping of team_id to position
        position_map = {standing.team_id: standing.position for standing in actual_standings}

        # Fetch all standing predictions for the season
        standing_predictions = StandingPrediction.objects.filter(season=season)

        if not standing_predictions.exists():
            self.stdout.write(self.style.WARNING(f'No standing predictions found for season "{season.slug}".'))
            return

        # Begin atomic transaction
        with transaction.atomic():
            # Process predictions
            predictions_to_update = []
            for prediction in standing_predictions:
                team_id = prediction.team_id
                predicted_pos = prediction.predicted_position
                actual_pos = position_map.get(team_id)

                if actual_pos is None:
                    self.stdout.write(
                        self.style.WARNING(f'Actual position not found for team ID {team_id} in season "{season.slug}". Skipping.')
                    )
                    continue

                # Calculate points
                if predicted_pos == actual_pos:
                    points = 3
                elif abs(predicted_pos - actual_pos) == 1:
                    points = 1
                else:
                    points = 0

                # Prepare for bulk update
                prediction.points = points
                predictions_to_update.append(prediction)

            # Bulk update predictions
            StandingPrediction.objects.bulk_update(predictions_to_update, ['points'])

            # Aggregate and update total points
            user_points = (
                StandingPrediction.objects.filter(season=season)
                .values('user_id', 'user__username')  # Include username for display
                .annotate(total_points=Sum('points'))
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

        self.stdout.write(self.style.SUCCESS(f'Successfully graded predictions for season "{season.slug}".'))