"""
Tests for the short-TTL caching added to the leaderboard, IST leaderboard,
and homepage endpoints.

These endpoints recompute their payload from scratch on every request even
though the underlying graded data rarely changes between page views. The
computation (not the per-user visibility gate) is now cached briefly via
Django's default cache backend, the same pattern already used for the
submissions questions cache. These tests verify:

1. A repeat request for the same season is served from cache (far fewer
   queries than the first request).
2. Grading actions invalidate the cache so updated points show up
   immediately rather than waiting out the TTL.
"""
import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.test import Client
from django.test.utils import CaptureQueriesContext
from django.db import connection

from predictions.tests.factories import (
    CurrentSeasonFactory,
    EasternTeamFactory,
    WesternTeamFactory,
    UserFactory,
    AnswerFactory,
    PropQuestionFactory,
    InSeasonTournamentQuestionFactory,
    UserStatsFactory,
)
from predictions.models import RegularSeasonStandings, Answer
from predictions.api.v2.cache_utils import (
    invalidate_leaderboard_caches,
    LEADERBOARD_CACHE_KEY,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return Client()


def _num_queries(callable_fn):
    with CaptureQueriesContext(connection) as ctx:
        response = callable_fn()
    assert response.status_code == 200
    return response, len(ctx.captured_queries)


class TestLeaderboardCaching:
    def _seed(self):
        season = CurrentSeasonFactory()
        user = UserFactory()
        question = PropQuestionFactory(season=season, point_value=5, correct_answer='Yes')
        answer = AnswerFactory(user=user, question=question, answer='Yes', points_earned=5, is_correct=True)
        return season, user, question, answer

    def test_second_request_is_served_from_cache(self, api_client):
        season, *_ = self._seed()
        url = f'/api/v2/leaderboards/{season.slug}'

        _, first_count = _num_queries(lambda: api_client.get(url))
        _, second_count = _num_queries(lambda: api_client.get(url))

        assert second_count < first_count
        # A cache hit only needs to resolve the season row itself.
        assert second_count <= 3

    def test_cache_invalidation_reflects_new_points_immediately(self, api_client):
        season, user, question, answer = self._seed()
        url = f'/api/v2/leaderboards/{season.slug}'

        first = api_client.get(url)
        first_entry = next(u for u in first.json()['leaderboard'] if u['username'] == user.username)
        assert first_entry['total_points'] == 5

        # Simulate a grading correction, as manual_grade_answer / the grading
        # commands would perform, followed by their cache invalidation call.
        answer.points_earned = 9
        answer.save(update_fields=['points_earned'])
        invalidate_leaderboard_caches(season.slug)

        second = api_client.get(url)
        second_entry = next(u for u in second.json()['leaderboard'] if u['username'] == user.username)
        assert second_entry['total_points'] == 9

    def test_without_invalidation_stale_cache_is_served(self, api_client):
        """Sanity check that the cache is actually taking effect."""
        season, user, question, answer = self._seed()
        url = f'/api/v2/leaderboards/{season.slug}'

        api_client.get(url)

        answer.points_earned = 9
        answer.save(update_fields=['points_earned'])
        # No invalidation this time.

        stale = api_client.get(url)
        stale_entry = next(u for u in stale.json()['leaderboard'] if u['username'] == user.username)
        assert stale_entry['total_points'] == 5  # still the cached, pre-update value


class TestGradingCommandInvalidatesCache:
    """
    grade_props_answers (and its siblings) mutate points outside the API, so
    they must invalidate the leaderboard cache themselves -- otherwise an
    admin re-grading a season would see stale results for up to the cache's
    TTL after running the command.
    """

    def test_grade_props_answers_invalidates_leaderboard_cache(self):
        season = CurrentSeasonFactory()
        user = UserFactory()
        question = PropQuestionFactory(
            season=season,
            outcome_type='yes_no',
            point_value=3,
            correct_answer='Yes',
        )
        Answer.objects.create(user=user, question=question, answer='Yes')

        # Prime the cache with a stale value, as a prior page view would.
        cache_key = LEADERBOARD_CACHE_KEY.format(season_slug=season.slug)
        cache.set(cache_key, [{'stale': True}], timeout=60)

        call_command('grade_props_answers', season.slug)

        assert cache.get(cache_key) is None


class TestISTLeaderboardCaching:
    def _seed(self):
        season = CurrentSeasonFactory()
        user = UserFactory()
        question = InSeasonTournamentQuestionFactory(
            season=season,
            text='Who wins East Group A?',
            prediction_type='group_winner',
            ist_group='East Group A',
            point_value=4,
            correct_answer='Team A',
        )
        answer = AnswerFactory(user=user, question=question, answer='Team A', points_earned=4, is_correct=True)
        return season, user, question, answer

    def test_second_request_is_served_from_cache(self, api_client):
        season, *_ = self._seed()
        url = f'/api/v2/leaderboards/ist/{season.slug}'

        _, first_count = _num_queries(lambda: api_client.get(url))
        _, second_count = _num_queries(lambda: api_client.get(url))

        assert second_count < first_count
        assert second_count <= 3

    def test_cache_invalidation_reflects_new_points_immediately(self, api_client):
        season, user, question, answer = self._seed()
        url = f'/api/v2/leaderboards/ist/{season.slug}'

        first = api_client.get(url)
        first_entry = next(u for u in first.json()['leaderboard'] if u['user']['username'] == user.username)
        assert first_entry['total_points'] == 4

        answer.points_earned = 7
        answer.save(update_fields=['points_earned'])
        invalidate_leaderboard_caches(season.slug)

        second = api_client.get(url)
        second_entry = next(u for u in second.json()['leaderboard'] if u['user']['username'] == user.username)
        assert second_entry['total_points'] == 7


class TestHomepageCaching:
    def _seed(self):
        season = CurrentSeasonFactory()
        user = UserFactory()
        stats = UserStatsFactory(user=user, season=season, points=10)
        east = EasternTeamFactory()
        west = WesternTeamFactory()
        RegularSeasonStandings.objects.create(season=season, team=east, position=1, wins=50, losses=32)
        RegularSeasonStandings.objects.create(season=season, team=west, position=1, wins=48, losses=34)
        return season, user, stats

    def test_second_request_is_served_from_cache(self, api_client):
        season, *_ = self._seed()
        url = f'/api/v2/homepage/data?season_slug={season.slug}'

        _, first_count = _num_queries(lambda: api_client.get(url))
        _, second_count = _num_queries(lambda: api_client.get(url))

        assert second_count < first_count

    def test_cache_invalidation_reflects_new_points_immediately(self, api_client):
        season, user, stats = self._seed()
        url = f'/api/v2/homepage/data?season_slug={season.slug}'

        first = api_client.get(url)
        assert first.json()['mini_leaderboard'][0]['points'] == 10

        stats.points = 25
        stats.save(update_fields=['points'])
        invalidate_leaderboard_caches(season.slug)

        second = api_client.get(url)
        assert second.json()['mini_leaderboard'][0]['points'] == 25
