"""
Load a season's NBA Cup groups and standings from NBA.com, so the Cup group
picks list the right teams. Before the Cup starts it loads the groups with
zeroed records; rerun it to refresh standings during the Cup.

stats.nba.com blocks the production server, so run this from a local
machine pointed at the production database (npm run db:prod).

Usage:
    python manage.py update_ist_standings 2026-27
"""

import os
import sys

from django.core.management.base import BaseCommand, CommandError

from predictions.models import Season

# nba_stats.py lives in backend/, beside manage.py.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../..'))


class Command(BaseCommand):
    help = "Load NBA Cup groups and standings for a season from NBA.com."

    def add_arguments(self, parser):
        parser.add_argument('season_slug', type=str)

    def handle(self, *args, season_slug, **options):
        if not Season.objects.filter(slug=season_slug).exists():
            raise CommandError(f'Season "{season_slug}" does not exist.')
        from nba_stats import fetch_ist_standings

        standings = fetch_ist_standings(season=season_slug)
        groups = {}
        for team, row in standings.items():
            groups.setdefault(row['ist_group'], []).append(team)
        for group in sorted(groups):
            self.stdout.write(f"{group}: {', '.join(sorted(groups[group]))}")
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(standings)} teams into {len(groups)} NBA Cup groups for {season_slug}."))
