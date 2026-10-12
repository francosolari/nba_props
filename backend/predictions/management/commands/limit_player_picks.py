"""
Limit a player-pick question's dropdown to the players who qualify, by
hiding everyone else (SuperlativeQuestion.excluded_players).

  --past-all-stars  "Name a first-time All-Star": hide anyone with an
                    All-Star selection before the question's season. One
                    NBA API call per player, so it takes a few minutes.
  --rookies         "First rookie to ...": show only players whose first
                    NBA season is the question's season. One API call; adds
                    any rookie missing from the Player table.

stats.nba.com blocks the production server, so run this from a local
machine pointed at the production database (npm run db:prod).

Usage:
    python manage.py limit_player_picks <question_id> --rookies [--dry-run]
"""

import time

from django.core.management.base import BaseCommand, CommandError

from predictions.models import Player, SuperlativeQuestion


class Command(BaseCommand):
    help = "Hide players who don't qualify from a player-pick question's dropdown."

    def add_arguments(self, parser):
        parser.add_argument("question_id", type=int)
        mode = parser.add_mutually_exclusive_group(required=True)
        mode.add_argument("--past-all-stars", action="store_true", help="Hide earlier All-Stars.")
        mode.add_argument("--rookies", action="store_true", help="Show only this season's rookies.")
        parser.add_argument("--dry-run", action="store_true", help="Report without saving.")
        parser.add_argument("--delay", type=float, default=0.6, help="Seconds between NBA API calls.")

    def handle(self, *args, question_id, past_all_stars, rookies, dry_run, delay, **options):
        try:
            question = SuperlativeQuestion.objects.select_related("season").get(id=question_id)
        except SuperlativeQuestion.DoesNotExist:
            raise CommandError(f"No award/player-pick question with id {question_id}.")

        if rookies:
            hidden, keep_existing = self._non_rookies(question, dry_run), False
        else:
            hidden, keep_existing = self._past_all_stars(question, delay)

        if dry_run:
            self.stdout.write(f"Dry run: would hide {len(hidden)} players. Nothing saved.")
            return
        if keep_existing:
            # Some players couldn't be checked; keep their earlier exclusions.
            question.excluded_players.add(*hidden)
        else:
            question.excluded_players.set(hidden)
        self.stdout.write(self.style.SUCCESS(
            f"Question {question.id} now hides {question.excluded_players.count()} players from its pick list."
        ))

    def _non_rookies(self, question, dry_run):
        from nba_api.stats.endpoints import commonallplayers

        start_year = question.season.year[:4]  # "2026-27" -> "2026"
        roster = commonallplayers.CommonAllPlayers(is_only_current_season=1, timeout=30).get_data_frames()[0]
        rookies = roster[roster["FROM_YEAR"].astype(str) == start_year]
        if rookies.empty:
            raise CommandError(f"NBA.com lists no players whose first season is {question.season.year}.")

        rookie_ids = set(int(pid) for pid in rookies["PERSON_ID"])
        known = set(Player.objects.filter(nba_player_id__in=rookie_ids).values_list("nba_player_id", flat=True))
        missing = rookies[~rookies["PERSON_ID"].astype(int).isin(known)]
        if len(missing):
            names = ", ".join(missing["DISPLAY_FIRST_LAST"])
            self.stdout.write(f"{'Would add' if dry_run else 'Adding'} {len(missing)} rookies missing from the player list: {names}")
            if not dry_run:
                Player.objects.bulk_create([
                    Player(name=row.DISPLAY_FIRST_LAST, nba_player_id=int(row.PERSON_ID))
                    for row in missing.itertuples()
                ])
        self.stdout.write(f"{len(rookie_ids)} rookies stay in the pick list.")
        # Players without an NBA.com ID can't be confirmed as rookies, so they're hidden too.
        return list(Player.objects.exclude(nba_player_id__in=rookie_ids))

    def _past_all_stars(self, question, delay):
        from nba_api.stats.endpoints import playerawards

        # Seasons sort as strings ("2025-26" < "2026-27"); the question's own
        # season is the one being predicted, so it never counts.
        before = question.season.year
        players = Player.objects.filter(nba_player_id__isnull=False).order_by("name")
        self.stdout.write(f"Checking {players.count()} players for All-Star selections before {before}...")

        hidden, failed = [], []
        for player in players:
            try:
                awards = playerawards.PlayerAwards(player_id=player.nba_player_id, timeout=30).get_data_frames()[0]
            except Exception as exc:  # network hiccups shouldn't lose the whole run
                failed.append(f"{player.name} ({exc.__class__.__name__})")
                continue
            finally:
                time.sleep(delay)
            seasons = awards.loc[awards["DESCRIPTION"] == "NBA All-Star", "SEASON"]
            if any(season < before for season in seasons):
                hidden.append(player)

        self.stdout.write(f"Past All-Stars ({len(hidden)}): {', '.join(p.name for p in hidden)}")
        if failed:
            self.stdout.write(self.style.WARNING(
                f"Could not check {len(failed)} players; rerun to retry them: {', '.join(failed)}"
            ))
        return hidden, bool(failed)
