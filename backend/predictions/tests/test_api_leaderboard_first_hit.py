"""
Regression test for a first-hit (cold-cache) N+1 in the leaderboard
computation, independent of the response caching added separately.

_build_leaderboard's prop-question prefetch loop does:

    PropQuestion.objects.filter(season__slug=season_slug)
        .only("id", "line", "outcome_type")

Because PropQuestion is a django-polymorphic multi-table-inheritance
subclass of Question, `.only()` defers every field not listed --
including the inherited `polymorphic_ctype_id` column. Something in
PolymorphicModel's instantiation path touches that deferred field per
row, so Django silently issues one extra query per PropQuestion to
re-fetch it. The short-TTL cache added elsewhere only helps the 2nd+
request within 60s; this bug hits every single first request, and gets
worse every week as a season accumulates more prop questions.
"""
import pytest
from django.core.cache import cache
from django.test import Client
from django.test.utils import CaptureQueriesContext
from django.db import connection

from predictions.tests.factories import (
    CurrentSeasonFactory,
    UserFactory,
    AnswerFactory,
    PropQuestionFactory,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return Client()


def _first_hit_query_count(api_client, season):
    cache.clear()  # force a cold-cache, first-ever-hit request
    with CaptureQueriesContext(connection) as ctx:
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')
    assert response.status_code == 200
    return len(ctx.captured_queries)


def _seed_season_with_prop_questions(n):
    season = CurrentSeasonFactory()
    user = UserFactory()
    for i in range(n):
        question = PropQuestionFactory(
            season=season, outcome_type='yes_no', point_value=3,
            correct_answer='Yes', text=f'Prop {i}',
        )
        AnswerFactory(user=user, question=question, answer='Yes', points_earned=3, is_correct=True)
    return season


class TestLeaderboardFirstHitDoesNotScaleWithQuestionCount:
    """
    Each case is asserted against the same fixed cap independently, rather
    than comparing two calls within one test: a second call in the same test
    process can look cheaper than the first regardless of data size, because
    process-level framework caches unrelated to this endpoint (e.g. Django's
    ContentType cache, used internally by django-polymorphic) warm up after
    the first request. A real per-row N+1 blows straight through a fixed cap
    once N is large enough, regardless of that effect.
    """

    QUERY_CAP = 20

    def test_small_season(self, api_client):
        season = _seed_season_with_prop_questions(3)
        count = _first_hit_query_count(api_client, season)
        assert count <= self.QUERY_CAP, count

    def test_large_season(self, api_client):
        # A season 10x the size (this is realistic -- a full season can
        # easily carry 30-50 prop questions by playoffs).
        season = _seed_season_with_prop_questions(30)
        count = _first_hit_query_count(api_client, season)
        assert count <= self.QUERY_CAP, count
