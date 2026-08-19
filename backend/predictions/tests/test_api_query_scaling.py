"""
Query-count scaling regression tests for v2 endpoints.

The concern these guard is not how much *work* an endpoint does -- an
endpoint that returns N rows must obviously touch N rows -- but how many
database *round-trips* it takes to do it. A handler that issues a query
per row costs N network round-trips plus N query-planning cycles, which
is what actually falls over as the pool grows and as everyone submits at
once before the deadline.

Each test therefore asserts a fixed query-count cap while varying the
data size, rather than comparing two calls inside one test: a second
request in the same process can look cheaper regardless of data size
because process-level framework caches (Django's ContentType cache, used
internally by django-polymorphic) warm up after the first request. A
per-row N+1 blows through a fixed cap once N is large enough either way.
"""
import pytest
from django.test import Client
from django.utils import timezone

from predictions.models import Odds
from predictions.tests.factories import (
    AdminUserFactory,
    AnswerFactory,
    AwardFactory,
    CurrentSeasonFactory,
    EasternTeamFactory,
    OpenSubmissionSeasonFactory,
    PlayerFactory,
    PropQuestionFactory,
    UserFactory,
)

pytestmark = pytest.mark.django_db


class TestSubmitAnswersIsBatched:
    """
    POST /submissions/answers/{slug} is the deadline-rush path: every
    participant submits a full board of answers in one request, and they
    all do it in the same few minutes. Issuing a question lookup plus an
    update_or_create per answer turned one submission into hundreds of
    round-trips, all inside a single open transaction.
    """

    QUERY_CAP = 20

    def _submit(self, n_questions):
        season = OpenSubmissionSeasonFactory()
        user = UserFactory()
        questions = [
            PropQuestionFactory(season=season, outcome_type='yes_no', point_value=3, text=f'Q{i}')
            for i in range(n_questions)
        ]
        client = Client()
        client.force_login(user)
        payload = {"answers": [{"question_id": q.id, "answer": "Yes"} for q in questions]}
        return client, season, payload

    def test_small_payload(self, django_assert_max_num_queries):
        client, season, payload = self._submit(5)
        with django_assert_max_num_queries(self.QUERY_CAP):
            response = client.post(
                f'/api/v2/submissions/answers/{season.slug}',
                data=payload, content_type='application/json',
            )
        assert response.status_code == 200
        assert response.json()['saved_count'] == 5

    def test_full_board_payload(self, django_assert_max_num_queries):
        # A realistic full board -- this is what every participant posts.
        client, season, payload = self._submit(40)
        with django_assert_max_num_queries(self.QUERY_CAP):
            response = client.post(
                f'/api/v2/submissions/answers/{season.slug}',
                data=payload, content_type='application/json',
            )
        assert response.status_code == 200
        assert response.json()['saved_count'] == 40


class TestSubmitStandingsIsBatched:
    """POST /submissions/standings/{slug} posts all 30 teams at once."""

    QUERY_CAP = 20

    def _submit(self, n_teams):
        season = OpenSubmissionSeasonFactory()
        user = UserFactory()
        teams = [EasternTeamFactory() for _ in range(n_teams)]
        client = Client()
        client.force_login(user)
        payload = {
            "predictions": [
                {"team_id": t.id, "predicted_position": i} for i, t in enumerate(teams, 1)
            ]
        }
        return client, season, payload

    def test_small_payload(self, django_assert_max_num_queries):
        client, season, payload = self._submit(4)
        with django_assert_max_num_queries(self.QUERY_CAP):
            response = client.post(
                f'/api/v2/submissions/standings/{season.slug}',
                data=payload, content_type='application/json',
            )
        assert response.status_code == 200
        assert response.json()['saved_count'] == 4

    def test_full_conference_payload(self, django_assert_max_num_queries):
        client, season, payload = self._submit(15)
        with django_assert_max_num_queries(self.QUERY_CAP):
            response = client.post(
                f'/api/v2/submissions/standings/{season.slug}',
                data=payload, content_type='application/json',
            )
        assert response.status_code == 200
        assert response.json()['saved_count'] == 15


class TestAdminAnswerReviewIsBatched:
    """
    GET /admin/grading/answers/{slug} resolved the polymorphic real
    instance one answer at a time. The handler already caps its result at
    500 answers, so the ceiling was ~500 extra round-trips for one page.
    """

    QUERY_CAP = 20

    def _seed_and_get(self, n_users, n_questions):
        season = CurrentSeasonFactory()
        users = [UserFactory() for _ in range(n_users)]
        questions = [
            PropQuestionFactory(season=season, outcome_type='yes_no', point_value=3,
                                correct_answer='Yes', text=f'Q{i}')
            for i in range(n_questions)
        ]
        for q in questions:
            for u in users:
                AnswerFactory(user=u, question=q, answer='Yes', points_earned=3, is_correct=True)
        client = Client()
        client.force_login(AdminUserFactory())
        return client, season

    def test_small_season(self, django_assert_max_num_queries):
        client, season = self._seed_and_get(2, 2)
        with django_assert_max_num_queries(self.QUERY_CAP):
            response = client.get(f'/api/v2/admin/grading/answers/{season.slug}')
        assert response.status_code == 200

    def test_large_season(self, django_assert_max_num_queries):
        # 12 users x 12 questions = 144 answers on one review page.
        client, season = self._seed_and_get(12, 12)
        with django_assert_max_num_queries(self.QUERY_CAP):
            response = client.get(f'/api/v2/admin/grading/answers/{season.slug}')
        assert response.status_code == 200
        assert len(response.json()['answers']) == 144


class TestCurrentOddsIsBatched:
    """
    GET /odds/current/{slug} issued a separate top-10 query per award. Award
    count is bounded in practice, so this never exploded the way the answer
    paths did, but it still grew a query at a time with every award tracked.
    """

    QUERY_CAP = 12

    def _seed(self, n_awards):
        season = CurrentSeasonFactory()
        players = [PlayerFactory() for _ in range(5)]
        for a in range(n_awards):
            award = AwardFactory(name=f'Award {a}')
            for rank, player in enumerate(players, 1):
                Odds.objects.create(
                    award=award, season=season, player=player,
                    odds_value='+100', rank=rank,
                )
        # scraped_at is auto_now_add, so each row lands on its own timestamp.
        # The endpoint only reports the single latest scrape, so line them all
        # up on one timestamp to represent one real scraping run.
        Odds.objects.filter(season=season).update(scraped_at=timezone.now())
        return season

    def test_few_awards(self, django_assert_max_num_queries):
        season = self._seed(2)
        with django_assert_max_num_queries(self.QUERY_CAP):
            response = Client().get(f'/api/v2/odds/current/{season.slug}')
        assert response.status_code == 200
        assert len(response.json()['awards']) == 2

    def test_many_awards(self, django_assert_max_num_queries):
        season = self._seed(12)
        with django_assert_max_num_queries(self.QUERY_CAP):
            response = Client().get(f'/api/v2/odds/current/{season.slug}')
        assert response.status_code == 200
        data = response.json()
        assert len(data['awards']) == 12
        # Grouping in Python must still cap each award at its top 10 odds.
        assert all(len(a['player_odds']) == 5 for a in data['awards'])
