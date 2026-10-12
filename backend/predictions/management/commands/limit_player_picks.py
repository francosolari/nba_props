"""
Limit a player-pick question's dropdown to the players who qualify, by
hiding everyone else (SuperlativeQuestion.excluded_players).

  --past-all-stars  "Name a first-time All-Star": hide anyone picked for an
                    earlier All-Star Game, plus players not on a current
                    roster. Two requests: Wikipedia's List of NBA All-Stars
                    and the NBA.com roster.
  --rookies         "First rookie to ...": show only players whose first
                    NBA season is the question's season. One API call; adds
                    any rookie missing from the Player table.

stats.nba.com blocks the production server, so run this from a local
machine pointed at the production database (npm run db:prod).

Usage:
    python manage.py limit_player_picks <question_id> --rookies [--dry-run]
"""

import html
import re
import unicodedata

from django.core.management.base import BaseCommand, CommandError

from predictions.models import Player, SuperlativeQuestion


ALL_STARS_PAGE = "List of NBA All-Stars"


def normalize_name(name):
    """'Nikola Jokić' and 'Jaren Jackson Jr.' match 'nikola jokic' / 'jaren jackson'."""
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    name = re.sub(r"[^a-z ]", "", name)
    return " ".join(word for word in name.split() if word not in {"jr", "sr", "ii", "iii", "iv"})


def all_star_first_games():
    """{normalized name: year of first All-Star Game} for every All-Star ever."""
    import requests

    response = requests.get(
        "https://en.wikipedia.org/w/api.php",
        params={"action": "parse", "page": ALL_STARS_PAGE, "prop": "text", "format": "json", "formatversion": 2},
        headers={"User-Agent": "nba-props-admin/1.0 (player pick setup)"},
        timeout=30,
    )
    response.raise_for_status()
    page = response.json()["parse"]["text"]
    first_games = {}
    for row in re.findall(r"<tr>(.*?)</tr>", page, re.S):
        name = re.search(r'class="fn"><a [^>]*>([^<]+)</a>', row)
        years = [int(year) for year in re.findall(r"/wiki/(\d{4})_NBA_All-Star_Game", row)]
        if name and years:
            first_games[normalize_name(html.unescape(name.group(1)))] = min(years)
    if len(first_games) < 300:
        raise RuntimeError(f"Only parsed {len(first_games)} All-Stars from Wikipedia; the page layout may have changed.")
    return first_games


def current_roster():
    """Every player on an NBA roster this season, with their first season."""
    from nba_api.stats.endpoints import commonallplayers

    return commonallplayers.CommonAllPlayers(is_only_current_season=1, timeout=30).get_data_frames()[0]


class Command(BaseCommand):
    help = "Hide players who don't qualify from a player-pick question's dropdown."

    def add_arguments(self, parser):
        parser.add_argument("question_id", type=int)
        mode = parser.add_mutually_exclusive_group(required=True)
        mode.add_argument("--past-all-stars", action="store_true", help="Hide earlier All-Stars.")
        mode.add_argument("--rookies", action="store_true", help="Show only this season's rookies.")
        parser.add_argument("--dry-run", action="store_true", help="Report without saving.")

    def handle(self, *args, question_id, past_all_stars, rookies, dry_run, **options):
        try:
            question = SuperlativeQuestion.objects.select_related("season").get(id=question_id)
        except SuperlativeQuestion.DoesNotExist:
            raise CommandError(f"No award/player-pick question with id {question_id}.")

        if rookies:
            hidden, keep_existing = self._non_rookies(question, dry_run), False
        else:
            hidden, keep_existing = self._past_all_stars(question)

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
        start_year = question.season.year[:4]  # "2026-27" -> "2026"
        roster = current_roster()
        rookies = roster[roster["FROM_YEAR"].astype(str) == start_year]
        if rookies.empty:
            raise CommandError(f"NBA.com lists no players whose first season is {question.season.year}.")

        rookie_ids = set(int(pid) for pid in rookies["PERSON_ID"])
        known = set(Player.objects.filter(nba_player_id__in=rookie_ids).values_list("nba_player_id", flat=True))
        missing = rookies[~rookies["PERSON_ID"].astype(int).isin(known)]
        # A rookie added earlier by name only gets the NBA.com ID attached
        # instead of a second Player row.
        unlinked = {normalize_name(p.name): p for p in Player.objects.filter(nba_player_id__isnull=True)}
        to_link, to_add = [], []
        for row in missing.itertuples():
            existing = unlinked.get(normalize_name(row.DISPLAY_FIRST_LAST))
            if existing:
                existing.nba_player_id = int(row.PERSON_ID)
                to_link.append(existing)
            else:
                to_add.append(Player(name=row.DISPLAY_FIRST_LAST, nba_player_id=int(row.PERSON_ID)))
        verb = "Would" if dry_run else "Will"
        if to_link:
            self.stdout.write(f"{verb} link NBA.com IDs to {len(to_link)} existing rookies: {', '.join(p.name for p in to_link)}")
        if to_add:
            self.stdout.write(f"{verb} add {len(to_add)} rookies missing from the player list: {', '.join(p.name for p in to_add)}")
        if not dry_run:
            Player.objects.bulk_update(to_link, ["nba_player_id"])
            Player.objects.bulk_create(to_add)
        self.stdout.write(f"{len(rookie_ids)} rookies stay in the pick list.")
        # Players without an NBA.com ID can't be confirmed as rookies, so they're hidden too.
        return list(Player.objects.exclude(nba_player_id__in=rookie_ids))

    def _past_all_stars(self, question):
        # An All-Star Game falls in the second calendar year of its season, so
        # for 2026-27 any game in 2026 or earlier is a past selection.
        last_past_game = int(question.season.year[:4])
        first_games = all_star_first_games()
        rostered = set(int(pid) for pid in current_roster()["PERSON_ID"])

        # Nobody off a current roster can make the team, so they're hidden too.
        unrostered = list(Player.objects.exclude(nba_player_id__in=rostered))
        past_all_stars = [
            player for player in Player.objects.filter(nba_player_id__in=rostered).order_by("name")
            if first_games.get(normalize_name(player.name), 9999) <= last_past_game
        ]
        self.stdout.write(f"Read {len(first_games)} All-Stars from Wikipedia.")
        self.stdout.write(f"Hiding {len(unrostered)} players not on a current roster.")
        self.stdout.write(f"Past All-Stars on rosters ({len(past_all_stars)}): {', '.join(p.name for p in past_all_stars)}")
        return unrostered + past_all_stars, False
