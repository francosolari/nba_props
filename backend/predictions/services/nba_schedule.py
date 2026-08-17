"""
NBA schedule crawler.

A single cached reader over nba_api's ``ScheduleLeagueV2`` feed, normalised into
plain dictionaries so any surface can consume it: the homepage rail, a scrolling
ticker, a day-by-day listing, or a paged schedule browser.

The upstream feed is slow, rate limited, and occasionally unreachable. Every
public method therefore reads through a cache and raises
:class:`ScheduleUnavailable` rather than a transport error, so callers can decide
whether to omit a section or surface a message.

Usage::

    from predictions.services.nba_schedule import NBAScheduleService

    service = NBAScheduleService("2025-26")
    service.upcoming(limit=5)                  # next games about to tip
    service.for_date(date(2026, 1, 14))        # one day's slate
    service.between(start, end)                # a range, for paging
    service.recent(limit=10)                   # last finished games
"""

from __future__ import annotations

import datetime as dt
import logging
from typing import Iterable, List, Optional

from django.core.cache import cache

logger = logging.getLogger(__name__)

CACHE_PREFIX = 'nba-schedule'
CACHE_SECONDS = 60 * 60
FAILURE_CACHE_SECONDS = 5 * 60
REQUEST_TIMEOUT_SECONDS = 20

# Game ids encode the game type in their first three characters.
GAME_TYPES = {
    '001': 'preseason',
    '002': 'regular',
    '003': 'allstar',
    '004': 'playoffs',
    '005': 'playin',
}
COMPETITIVE_TYPES = ('regular', 'playoffs', 'playin')

# ScheduleLeagueV2 gameStatus values.
STATUS_SCHEDULED = 1
STATUS_LIVE = 2
STATUS_FINAL = 3
STATUS_NAMES = {STATUS_SCHEDULED: 'scheduled', STATUS_LIVE: 'live', STATUS_FINAL: 'final'}


class ScheduleUnavailable(RuntimeError):
    """The upstream schedule feed could not be read."""


def _team(row, columns, side):
    """Normalise one side of a game row into a team dict."""

    def value(name, default=None):
        index = columns.get(f'{side}Team_{name}')
        return row[index] if index is not None else default

    city = value('teamCity', '') or ''
    name = value('teamName', '') or ''
    return {
        'id': value('teamId'),
        'name': f'{city} {name}'.strip(),
        'city': city,
        'nickname': name,
        'tricode': value('teamTricode', '') or '',
        'slug': value('teamSlug', '') or '',
        'wins': value('wins', 0) or 0,
        'losses': value('losses', 0) or 0,
        'score': value('score', 0) or 0,
    }


def _normalise(row, columns):
    """Reduce one raw schedule row to the fields any surface would want."""

    def value(name, default=None):
        index = columns.get(name)
        return row[index] if index is not None else default

    game_id = str(value('gameId', '') or '')
    status = value('gameStatus')

    return {
        'game_id': game_id,
        'game_type': GAME_TYPES.get(game_id[:3], 'other'),
        'tipoff': value('gameDateTimeUTC') or '',
        'status': STATUS_NAMES.get(status, 'scheduled'),
        'status_text': value('gameStatusText', '') or '',
        'label': value('gameLabel', '') or '',
        'sub_label': value('gameSubLabel', '') or '',
        'arena': value('arenaName', '') or '',
        'arena_city': value('arenaCity', '') or '',
        'national_tv': value('nationalBroadcasters_0_broadcasterAbbreviation', '') or '',
        'home': _team(row, columns, 'home'),
        'away': _team(row, columns, 'away'),
    }


class NBAScheduleService:
    """Cached, normalised access to one season's NBA schedule."""

    def __init__(self, season_year: str, *, timeout: int = REQUEST_TIMEOUT_SECONDS):
        self.season_year = season_year
        self.timeout = timeout

    # -- fetching ---------------------------------------------------------

    @property
    def _cache_key(self) -> str:
        return f'{CACHE_PREFIX}:{self.season_year}'

    def _crawl(self) -> List[dict]:
        from nba_api.stats.endpoints.scheduleleaguev2 import ScheduleLeagueV2

        raw = ScheduleLeagueV2(
            season=self.season_year, timeout=self.timeout
        ).season_games.get_dict()
        columns = {name: index for index, name in enumerate(raw['headers'])}
        games = [_normalise(row, columns) for row in raw['data']]
        games = [game for game in games if game['tipoff']]
        games.sort(key=lambda game: game['tipoff'])
        return games

    def games(self, *, refresh: bool = False) -> List[dict]:
        """
        Every game in the season, ascending by tip-off.

        Raises :class:`ScheduleUnavailable` when the feed cannot be read; a
        failure is cached briefly so a slow upstream is not hammered.
        """
        if not refresh:
            cached = cache.get(self._cache_key)
            if cached is not None:
                if cached == []:
                    raise ScheduleUnavailable(self.season_year)
                return cached

        try:
            games = self._crawl()
        except Exception as exc:
            logger.warning('NBA schedule unavailable for %s', self.season_year, exc_info=True)
            cache.set(self._cache_key, [], FAILURE_CACHE_SECONDS)
            raise ScheduleUnavailable(self.season_year) from exc

        cache.set(self._cache_key, games, CACHE_SECONDS)
        return games

    # -- views over the season -------------------------------------------

    def _filtered(self, game_types: Optional[Iterable[str]]) -> List[dict]:
        games = self.games()
        if game_types is None:
            return games
        wanted = set(game_types)
        return [game for game in games if game['game_type'] in wanted]

    def upcoming(self, *, limit: int = 6, after: Optional[dt.datetime] = None,
                 game_types: Optional[Iterable[str]] = COMPETITIVE_TYPES) -> List[dict]:
        """Games that have not tipped off yet, soonest first."""
        cutoff = _iso(after) if after else _now_iso()
        games = [
            game for game in self._filtered(game_types)
            if game['status'] == 'scheduled' and game['tipoff'] >= cutoff
        ]
        return games[:limit] if limit else games

    def recent(self, *, limit: int = 6, before: Optional[dt.datetime] = None,
               game_types: Optional[Iterable[str]] = COMPETITIVE_TYPES) -> List[dict]:
        """Finished games, most recent first — for results tickers."""
        cutoff = _iso(before) if before else _now_iso()
        games = [
            game for game in self._filtered(game_types)
            if game['status'] == 'final' and game['tipoff'] <= cutoff
        ]
        games.reverse()
        return games[:limit] if limit else games

    def live(self, *, game_types: Optional[Iterable[str]] = COMPETITIVE_TYPES) -> List[dict]:
        """Games currently in progress."""
        return [game for game in self._filtered(game_types) if game['status'] == 'live']

    def between(self, start: dt.date, end: dt.date, *, limit: Optional[int] = None,
                offset: int = 0,
                game_types: Optional[Iterable[str]] = COMPETITIVE_TYPES) -> List[dict]:
        """
        Games tipping off within an inclusive date range, for day listings and
        paged browsers. ``offset`` and ``limit`` page through the result.
        """
        start_iso = f'{start.isoformat()}T00:00:00Z'
        end_iso = f'{(end + dt.timedelta(days=1)).isoformat()}T00:00:00Z'
        games = [
            game for game in self._filtered(game_types)
            if start_iso <= game['tipoff'] < end_iso
        ]
        games = games[offset:]
        return games[:limit] if limit else games

    def for_date(self, day: dt.date, **kwargs) -> List[dict]:
        """One day's slate."""
        return self.between(day, day, **kwargs)


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')


def _iso(moment: dt.datetime) -> str:
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=dt.timezone.utc)
    return moment.astimezone(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
