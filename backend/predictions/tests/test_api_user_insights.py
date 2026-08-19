"""
Tests for the interesting-stats endpoint (user_insights.py).

GET /api/v2/homepage/interesting-stats/{username}

This endpoint backs the Profile page's "unique wins / rare wins / close
calls" panel. The original implementation issued several extra database
queries per correct answer and per eligible prop question, so its query
count scaled with the size of the season rather than staying constant.
These tests pin down both the query-count behavior and the correctness of
the three categories it returns.
"""
import pytest
from django.test import Client

from predictions.tests.factories import (
    CurrentSeasonFactory,
    UserFactory,
    PropQuestionFactory,
    AnswerFactory,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return Client()


def _make_yes_no_question(season, **kwargs):
    return PropQuestionFactory(season=season, outcome_type='yes_no', **kwargs)


def _seed_unique_win(season, target_user):
    """One question only `target_user` answered correctly."""
    question = _make_yes_no_question(season, text='Unique win question')
    AnswerFactory(user=target_user, question=question, answer='Yes', is_correct=True)
    for _ in range(4):
        AnswerFactory(user=UserFactory(), question=question, answer='No', is_correct=False)
    return question


def _seed_rare_win(season, target_user):
    """A question fewer than 20% of respondents got right, target included."""
    question = _make_yes_no_question(season, text='Rare win question')
    AnswerFactory(user=target_user, question=question, answer='Yes', is_correct=True)
    other_correct = UserFactory()
    AnswerFactory(user=other_correct, question=question, answer='Yes', is_correct=True)
    # 9 more wrong answers -> 2 correct out of 11 total (~18%)
    for _ in range(9):
        AnswerFactory(user=UserFactory(), question=question, answer='No', is_correct=False)
    return question


def _seed_close_call(season, target_user):
    """A near-50/50 split question with the target user among the respondents."""
    question = _make_yes_no_question(season, text='Close call question')
    AnswerFactory(user=target_user, question=question, answer='Yes', is_correct=True)
    for _ in range(3):
        AnswerFactory(user=UserFactory(), question=question, answer='Yes', is_correct=True)
    for _ in range(6):
        AnswerFactory(user=UserFactory(), question=question, answer='No', is_correct=False)
    # 4 "Yes" / 6 "No" out of 10 -> 40% split
    return question


def _seed_scenario(season, target_user):
    _seed_unique_win(season, target_user)
    _seed_rare_win(season, target_user)
    _seed_close_call(season, target_user)


class TestInterestingStatsCorrectness:
    def test_unique_win_detected(self, api_client):
        season = CurrentSeasonFactory()
        user = UserFactory()
        _seed_scenario(season, user)

        response = api_client.get(
            f'/api/v2/homepage/interesting-stats/{user.username}',
            {'season_slug': season.slug},
        )

        assert response.status_code == 200
        data = response.json()
        assert any(item['question'] == 'Unique win question' for item in data['unique_wins'])

    def test_rare_win_detected(self, api_client):
        season = CurrentSeasonFactory()
        user = UserFactory()
        _seed_scenario(season, user)

        response = api_client.get(
            f'/api/v2/homepage/interesting-stats/{user.username}',
            {'season_slug': season.slug},
        )

        data = response.json()
        assert any(item['question'] == 'Rare win question' for item in data['rare_wins'])

    def test_close_call_detected(self, api_client):
        season = CurrentSeasonFactory()
        user = UserFactory()
        _seed_scenario(season, user)

        response = api_client.get(
            f'/api/v2/homepage/interesting-stats/{user.username}',
            {'season_slug': season.slug},
        )

        data = response.json()
        assert any(item['question'] == 'Close call question' for item in data['close_calls'])

    def test_unknown_user_returns_404(self, api_client):
        season = CurrentSeasonFactory()
        response = api_client.get(
            f'/api/v2/homepage/interesting-stats/does-not-exist',
            {'season_slug': season.slug},
        )
        assert response.status_code == 404


class TestInterestingStatsQueryCount:
    """
    The endpoint's query count must not grow with the number of questions or
    answers in the season -- it should stay flat because the correctness and
    split percentages are computed with bulk aggregate queries instead of a
    query per answer/question.

    Each case below is asserted against the same fixed cap independently
    (rather than comparing counts between two calls in one test), since a
    second request in the same test can look artificially cheaper due to
    warm Django-level caches (content types, etc.) unrelated to N+1 queries.
    A query-per-item regression blows past a fixed cap once N is large
    enough, regardless of that warm-cache effect.
    """

    QUERY_CAP = 12

    def test_query_count_stays_flat_for_small_season(self, api_client, django_assert_max_num_queries):
        season = CurrentSeasonFactory()
        user = UserFactory()
        _seed_scenario(season, user)

        with django_assert_max_num_queries(self.QUERY_CAP):
            response = api_client.get(
                f'/api/v2/homepage/interesting-stats/{user.username}',
                {'season_slug': season.slug},
            )
        assert response.status_code == 200

    def test_query_count_stays_flat_for_large_season(self, api_client, django_assert_max_num_queries):
        # Five times the questions and answers of the "small" case above.
        season = CurrentSeasonFactory()
        user = UserFactory()
        for _ in range(5):
            _seed_scenario(season, user)

        with django_assert_max_num_queries(self.QUERY_CAP):
            response = api_client.get(
                f'/api/v2/homepage/interesting-stats/{user.username}',
                {'season_slug': season.slug},
            )
        assert response.status_code == 200
