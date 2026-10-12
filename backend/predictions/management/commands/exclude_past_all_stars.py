"""
Hide past All-Stars from a player-pick question's dropdown, e.g. "Name a
first-time All-Star". Checks every Player with an NBA.com ID against the
nba_api award history and excludes anyone selected before the question's
season. One API call per player, so it takes a few minutes.

stats.nba.com blocks the production server, so run this from a local
machine pointed at the production database (npm run db:prod).

Usage:
    python manage.py exclude_past_all_stars <question_id> [--dry-run]
"""

import time

from django.core.management.base import BaseCommand, CommandError

from predictions.models import Player, SuperlativeQuestion

ALL_STAR = "NBA All-Star"


class Command(BaseCommand):
    help = "Exclude players with an All-Star selection before the question's season from its pick list."

    def add_arguments(self, parser):
        parser.add_argument("question_id", type=int)
        parser.add_argument("--dry-run", action="store_true", help="List who would be excluded without saving.")
        parser.add_argument("--delay", type=float, default=0.6, help="Seconds between NBA API calls.")

    def handle(self, *args, question_id, dry_run, delay, **options):
        from nba_api.stats.endpoints import playerawards

        try:
            question = SuperlativeQuestion.objects.select_related("season").get(id=question_id)
        except SuperlativeQuestion.DoesNotExist:
            raise CommandError(f"No award/player-pick question with id {question_id}.")

        # Seasons sort as strings ("2025-26" < "2026-27"); the question's own
        # season is the one being predicted, so it never counts.
        before = question.season.year
        players = Player.objects.filter(nba_player_id__isnull=False).order_by("name")
        self.stdout.write(f"Checking {players.count()} players for All-Star selections before {before}...")

        excluded, failed = [], []
        for player in players:
            try:
                awards = playerawards.PlayerAwards(player_id=player.nba_player_id, timeout=30).get_data_frames()[0]
            except Exception as exc:  # network hiccups shouldn't lose the whole run
                failed.append(f"{player.name} ({exc.__class__.__name__})")
                continue
            finally:
                time.sleep(delay)
            seasons = awards.loc[awards["DESCRIPTION"] == ALL_STAR, "SEASON"]
            if any(season < before for season in seasons):
                excluded.append(player)

        names = ", ".join(p.name for p in excluded)
        self.stdout.write(f"Past All-Stars ({len(excluded)}): {names}")
        if failed:
            self.stdout.write(self.style.WARNING(
                f"Could not check {len(failed)} players; rerun to retry them: {', '.join(failed)}"
            ))
        if dry_run:
            self.stdout.write("Dry run: nothing saved.")
            return
        if failed:
            # Keep earlier exclusions for players this run couldn't check.
            question.excluded_players.add(*excluded)
        else:
            question.excluded_players.set(excluded)
        self.stdout.write(self.style.SUCCESS(
            f"Question {question.id} now hides {question.excluded_players.count()} players from its pick list."
        ))
