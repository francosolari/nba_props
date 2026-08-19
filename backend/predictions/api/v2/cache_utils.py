"""
Lightweight caching helpers for expensive, season-scoped read endpoints
(leaderboard, IST leaderboard, homepage data).

These use Django's configured cache backend (LocMemCache by default -- no
extra infrastructure required) with a short TTL, the same pattern already
used for the submissions questions cache and the answer lookup tables. The
computation being cached does not vary by requesting user, so caching it is
safe even though whether a given user is *allowed to see* the result does
vary (see ``results_visible``); callers must still apply that visibility
check themselves after reading from cache.
"""
from django.core.cache import cache

# Matches the TTL already used for the submissions questions cache
# (QUESTIONS_CACHE_TTL in user_submissions.py) so staleness behaves
# consistently across the app.
LEADERBOARD_CACHE_TTL = 60
IST_LEADERBOARD_CACHE_TTL = 60
HOMEPAGE_CACHE_TTL = 60

LEADERBOARD_CACHE_KEY = "leaderboard:v1:{season_slug}"
IST_LEADERBOARD_CACHE_KEY = "ist_leaderboard:v1:{season_slug}"
HOMEPAGE_CACHE_KEY = "homepage:v1:{season_slug}"


def invalidate_leaderboard_caches(season_slug: str) -> None:
    """
    Drop the cached leaderboard/homepage bundles for a season.

    Call this after anything that changes graded points or official
    standings for the season (grading commands, manual grade overrides,
    standings refreshes) so the next read recomputes fresh data instead of
    waiting out the TTL.
    """
    if not season_slug:
        return
    cache.delete_many([
        LEADERBOARD_CACHE_KEY.format(season_slug=season_slug),
        IST_LEADERBOARD_CACHE_KEY.format(season_slug=season_slug),
        HOMEPAGE_CACHE_KEY.format(season_slug=season_slug),
    ])
