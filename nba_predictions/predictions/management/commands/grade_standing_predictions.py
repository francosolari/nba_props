# your_app/management/commands/grade_standing_predictions.py

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import F
from predictions.models import Season, RegularSeasonStandings, StandingPrediction, UserStats
from django.contrib.auth.models import User

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
            raise CommandError(f'No actual standings found for season "{season.slug}".')

        # Create a mapping of team_id to position
        position_map = {standing.team_id: standing.position for standing in actual_standings}

        # Fetch all standing predictions for the season
        standing_predictions = StandingPrediction.objects.filter(season=season)

        if not standing_predictions.exists():
            self.stdout.write(self.style.WARNING(f'No standing predictions found for season "{season.slug}".'))
            return

        # Begin atomic transaction
        with transaction.atomic():
            for prediction in standing_predictions:
                team_id = prediction.team_id
                predicted_pos = prediction.predicted_position
                actual_pos = position_map.get(team_id)

                if actual_pos is None:
                    self.stdout.write(self.style.WARNING(f'Actual position not found for team ID {team_id} in season "{season.slug}". Skipping.'))
                    continue

                # Calculate the difference
                diff = abs(predicted_pos - actual_pos)

                # Assign points based on grading criteria
                if predicted_pos == actual_pos:
                    points = 3
                elif diff == 1:
                    points = 1
                else:
                    points = 0

                # Update the prediction's points
                prediction.points = points
                prediction.save()

                self.stdout.write(
                    f'User: {prediction.user.username}, Team: {prediction.team.name}, '
                    f'Predicted: {predicted_pos}, Actual: {actual_pos}, Points Awarded: {points}'
                )

            # After grading all predictions, aggregate total points per user
            user_points = standing_predictions.values('user').annotate(total=F('points')).order_by('user')

            # Reset points for all users in UserStats for this season
            UserStats.objects.filter(season=season).update(points=0)

            # Aggregate and update total points
            user_points = {}
            for prediction in standing_predictions:
                user = prediction.user
                user_points[user] = user_points.get(user, 0) + prediction.points

            for user, total in user_points.items():
                user_stats, created = UserStats.objects.get_or_create(user=user, season=season)
                user_stats.points = total
                user_stats.save()
                self.stdout.write(
                    f'User: {user.username}, Total Points for Season "{season.slug}": {total}'
                )

        self.stdout.write(self.style.SUCCESS(f'Successfully graded predictions for season "{season.slug}".'))