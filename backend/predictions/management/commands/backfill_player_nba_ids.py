"""
Management command to backfill Player.nba_player_id for players that were
created by name only (e.g. via scrape_award_odds or add_2025_rookies), so
their headshots can be resolved from the NBA CDN.

Usage:
    python manage.py backfill_player_nba_ids
"""

from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction

from predictions.models import Player


class Command(BaseCommand):
    help = "Backfill Player.nba_player_id by matching player names against the nba_api static player index."

    def handle(self, *args, **options):
        try:
            from nba_api.stats.static import players as nba_players
        except ImportError:
            self.stderr.write(self.style.ERROR("nba_api is not installed; cannot backfill NBA player IDs."))
            return

        queryset = Player.objects.filter(nba_player_id__isnull=True)
        total = queryset.count()
        if not total:
            self.stdout.write("No players are missing an nba_player_id.")
            return

        matched = 0
        unmatched = []
        duplicates = []
        for player in queryset:
            candidates = nba_players.find_players_by_full_name(player.name)
            if not candidates:
                unmatched.append(player.name)
                continue
            player.nba_player_id = candidates[0]['id']
            try:
                with transaction.atomic():
                    player.save(update_fields=['nba_player_id'])
                matched += 1
            except IntegrityError:
                # Another Player row (likely a duplicate/near-duplicate name)
                # already claimed this nba_player_id.
                duplicates.append(player.name)

        self.stdout.write(self.style.SUCCESS(f"Matched {matched}/{total} players."))
        if unmatched:
            self.stdout.write(self.style.WARNING(f"Unmatched ({len(unmatched)}): {', '.join(unmatched)}"))
        if duplicates:
            self.stdout.write(self.style.WARNING(
                f"Skipped, nba_player_id already claimed by another Player row ({len(duplicates)}): "
                f"{', '.join(duplicates)}"
            ))
