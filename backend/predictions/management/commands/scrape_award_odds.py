"""
Management command to scrape NBA award odds from DraftKings.

Usage:
    python manage.py scrape_award_odds [season-slug]

Examples:
    python manage.py scrape_award_odds
    python manage.py scrape_award_odds 2024-25

Note: This command requires Playwright and should only be run locally.
      Production servers may have DraftKings blocked.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
import sys
import os

# Add backend directory to path so we can import the scraper
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../..'))

try:
    from nba_scrape_db import main as scrape_main
except ImportError:
    scrape_main = None


class Command(BaseCommand):
    help = 'Scrape NBA award odds from DraftKings and save to database'

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
            'NBA Award Odds Scraper'
        ))
        self.stdout.write(self.style.WARNING(
            '=' * 70 + '\n'
        ))

        # Check if playwright is available
        try:
            import playwright
        except ImportError:
            raise CommandError(
                'Playwright is not installed. Install with:\n'
                '  pip install playwright\n'
                '  playwright install chromium'
            )

        # Check if scraper module is available
        if scrape_main is None:
            raise CommandError(
                'Could not import nba_scrape_db module. '
                'Make sure backend/nba_scrape_db.py exists.'
            )

        self.stdout.write(f'Season: {season_slug}')
        self.stdout.write(f'Started: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}\n')

        self.stdout.write(self.style.WARNING(
            'NOTE: This command scrapes DraftKings and may be blocked on '
            'production servers.\n'
            '      Run this command LOCALLY and sync your database.\n'
        ))

        # Run the scraper
        try:
            scrape_main(season_slug)
            self.stdout.write(self.style.SUCCESS('\n✓ Scraping completed successfully'))
        except Exception as e:
            raise CommandError(f'Scraping failed: {str(e)}')
