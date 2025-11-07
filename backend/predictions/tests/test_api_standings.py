"""
Comprehensive test suite for standings-related API endpoints (v2).

Targets: nba_predictions-37 - "API Testing: Standings endpoints (regular & IST)"
Scope:
- Regular season standings: conference grouping, ordering, win percentage calculations,
  edge-case handling, error paths.
- In-Season Tournament standings: nested grouping, ranking order, tie-breaker fields,
  wildcard indicators, error handling.

The goal is to provide ~20 high-signal tests that keep the endpoints at FAANG-level
quality, validating both happy paths and resilience to malformed input/data.
"""

from datetime import date
from unittest.mock import MagicMock

import pytest
from django.test import Client

from predictions.models import (
    Season,
    RegularSeasonStandings,
    InSeasonTournamentStandings,
)
from predictions.tests.factories import (
    SeasonFactory,
    EasternTeamFactory,
    WesternTeamFactory,
)


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def api_client():
    """Simple Django test client fixture."""
    return Client()


def _create_regular_standing(team, season, wins, losses, position):
    """Helper to persist a RegularSeasonStandings record."""
    return RegularSeasonStandings.objects.create(
        team=team,
        season=season,
        wins=wins,
        losses=losses,
        position=position,
    )


def _create_ist_standing(
    team,
    season,
    *,
    group,
    group_rank,
    wins,
    losses,
    differential,
    wildcard_rank,
    clinch_group=False,
    clinch_knockout=False,
    clinch_wildcard=False,
):
    """Helper to persist an InSeasonTournamentStandings record."""
    return InSeasonTournamentStandings.objects.create(
        team=team,
        season=season,
        wins=wins,
        losses=losses,
        ist_group=group,
        ist_group_rank=group_rank,
        ist_group_gb=0,
        ist_wildcard_rank=wildcard_rank,
        ist_knockout_rank=group_rank,
        ist_wildcard_gb=0,
        ist_differential=differential,
        ist_points=wins * 2,
        ist_clinch_group=clinch_group,
        ist_clinch_knockout=clinch_knockout,
        ist_clinch_wildcard=clinch_wildcard,
    )


class TestRegularSeasonStandingsEndpoint:
    """Tests for GET /api/v2/standings/{season_slug}."""

    def test_regular_standings_groups_by_conference(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        east_team = EasternTeamFactory()
        west_team = WesternTeamFactory()

        _create_regular_standing(east_team, season, wins=52, losses=18, position=1)
        _create_regular_standing(west_team, season, wins=50, losses=20, position=1)

        response = api_client.get(f"/api/v2/standings/{season.slug}")
        assert response.status_code == 200

        data = response.json()
        assert "east" in data and "west" in data
        assert data["east"][0]["id"] == east_team.id
        assert data["west"][0]["id"] == west_team.id

    def test_regular_standings_orders_by_position(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        celtics = EasternTeamFactory(name="Boston Celtics")
        knicks = EasternTeamFactory(name="New York Knicks")

        _create_regular_standing(knicks, season, wins=48, losses=34, position=2)
        _create_regular_standing(celtics, season, wins=58, losses=24, position=1)

        response = api_client.get(f"/api/v2/standings/{season.slug}")
        assert response.status_code == 200
        east = response.json()["east"]

        assert [row["name"] for row in east] == ["Boston Celtics", "New York Knicks"]

    def test_regular_standings_includes_required_fields(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        team = EasternTeamFactory()
        _create_regular_standing(team, season, wins=45, losses=37, position=4)

        response = api_client.get(f"/api/v2/standings/{season.slug}")
        assert response.status_code == 200
        entry = response.json()["east"][0]

        expected_fields = {
            "id",
            "name",
            "conference",
            "wins",
            "losses",
            "position",
            "win_percentage",
        }
        assert expected_fields.issubset(entry.keys())

    def test_regular_standings_win_percentage_precision(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        team = EasternTeamFactory()
        _create_regular_standing(team, season, wins=31, losses=13, position=2)

        response = api_client.get(f"/api/v2/standings/{season.slug}")
        assert response.status_code == 200
        win_pct = response.json()["east"][0]["win_percentage"]

        # 31 / (31 + 13) = 0.704545..., rounded to 0.705
        assert win_pct == pytest.approx(0.705, rel=1e-3)

    def test_regular_standings_win_percentage_zero_when_all_losses(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        team = EasternTeamFactory()
        _create_regular_standing(team, season, wins=0, losses=1, position=10)

        response = api_client.get(f"/api/v2/standings/{season.slug}")
        assert response.status_code == 200
        assert response.json()["east"][0]["win_percentage"] == 0.0

    def test_regular_standings_current_slug_fetches_latest(self, api_client):
        Season.objects.all().delete()
        older = SeasonFactory(
            slug="22-23",
            year="22-23",
            start_date=date(2022, 10, 1),
        )
        newer = SeasonFactory(
            slug="23-24",
            year="23-24",
            start_date=date(2023, 10, 1),
        )

        east_team = EasternTeamFactory()
        west_team = WesternTeamFactory()
        _create_regular_standing(east_team, newer, wins=54, losses=28, position=1)
        _create_regular_standing(west_team, older, wins=60, losses=22, position=1)

        response = api_client.get("/api/v2/standings/current")
        assert response.status_code == 200
        data = response.json()

        ids = {entry["id"] for entry in data["east"] + data["west"]}
        assert east_team.id in ids
        assert west_team.id not in ids

    def test_regular_standings_invalid_slug_returns_404(self, api_client):
        response = api_client.get("/api/v2/standings/not-a-season")
        assert response.status_code == 404

    def test_regular_standings_current_without_seasons_returns_404(self, api_client):
        Season.objects.all().delete()
        response = api_client.get("/api/v2/standings/current")
        assert response.status_code == 404
        payload = response.json()
        assert payload["error"] == "Latest season not found"

    def test_regular_standings_returns_empty_lists_when_no_results(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")

        response = api_client.get(f"/api/v2/standings/{season.slug}")
        assert response.status_code == 200
        assert response.json() == {"east": [], "west": []}

    def test_regular_standings_database_error_returns_500(self, api_client, monkeypatch):
        season = SeasonFactory(slug="24-25", year="24-25")

        monkeypatch.setattr(
            RegularSeasonStandings.objects,
            "filter",
            MagicMock(side_effect=Exception("database offline")),
        )

        response = api_client.get(f"/api/v2/standings/{season.slug}")
        assert response.status_code == 500
        data = response.json()
        assert data["error"] == "Unable to fetch standings"
        assert "database offline" in data["details"]


class TestInSeasonTournamentStandingsEndpoint:
    """Tests for GET /api/v2/standings/ist/{season_slug}."""

    def test_ist_standings_groups_by_conference_and_group(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        east_team = EasternTeamFactory()
        west_team = WesternTeamFactory()

        _create_ist_standing(
            east_team,
            season,
            group="East Group A",
            group_rank=1,
            wins=4,
            losses=0,
            differential=48,
            wildcard_rank=1,
            clinch_group=True,
            clinch_knockout=True,
        )
        _create_ist_standing(
            west_team,
            season,
            group="West Group B",
            group_rank=2,
            wins=3,
            losses=1,
            differential=26,
            wildcard_rank=2,
            clinch_knockout=True,
        )

        response = api_client.get(f"/api/v2/standings/ist/{season.slug}")
        assert response.status_code == 200
        data = response.json()

        assert data["East"]["East Group A"][0]["team_id"] == east_team.id
        assert data["West"]["West Group B"][0]["team_id"] == west_team.id

    def test_ist_standings_orders_by_group_rank(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        team_one = EasternTeamFactory(name="Boston Celtics")
        team_two = EasternTeamFactory(name="Miami Heat")

        _create_ist_standing(
            team_one,
            season,
            group="East Group A",
            group_rank=2,
            wins=3,
            losses=1,
            differential=15,
            wildcard_rank=2,
        )
        _create_ist_standing(
            team_two,
            season,
            group="East Group A",
            group_rank=1,
            wins=4,
            losses=0,
            differential=42,
            wildcard_rank=1,
        )

        response = api_client.get(f"/api/v2/standings/ist/{season.slug}")
        assert response.status_code == 200
        east_group = response.json()["East"]["East Group A"]

        assert [row["team_name"] for row in east_group] == ["Miami Heat", "Boston Celtics"]

    def test_ist_standings_includes_all_fields(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        team = EasternTeamFactory()

        _create_ist_standing(
            team,
            season,
            group="East Group C",
            group_rank=3,
            wins=2,
            losses=2,
            differential=5,
            wildcard_rank=3,
            clinch_wildcard=True,
        )

        response = api_client.get(f"/api/v2/standings/ist/{season.slug}")
        assert response.status_code == 200
        entry = response.json()["East"]["East Group C"][0]

        expected_fields = {
            "team_id",
            "team_name",
            "group_rank",
            "wins",
            "losses",
            "point_differential",
            "wildcard_rank",
            "clinch_group",
            "clinch_knockout",
            "clinch_wildcard",
        }
        assert expected_fields.issubset(entry.keys())

    def test_ist_standings_handles_multiple_groups_per_conference(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")
        team_a = EasternTeamFactory()
        team_b = EasternTeamFactory()

        _create_ist_standing(
            team_a,
            season,
            group="East Group A",
            group_rank=1,
            wins=3,
            losses=1,
            differential=20,
            wildcard_rank=1,
        )
        _create_ist_standing(
            team_b,
            season,
            group="East Group B",
            group_rank=1,
            wins=3,
            losses=1,
            differential=18,
            wildcard_rank=2,
        )

        response = api_client.get(f"/api/v2/standings/ist/{season.slug}")
        assert response.status_code == 200
        data = response.json()

        assert "East Group A" in data["East"]
        assert "East Group B" in data["East"]

    def test_ist_standings_current_slug_fetches_latest(self, api_client):
        Season.objects.all().delete()
        older = SeasonFactory(
            slug="22-23",
            year="22-23",
            start_date=date(2022, 10, 1),
        )
        newer = SeasonFactory(
            slug="23-24",
            year="23-24",
            start_date=date(2023, 10, 1),
        )
        east_team = EasternTeamFactory()
        west_team = WesternTeamFactory()

        _create_ist_standing(
            east_team,
            newer,
            group="East Group A",
            group_rank=1,
            wins=4,
            losses=0,
            differential=40,
            wildcard_rank=1,
        )
        _create_ist_standing(
            west_team,
            older,
            group="West Group A",
            group_rank=1,
            wins=4,
            losses=0,
            differential=44,
            wildcard_rank=1,
        )

        response = api_client.get("/api/v2/standings/ist/current")
        assert response.status_code == 200
        data = response.json()

        east_ids = [row["team_id"] for row in data["East"]["East Group A"]]
        assert east_team.id in east_ids
        for group in data["West"].values():
            assert all(row["team_id"] != west_team.id for row in group)

    def test_ist_standings_invalid_slug_returns_404(self, api_client):
        response = api_client.get("/api/v2/standings/ist/not-a-season")
        assert response.status_code == 404

    def test_ist_standings_current_slug_without_seasons_returns_404(self, api_client):
        Season.objects.all().delete()
        response = api_client.get("/api/v2/standings/ist/current")
        assert response.status_code == 404
        payload = response.json()
        assert payload["error"] == "Latest season not found"

    def test_ist_standings_returns_empty_structure_when_no_records(self, api_client):
        season = SeasonFactory(slug="24-25", year="24-25")

        response = api_client.get(f"/api/v2/standings/ist/{season.slug}")
        assert response.status_code == 200
        assert response.json() == {"East": {}, "West": {}}

    def test_ist_standings_database_error_returns_500(self, api_client, monkeypatch):
        season = SeasonFactory(slug="24-25", year="24-25")

        monkeypatch.setattr(
            InSeasonTournamentStandings.objects,
            "filter",
            MagicMock(side_effect=Exception("database offline")),
        )

        response = api_client.get(f"/api/v2/standings/ist/{season.slug}")
        assert response.status_code == 500
        data = response.json()
        assert data["error"] == "Unable to fetch IST standings"
        assert "database offline" in data["details"]
