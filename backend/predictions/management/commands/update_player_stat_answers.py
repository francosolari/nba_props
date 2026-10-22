"""
Set point-in-time correct answers for player stat questions from the NBA API.

Covers player over/under props (PropQuestion.stat + line, e.g. Trae Young
assists per game) and player head-to-heads (e.g. "Who makes more threes,
LaMelo or Ant?"). The answers move until the season ends: run this, then
grade_props_answers, whenever stats should refresh.

Usage:
    python manage.py update_player_stat_answers [season-slug] [--dry-run]

Like update_season_standings, this has to run where stats.nba.com is
reachable, which is not the production server.
"""
import re
import sys
import os

from django.core.management.base import BaseCommand, CommandError

from predictions.models import Season, PropQuestion, HeadToHeadQuestion

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../..'))


def _per_game(column):
    return lambda row: row[column] / row['GP'] if row['GP'] else None


# PropQuestion.stat values (frontend statProps.js) -> value from a
# LeagueDashPlayerStats Totals row. Per-game stats are averages, as the
# admin form labels them.
PROP_STATS = {
    'points': _per_game('PTS'),
    'rebounds': _per_game('REB'),
    'assists': _per_game('AST'),
    'pra': lambda row: (row['PTS'] + row['REB'] + row['AST']) / row['GP'] if row['GP'] else None,
    'steals': _per_game('STL'),
    'blocks': _per_game('BLK'),
    'threes': lambda row: row['FG3M'],
    'games': lambda row: row['GP'],
    'fg_pct': lambda row: row['FG_PCT'],
    'three_pct': lambda row: row['FG3_PCT'],
}

# Head-to-heads carry no stat field, only text, and compare season totals
# ("who makes more threes"). Threes come first so "3-pointers" isn't read as points.
H2H_STAT_PATTERNS = [
    (re.compile(r'\b(three|threes|3s|3pm|3-point|3pt)', re.I), 'FG3M'),
    (re.compile(r'assist', re.I), 'AST'),
    (re.compile(r'rebound', re.I), 'REB'),
    (re.compile(r'steal', re.I), 'STL'),
    (re.compile(r'block', re.I), 'BLK'),
    (re.compile(r'point', re.I), 'PTS'),
]


# Season totals can't answer a split ("points per game against the Spurs").
SPLIT_PATTERN = re.compile(r'\bagainst\b|\bvs\.? the\b|\bin the playoffs\b|\bat home\b|\bon the road\b', re.I)


OPPONENT_PATTERN = re.compile(r'\b(?:against|vs\.?) the ([A-Za-z0-9 .]+)', re.I)
PLAYOFFS_PATTERN = re.compile(r'post-?season|playoff', re.I)


def opponent_abbreviation(text, nba_teams):
    """Abbreviation of the team after "against the ...", e.g. SAS for the Spurs."""
    match = OPPONENT_PATTERN.search(text or '')
    if not match:
        return None
    words = match.group(1).lower()
    for team in nba_teams:
        if re.search(rf"\b{re.escape(team['nickname'].lower())}\b", words):
            return team['abbreviation']
    return None


def totals_from_games(games):
    """Sum game-log rows into the same shape as a season totals row."""
    row = {col: sum(g[col] for g in games) for col in ('PTS', 'REB', 'AST', 'STL', 'BLK', 'FG3M', 'FGM', 'FGA', 'FG3A')}
    row['GP'] = len(games)
    row['FG_PCT'] = row['FGM'] / row['FGA'] if row['FGA'] else None
    row['FG3_PCT'] = row['FG3M'] / row['FG3A'] if row['FG3A'] else None
    return row


def h2h_stat_column(text):
    for pattern, column in H2H_STAT_PATTERNS:
        if pattern.search(text or ''):
            return column
    return None


def prop_answer(stat, line, row):
    """'Over'/'Under' for a player prop, or None when it can't be called yet."""
    value_fn = PROP_STATS.get(stat)
    if value_fn is None or line is None or row is None:
        return None, None
    value = value_fn(row)
    if value is None or value == line:
        return None, value
    return ('Over' if value > line else 'Under'), value


def h2h_answer(column, player1, row1, player2, row2):
    """Name of the player ahead on a season total, or None on a tie / missing data."""
    value1 = row1[column] if row1 is not None else 0
    value2 = row2[column] if row2 is not None else 0
    if value1 == value2:
        return None, value1, value2
    return (player1.name if value1 > value2 else player2.name), value1, value2


class Command(BaseCommand):
    help = 'Set point-in-time answers for player props and player head-to-heads from the NBA API'

    def add_arguments(self, parser):
        parser.add_argument('season_slug', nargs='?', default='current', type=str)
        parser.add_argument('--dry-run', action='store_true', help='Print answers without saving')

    def handle(self, *args, **options):
        if options['season_slug'] == 'current':
            season = Season.objects.order_by('-start_date').first()
            if not season:
                raise CommandError('No seasons found.')
        else:
            try:
                season = Season.objects.get(slug=options['season_slug'])
            except Season.DoesNotExist:
                raise CommandError(f'Season with slug "{options["season_slug"]}" does not exist.')

        from nba_stats import fetch_player_season_totals
        self.stdout.write(f'Fetching {season.slug} player totals from NBA API...')
        stats = fetch_player_season_totals(season.slug)
        rows = stats.to_dict('records')
        by_id = {int(row['PLAYER_ID']): row for row in rows}
        by_name = {row['PLAYER_NAME'].lower(): row for row in rows}

        def row_for(player):
            if player is None:
                return None
            return by_id.get(player.nba_player_id) or by_name.get(player.name.lower())

        from nba_api.stats.static import teams as nba_teams_static
        from nba_stats import fetch_player_games_vs
        nba_teams = nba_teams_static.get_teams()

        def opponent_row(player, opponent, include_playoffs):
            row = row_for(player)
            if row is None:
                return None
            games = fetch_player_games_vs(int(row['PLAYER_ID']), season.slug, opponent, include_playoffs)
            return totals_from_games(games) if games else None

        changes = []
        for q in PropQuestion.objects.filter(season=season, outcome_type='over_under', is_finalized=False).exclude(stat='').select_related('related_player'):
            opponent = opponent_abbreviation(q.text, nba_teams)
            if opponent:
                row = opponent_row(q.related_player, opponent, bool(PLAYOFFS_PATTERN.search(q.text)))
            elif SPLIT_PATTERN.search(q.text):
                self.stdout.write(self.style.WARNING(f'  skip  {q.text!r} (split stat, grade by hand)'))
                continue
            else:
                row = row_for(q.related_player)
            answer, value = prop_answer(q.stat, q.line, row)
            if answer is None:
                self.stdout.write(self.style.WARNING(f'  skip  {q.text!r} (stat={q.stat}, value={value})'))
                continue
            self.stdout.write(f'  prop  {q.text!r}: {value:.2f} vs {q.line} -> {answer}')
            changes.append((q, answer))

        for q in HeadToHeadQuestion.objects.filter(season=season, player1__isnull=False, is_finalized=False).select_related('player1', 'player2'):
            column = h2h_stat_column(q.text)
            if column is None:
                self.stdout.write(self.style.WARNING(f'  skip  {q.text!r} (no stat recognised in text)'))
                continue
            answer, v1, v2 = h2h_answer(column, q.player1, row_for(q.player1), q.player2, row_for(q.player2))
            line = f'{q.text!r}: {q.player1.name} {v1} vs {q.player2.name} {v2} {column}'
            if answer is None:
                self.stdout.write(self.style.WARNING(f'  tie   {line} (answer cleared)'))
            else:
                self.stdout.write(f'  h2h   {line} -> {answer}')
            changes.append((q, answer))

        if options['dry_run']:
            self.stdout.write(self.style.WARNING('Dry run: nothing saved.'))
            return

        for q, answer in changes:
            if q.correct_answer != answer:
                q.correct_answer = answer
                q.save(update_fields=['correct_answer', 'last_updated'])
        self.stdout.write(self.style.SUCCESS(
            f'Updated {len(changes)} questions. Run grade_props_answers {season.slug} to rescore.'
        ))
