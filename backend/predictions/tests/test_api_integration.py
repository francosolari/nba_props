"""
Comprehensive integration tests for critical API workflows.

Bead: nba_predictions-36 (API Testing: Integration tests for critical workflows)
"""

import json
import uuid
from datetime import date, datetime, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from predictions.models import (
    Answer,
    Award,
    Odds,
    Payment,
    PaymentStatus,
    RegularSeasonStandings,
    Season,
    SuperlativeQuestion,
    UserStats,
)
from predictions.tests.factories import (
    AdminUserFactory,
    AwardFactory,
    CurrentSeasonFactory,
    EasternTeamFactory,
    PastSeasonFactory,
    PlayerFactory,
    PropQuestionFactory,
    SeasonFactory,
    SuperlativeQuestionFactory,
    TeamFactory,
    UserFactory,
    WesternTeamFactory,
)


User = get_user_model()

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


# ============================================================================
# Fixtures and helpers
# ============================================================================

@pytest.fixture
def api_client():
    """Return a plain Django test client."""
    return Client()


@pytest.fixture
def auth_client(api_client):
    """Authenticated client representing a regular user."""
    user = UserFactory()
    api_client.force_login(user)
    api_client.user = user
    return api_client


@pytest.fixture
def admin_client():
    """Authenticated client for admin-only endpoints."""
    client = Client()
    admin_user = AdminUserFactory()
    client.force_login(admin_user)
    client.user = admin_user
    return client


@pytest.fixture
def open_season():
    """Create an active season with an open submission window."""
    now = timezone.now()
    return CurrentSeasonFactory(
        start_date=(now - timedelta(days=45)).date(),
        end_date=(now + timedelta(days=120)).date(),
        submission_start_date=now - timedelta(days=7),
        submission_end_date=now + timedelta(days=21),
    )


@pytest.fixture
def stripe_checkout(monkeypatch):
    """
    Patch Stripe helpers so tests can control payment state without network calls.
    """
    state = {
        "session_id": f"cs_test_{uuid.uuid4().hex[:10]}",
        "payment_intent": f"pi_test_{uuid.uuid4().hex[:10]}",
        "payment_status": "unpaid",
        "session_status": "open",
        "create_calls": [],
        "retrieve_calls": [],
    }

    def fake_create_checkout_session(*args, **kwargs):
        state["create_calls"].append({"args": args, "kwargs": kwargs})
        expires_at = int((timezone.now() + timedelta(hours=1)).timestamp())
        return {
            "session_id": state["session_id"],
            "checkout_url": "https://stripe.local/checkout",
            "expires_at": expires_at,
        }

    def fake_retrieve_checkout_session(session_id: str):
        state["retrieve_calls"].append(session_id)
        return {
            "id": session_id,
            "status": state["session_status"],
            "payment_status": state["payment_status"],
            "payment_intent": state["payment_intent"],
        }

    monkeypatch.setattr(
        "predictions.utils.stripe_service.create_checkout_session",
        fake_create_checkout_session,
    )
    monkeypatch.setattr(
        "predictions.utils.stripe_service.retrieve_checkout_session",
        fake_retrieve_checkout_session,
    )
    monkeypatch.setattr(
        "predictions.api.v2.endpoints.payments.create_checkout_session",
        fake_create_checkout_session,
    )
    monkeypatch.setattr(
        "predictions.api.v2.endpoints.payments.retrieve_checkout_session",
        fake_retrieve_checkout_session,
    )
    return state


def _post_json(client: Client, path: str, payload: dict):
    """Helper to POST JSON payloads."""
    return client.post(path, data=json.dumps(payload), content_type="application/json")


def _put_json(client: Client, path: str, payload: dict):
    """Helper to PUT JSON payloads."""
    return client.put(path, data=json.dumps(payload), content_type="application/json")


def _delete_json(client: Client, path: str):
    """Helper to DELETE with JSON headers."""
    return client.delete(path, content_type="application/json")


def _build_team_standings(season: Season):
    """Create minimal standings data required by leaderboard endpoints."""
    east_team = EasternTeamFactory()
    west_team = WesternTeamFactory()
    RegularSeasonStandings.objects.create(
        team=east_team,
        season=season,
        wins=55,
        losses=27,
        position=1,
    )
    RegularSeasonStandings.objects.create(
        team=west_team,
        season=season,
        wins=54,
        losses=28,
        position=1,
    )
    return east_team, west_team


# ============================================================================
# Test group: User journey end-to-end flow
# ============================================================================


class TestUserJourneyIntegration:
    def test_user_flow_payment_submission_grading_leaderboard(
        self,
        auth_client,
        admin_client,
        open_season,
        stripe_checkout,
    ):
        season = open_season
        user = auth_client.user

        # Seed standings so leaderboard aggregation has context.
        _build_team_standings(season)

        award = AwardFactory(name="Integration MVP")
        super_question = SuperlativeQuestionFactory(
            season=season,
            award=award,
            point_value=5,
            correct_answer=None,
        )
        prop_question = PropQuestionFactory(
            season=season,
            text="Will Integration Team reach 50 wins?",
            point_value=3,
            correct_answer="Yes",
        )

        # 1. Payment checkout session
        create_resp = _post_json(
            auth_client,
            "/api/v2/payments/create-checkout-session",
            {"season_slug": season.slug},
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]

        # 2. Verify payment success
        stripe_checkout["payment_status"] = "paid"
        stripe_checkout["session_status"] = "complete"
        verify_resp = auth_client.get(
            f"/api/v2/payments/verify-payment/{season.slug}?session_id={session_id}"
        )
        assert verify_resp.status_code == 200
        payment = Payment.objects.get(user=user, season=season)
        assert payment.payment_status == PaymentStatus.SUCCEEDED
        user_stats = UserStats.objects.get(user=user, season=season)
        assert user_stats.entry_fee_paid is True

        # 3. Submit answers
        answer_payload = {
            "answers": [
                {"question_id": super_question.id, "answer": "Player Prime"},
                {"question_id": prop_question.id, "answer": "Yes"},
            ]
        }
        submit_resp = _post_json(
            auth_client,
            f"/api/v2/submissions/answers/{season.slug}",
            answer_payload,
        )
        assert submit_resp.status_code == 200
        assert submit_resp.json()["saved_count"] == 2

        answers = Answer.objects.filter(user=user, question__season=season)
        assert answers.count() == 2

        # 4. Admin grades submissions
        for answer in answers:
            grade_payload = {
                "answer_id": answer.id,
                "is_correct": True,
                "correct_answer": answer.question.correct_answer or answer.answer,
            }
            grade_resp = _post_json(
                admin_client,
                "/api/v2/admin/grading/grade-manual",
                grade_payload,
            )
            assert grade_resp.status_code == 200
            assert grade_resp.json()["success"] is True

        # 5. Leaderboard reflects graded user
        leaderboard_resp = auth_client.get(f"/api/v2/leaderboards/{season.slug}")
        assert leaderboard_resp.status_code == 200
        leaderboard = leaderboard_resp.json()["leaderboard"]
        entry = next(data for data in leaderboard if data["username"] == user.username)
        assert entry["total_points"] == 8  # 5 + 3
        assert entry["rank"] == 1

        updated_stats = UserStats.objects.get(user=user, season=season)
        assert updated_stats.points == 8

    def test_duplicate_payment_blocked_after_success(
        self,
        auth_client,
        open_season,
        stripe_checkout,
    ):
        season = open_season

        first_resp = _post_json(
            auth_client,
            "/api/v2/payments/create-checkout-session",
            {"season_slug": season.slug},
        )
        assert first_resp.status_code == 200
        stripe_checkout["payment_status"] = "paid"
        stripe_checkout["session_status"] = "complete"
        session_id = first_resp.json()["session_id"]
        auth_client.get(
            f"/api/v2/payments/verify-payment/{season.slug}?session_id={session_id}"
        )

        second_resp = _post_json(
            auth_client,
            "/api/v2/payments/create-checkout-session",
            {"season_slug": season.slug},
        )
        assert second_resp.status_code == 400
        assert "Entry fee already paid" in second_resp.json()["detail"]
        # Stripe should not be called again once user is paid.
        assert Payment.objects.filter(user=auth_client.user, season=season).count() == 1
        assert len(stripe_checkout["create_calls"]) == 1, stripe_checkout["create_calls"]

    def test_submission_warns_when_payment_missing(
        self,
        auth_client,
        open_season,
    ):
        season = open_season
        question = PropQuestionFactory(season=season, point_value=4)

        payload = {"answers": [{"question_id": question.id, "answer": "No"}]}
        resp = _post_json(
            auth_client,
            f"/api/v2/submissions/answers/{season.slug}",
            payload,
        )
        assert resp.status_code == 200
        assert "Payment required" in resp.json()["message"]

    def test_submission_window_closed_blocks_answers(
        self,
        auth_client,
    ):
        season = PastSeasonFactory(
            submission_start_date=timezone.now() - timedelta(days=400),
            submission_end_date=timezone.now() - timedelta(days=200),
        )
        question = PropQuestionFactory(season=season)

        payload = {"answers": [{"question_id": question.id, "answer": "Yes"}]}
        resp = _post_json(
            auth_client,
            f"/api/v2/submissions/answers/{season.slug}",
            payload,
        )
        assert resp.status_code == 403
        assert "has closed" in resp.json()["detail"]

    def test_submit_and_fetch_standings_predictions(
        self,
        auth_client,
        open_season,
    ):
        season = open_season
        east_team = EasternTeamFactory()
        west_team = WesternTeamFactory()

        payload = {
            "predictions": [
                {"team_id": east_team.id, "predicted_position": 1},
                {"team_id": west_team.id, "predicted_position": 2},
            ]
        }

        submit_resp = _post_json(
            auth_client,
            f"/api/v2/submissions/standings/{season.slug}",
            payload,
        )
        assert submit_resp.status_code == 200
        assert submit_resp.json()["saved_count"] == 2

        fetch_resp = auth_client.get(
            f"/api/v2/submissions/standings/{season.slug}"
        )
        assert fetch_resp.status_code == 200
        data = fetch_resp.json()
        assert data["username"] == auth_client.user.username
        assert len(data["predictions"]) == 2

    def test_leaderboard_orders_users_by_points(self, open_season):
        season = open_season
        award = AwardFactory(name="Order Test Award")
        question = SuperlativeQuestionFactory(season=season, award=award, point_value=5)

        _build_team_standings(season)

        top_user = UserFactory(username="top-scorer")
        mid_user = UserFactory(username="mid-scorer")

        Answer.objects.create(
            user=top_user,
            question=question,
            answer="Leader",
            points_earned=5,
            is_correct=True,
        )
        Answer.objects.create(
            user=mid_user,
            question=question,
            answer="Runner",
            points_earned=2,
            is_correct=True,
        )

        leaderboard_resp = Client().get(f"/api/v2/leaderboards/{season.slug}")
        assert leaderboard_resp.status_code == 200
        leaderboard = leaderboard_resp.json()["leaderboard"]
        assert leaderboard[0]["username"] == "top-scorer"
        assert leaderboard[1]["username"] == "mid-scorer"

    def test_user_participated_seasons_returns_completed_season(
        self,
        auth_client,
        open_season,
    ):
        season = open_season
        question = PropQuestionFactory(season=season)
        payload = {"answers": [{"question_id": question.id, "answer": "Sample"}]}
        _post_json(
            auth_client, f"/api/v2/submissions/answers/{season.slug}", payload
        )

        resp = auth_client.get("/api/v2/seasons/user-participated")
        assert resp.status_code == 200
        data = resp.json()
        slugs = [item["slug"] for item in data]
        assert season.slug in slugs

    def test_entry_fee_status_endpoint_marks_paid(
        self,
        auth_client,
        open_season,
        stripe_checkout,
    ):
        season = open_season
        create_resp = _post_json(
            auth_client,
            "/api/v2/payments/create-checkout-session",
            {"season_slug": season.slug},
        )
        session_id = create_resp.json()["session_id"]
        stripe_checkout["payment_status"] = "paid"
        stripe_checkout["session_status"] = "complete"
        auth_client.get(
            f"/api/v2/payments/verify-payment/{season.slug}?session_id={session_id}"
        )

        status_resp = auth_client.get(
            f"/api/v2/submissions/entry-fee/{season.slug}"
        )
        assert status_resp.status_code == 200
        assert status_resp.json()["is_paid"] is True


# ============================================================================
# Test group: Season lifecycle
# ============================================================================


class TestSeasonLifecycleIntegration:
    def test_admin_can_create_season_via_api(self, admin_client):
        now = timezone.now()
        payload = {
            "year": "2026-27",
            "start_date": (now - timedelta(days=30)).date().isoformat(),
            "end_date": (now + timedelta(days=330)).date().isoformat(),
            "submission_start_date": (now - timedelta(days=5)).isoformat(),
            "submission_end_date": (now + timedelta(days=30)).isoformat(),
        }

        resp = _post_json(admin_client, "/api/v2/seasons/", payload)
        assert resp.status_code == 200
        assert Season.objects.filter(year="2026-27").exists()

    def test_season_creation_rejects_duplicate_year(self, admin_client):
        season = SeasonFactory(year="2025-26")
        now = timezone.now()
        payload = {
            "year": season.year,
            "start_date": (now - timedelta(days=10)).date().isoformat(),
            "end_date": (now + timedelta(days=200)).date().isoformat(),
            "submission_start_date": now.isoformat(),
            "submission_end_date": (now + timedelta(days=30)).isoformat(),
        }

        resp = _post_json(admin_client, "/api/v2/seasons/", payload)
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"]

    def test_list_seasons_returns_descending_order(self):
        # Clear existing seasons for isolation
        Season.objects.all().delete()

        older = SeasonFactory(
            year="2023-24",
            slug="2023-24",
            start_date=date(2023, 10, 1),
            end_date=date(2024, 6, 10),
        )
        newer = SeasonFactory(
            year="2024-25",
            slug="2024-25",
            start_date=date(2024, 10, 1),
            end_date=date(2025, 6, 10),
        )

        resp = Client().get("/api/v2/seasons/")
        assert resp.status_code == 200
        slugs = [item["slug"] for item in resp.json()]
        assert slugs[0] == newer.slug
        assert slugs[1] == older.slug

    def test_latest_season_tracks_most_recent(self):
        # Clear existing seasons for isolation
        Season.objects.all().delete()

        _ = SeasonFactory(
            year="2022-23",
            slug="2022-23",
            start_date=date(2022, 10, 1),
            end_date=date(2023, 6, 10),
        )
        latest = SeasonFactory(
            year="2023-24",
            slug="2023-24",
            start_date=date(2023, 10, 1),
            end_date=date(2024, 6, 10),
        )

        resp = Client().get("/api/v2/seasons/latest")
        assert resp.status_code == 200
        assert resp.json()["slug"] == latest.slug

    def test_submission_status_reports_not_open(self):
        future_start = timezone.now() + timedelta(days=3)
        season = SeasonFactory(
            submission_start_date=future_start,
            submission_end_date=future_start + timedelta(days=30),
        )

        resp = Client().get(
            f"/api/v2/submissions/submission-status/{season.slug}"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["is_open"] is False
        assert "opens" in body["message"]

    def test_submission_status_reports_open(self):
        now = timezone.now()
        season = SeasonFactory(
            submission_start_date=now - timedelta(days=1),
            submission_end_date=now + timedelta(days=5),
        )

        resp = Client().get(
            f"/api/v2/submissions/submission-status/{season.slug}"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["is_open"] is True

    def test_submission_status_reports_closed(self):
        now = timezone.now()
        season = SeasonFactory(
            submission_start_date=now - timedelta(days=10),
            submission_end_date=now - timedelta(days=1),
        )

        resp = Client().get(
            f"/api/v2/submissions/submission-status/{season.slug}"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["is_open"] is False
        assert "closed" in body["message"]

    def test_standings_submission_rejected_before_window(self, auth_client):
        future_start = timezone.now() + timedelta(days=5)
        season = SeasonFactory(
            submission_start_date=future_start,
            submission_end_date=future_start + timedelta(days=30),
        )
        team = TeamFactory()
        payload = {"predictions": [{"team_id": team.id, "predicted_position": 1}]}

        resp = _post_json(
            auth_client,
            f"/api/v2/submissions/standings/{season.slug}",
            payload,
        )
        assert resp.status_code == 403
        assert "has not opened" in resp.json()["detail"]


# ============================================================================
# Test group: Question creation, odds updates, finalization
# ============================================================================


class TestQuestionWorkflowIntegration:
    def test_admin_creates_superlative_question_and_updates_odds(
        self,
        admin_client,
        open_season,
    ):
        season = open_season
        award = AwardFactory(name="Clutch Player")
        leader = PlayerFactory(name="Leader Player")
        runner = PlayerFactory(name="Runner Player")

        create_resp = _post_json(
            admin_client,
            "/api/v2/admin/questions/superlative",
            {
                "season_slug": season.slug,
                "text": "Who is the clutch player of the year?",
                "point_value": 7,
                "award_id": award.id,
            },
        )
        assert create_resp.status_code == 200
        question_id = create_resp.json()["question"]["id"]

        question = SuperlativeQuestion.objects.get(id=question_id)

        common_ts = timezone.now()
        odds_entries = [
            Odds.objects.create(
                award=award,
                player=leader,
                season=season,
                odds_value="+150",
                rank=1,
            ),
            Odds.objects.create(
                award=award,
                player=runner,
                season=season,
                odds_value="+250",
                rank=2,
            ),
        ]
        for odd in odds_entries:
            odd.scraped_at = common_ts
            odd.save(update_fields=["scraped_at"])

        question.update_from_latest_odds()
        question.refresh_from_db()

        assert question.current_leader == leader
        assert question.correct_answer == leader.name
        assert question.current_runner_up == runner

        odds_resp = Client().get(f"/api/v2/odds/current/{season.slug}")
        assert odds_resp.status_code == 200
        awards = odds_resp.json()["awards"]
        assert any(item["award_id"] == award.id for item in awards)

    def test_finalize_question_locks_and_sets_correct_answer(
        self,
        admin_client,
        open_season,
    ):
        season = open_season
        question = SuperlativeQuestionFactory(season=season, correct_answer=None)

        resp = admin_client.post(
            f"/api/v2/admin/grading/finalize-question/{question.id}?correct_answer=Final Winner"
        )
        assert resp.status_code == 200

        question.refresh_from_db()
        assert question.is_finalized is True
        assert question.correct_answer == "Final Winner"

    def test_odds_scoring_positions_reflects_leader_after_update(
        self,
        admin_client,
        open_season,
    ):
        season = open_season
        award = AwardFactory(name="Odds Award")
        leader = PlayerFactory(name="Odds Leader")
        runner = PlayerFactory(name="Odds Runner")
        question = SuperlativeQuestionFactory(
            season=season,
            award=award,
            correct_answer=None,
        )

        common_ts = timezone.now()
        odds_entries = [
            Odds.objects.create(
                award=award,
                player=leader,
                season=season,
                odds_value="+100",
                rank=1,
            ),
            Odds.objects.create(
                award=award,
                player=runner,
                season=season,
                odds_value="+220",
                rank=2,
            ),
        ]
        for odd in odds_entries:
            odd.scraped_at = common_ts
            odd.save(update_fields=["scraped_at"])

        question.update_from_latest_odds()
        question.refresh_from_db()

        resp = Client().get(f"/api/v2/odds/scoring-positions/{season.slug}")
        assert resp.status_code == 200
        payload = resp.json()
        award_entry = next(item for item in payload["awards"] if item["award_id"] == award.id)
        assert award_entry["leader"]["player_name"] == "Odds Leader"
        assert award_entry["runner_up"]["player_name"] == "Odds Runner"

    def test_admin_list_questions_includes_new_question(
        self,
        admin_client,
        open_season,
    ):
        season = open_season
        question = PropQuestionFactory(season=season)

        resp = admin_client.get(f"/api/v2/admin/seasons/{season.slug}/questions")
        assert resp.status_code == 200
        question_ids = [item["id"] for item in resp.json()]
        assert question.id in question_ids

    def test_admin_updates_prop_question_attributes(
        self,
        admin_client,
        open_season,
    ):
        season = open_season
        prop_resp = _post_json(
            admin_client,
            "/api/v2/admin/questions/prop",
            {
                "season_slug": season.slug,
                "text": "Will player average 30 points?",
                "point_value": 3,
                "outcome_type": "yes_no",
                "line": None,
            },
        )
        question_id = prop_resp.json()["question"]["id"]
        player = PlayerFactory(name="High Scorer")

        update_payload = {
            "outcome_type": "over_under",
            "related_player_id": player.id,
            "line": 29.5,
            "point_value": 4,
        }
        update_resp = _put_json(
            admin_client,
            f"/api/v2/admin/questions/{question_id}",
            update_payload,
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()["question"]
        assert updated["point_value"] == 4
        assert updated["outcome_type"] == "over_under"
        assert updated["related_player_name"] == "High Scorer"
        assert updated["line"] == 29.5

    def test_admin_delete_question_removes_answers(
        self,
        admin_client,
        open_season,
    ):
        season = open_season
        question = PropQuestionFactory(season=season)
        answer = Answer.objects.create(
            user=UserFactory(),
            question=question,
            answer="Yes",
        )
        assert Answer.objects.filter(id=answer.id).exists()

        resp = _delete_json(
            admin_client, f"/api/v2/admin/questions/{question.id}"
        )
        assert resp.status_code == 200
        assert not Answer.objects.filter(id=answer.id).exists()
        with pytest.raises(question.__class__.DoesNotExist):
            question.__class__.objects.get(id=question.id)
