"""
Management command to update NBA season standings from NBA API.

Usage:
    python manage.py update_season_standings [season-slug]

Examples:
    python manage.py update_season_standings
    python manage.py update_season_standings 2024-25

Note: This command requires nba_api library and should only be run locally.
      Production servers may have NBA API blocked.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from predictions.models import Season
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../..'))

try:
    from nba_stats import fetch_nba_standings
except ImportError:
    fetch_nba_standings = None


class Command(BaseCommand):
    help = 'Update NBA season standings from NBA API'

    def add_arguments(self, parser):
        parser.add_argument(
            'season_slug',
            nargs='?',
            default='current',
            type=str,
            help='Season slug (default: current)'
        )

    def handle(self, *args, **options):
        season_slug = options['season_slug']

        self.stdout.write(self.style.WARNING(
            '\n' + '=' * 70
        ))
        self.stdout.write(self.style.WARNING(
            'NBA Season Standings Updater'
        ))
        self.stdout.write(self.style.WARNING(
            '=' * 70 + '\n'
        ))

        # Check if nba_api is available
        try:
            import nba_api
        except ImportError:
            raise CommandError(
                'nba_api is not installed. Install with:\n'
                '  pip install nba_api'
            )

        # Check if fetch function is available
        if fetch_nba_standings is None:
            raise CommandError(
                'Could not import fetch_nba_standings from nba_stats module. '
                'Make sure backend/nba_stats.py exists.'
            )

        # Get the season
        if season_slug == 'current':
            season = Season.objects.order_by('-start_date').first()
            if not season:
                raise CommandError("No seasons found.")
            season_slug = season.slug
        else:
            try:
                season = Season.objects.get(slug=season_slug)
            except Season.DoesNotExist:
                raise CommandError(f'Season with slug "{season_slug}" does not exist.')

        self.stdout.write(f'Season: {season_slug}')
        self.stdout.write(f'Started: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}\n')

        self.stdout.write(self.style.WARNING(
            'NOTE: This command fetches from NBA API and may be blocked on '
            'production servers.\n'
            '      Run this command LOCALLY and sync your database.\n'
        ))

        # Fetch and update standings
        try:
            self.stdout.write('Fetching standings from NBA API...')
            standings_df = fetch_nba_standings(season_slug)

            self.stdout.write(self.style.SUCCESS(
                f'\n✓ Successfully updated {len(standings_df)} team standings'
            ))
            self.stdout.write(self.style.SUCCESS(
                f'✓ Completed at {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}'
            ))

        except Exception as e:
            raise CommandError(f'Failed to update standings: {str(e)}')
