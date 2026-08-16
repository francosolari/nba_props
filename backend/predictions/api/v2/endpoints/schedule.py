"""
NBA Schedule API Endpoints

A thin HTTP surface over `predictions.services.nba_schedule`. The service owns
the crawling, caching, and normalisation; this module only chooses which view of
the season to serve and shapes the response.

Endpoints:
- GET /schedule - Upcoming, recent, live, or date-ranged games for a season
"""

import datetime
from typing import List, Optional

from ninja import Router
from django.utils import timezone
from pydantic import BaseModel, Field

from predictions.models import Season
from predictions.services.nba_schedule import NBAScheduleService, ScheduleUnavailable

router = Router(tags=["Schedule"])


def _resolve_season(season_slug):
    """Resolve an explicit slug, falling back to the most recent season."""
    if season_slug and season_slug not in ('current', 'latest'):
        return Season.objects.filter(slug=season_slug).first()
    return Season.objects.order_by('-start_date').first()


def _parse_date(value):
    """Accept an ISO date from a query string, ignoring anything unparseable."""
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        return None


class ScheduleGameTeamSchema(BaseModel):
    id: Optional[int] = None
    name: str = ''
    city: str = ''
    nickname: str = ''
    tricode: str = ''
    slug: str = ''
    wins: int = 0
    losses: int = 0
    score: int = 0


class ScheduleGameSchema(BaseModel):
    game_id: str
    game_type: str = ''
    tipoff: str
    status: str = 'scheduled'
    status_text: str = ''
    label: str = ''
    sub_label: str = ''
    arena: str = ''
    arena_city: str = ''
    national_tv: str = ''
    home: ScheduleGameTeamSchema
    away: ScheduleGameTeamSchema


class ScheduleScheduleSchema(BaseModel):
    season: Optional[str] = None
    mode: str = 'upcoming'
    games: List[ScheduleGameSchema] = Field(default_factory=list)
    unavailable: bool = False


@router.get(
    "/schedule",
    response={200: ScheduleScheduleSchema},
    summary="Get Upcoming NBA Games",
    description="""
    Upcoming NBA games for a season, sourced from nba_api's ScheduleLeagueV2.

    Only games that have not tipped off are returned, ordered by tip-off time.
    The reduced schedule is cached for an hour; when the upstream feed cannot be
    reached the response reports `unavailable` with an empty list so the
    homepage can drop the section rather than show an error.
    """
)
def get_upcoming_games(
    request,
    season_slug: str = None,
    limit: int = 6,
    mode: str = 'upcoming',
    start_date: str = None,
    end_date: str = None,
    offset: int = 0,
):
    """
    Serve one of the schedule views for the requested season.

    `mode` selects the shape the caller needs: `upcoming` for a rail or ticker,
    `recent` for finished results, `live` for games in progress, and `range`
    with `start_date`/`end_date` for day listings and paged browsers.
    """
    season = _resolve_season(season_slug)
    if not season:
        return ScheduleScheduleSchema()

    service = NBAScheduleService(season.year)
    limit = max(1, min(limit, 100))

    try:
        if mode == 'range':
            start = _parse_date(start_date) or timezone.localdate()
            end = _parse_date(end_date) or start
            games = service.between(start, end, limit=limit, offset=max(offset, 0))
        elif mode == 'recent':
            games = service.recent(limit=limit)
        elif mode == 'live':
            games = service.live()
        else:
            games = service.upcoming(limit=limit)
    except ScheduleUnavailable:
        return ScheduleScheduleSchema(season=season.year, mode=mode, unavailable=True)

    return ScheduleScheduleSchema(
        season=season.year,
        mode=mode,
        games=[ScheduleGameSchema(**game) for game in games],
    )


