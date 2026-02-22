import pytest
import pandas as pd
from requests.exceptions import ReadTimeout

import nba_stats


def test_fetch_nba_standings_falls_back_to_result_sets(monkeypatch):
    class FakeEndpoint:
        def __init__(self, season, timeout=30):
            self.season = season

        def get_data_frames(self):
            raise KeyError("resultSet")

        def get_dict(self):
            return {
                "resultSets": [
                    {
                        "name": "Standings",
                        "headers": ["TeamCity", "TeamName", "Conference", "PlayoffRank", "WINS", "LOSSES"],
                        "rowSet": [["Boston", "Celtics", "East", 1, 60, 22]],
                    }
                ]
            }

    captured = {}

    def fake_update_standings(df_standings, season_slug):
        captured["season_slug"] = season_slug
        captured["rows"] = len(df_standings)

    monkeypatch.setattr(nba_stats.leaguestandingsv3, "LeagueStandingsV3", FakeEndpoint)
    monkeypatch.setattr(nba_stats, "update_standings", fake_update_standings)

    standings_df = nba_stats.fetch_nba_standings("2024-25")

    assert list(standings_df.columns) == [
        "TeamCity",
        "TeamName",
        "Conference",
        "PlayoffRank",
        "WINS",
        "LOSSES",
    ]
    assert len(standings_df) == 1
    assert captured == {"season_slug": "2024-25", "rows": 1}


def test_fetch_nba_standings_supports_result_set_dict(monkeypatch):
    class FakeEndpoint:
        def __init__(self, season, timeout=30):
            self.season = season

        def get_data_frames(self):
            raise KeyError("resultSet")

        def get_dict(self):
            return {
                "resultSet": {
                    "name": "Standings",
                    "headers": ["TeamCity", "TeamName", "Conference", "PlayoffRank", "WINS", "LOSSES"],
                    "rowSet": [["Denver", "Nuggets", "West", 2, 57, 25]],
                }
            }

    monkeypatch.setattr(nba_stats.leaguestandingsv3, "LeagueStandingsV3", FakeEndpoint)
    monkeypatch.setattr(nba_stats, "update_standings", lambda *_args, **_kwargs: None)

    standings_df = nba_stats.fetch_nba_standings("2024-25")

    assert standings_df.iloc[0]["TeamName"] == "Nuggets"
    assert standings_df.iloc[0]["WINS"] == 57


def test_fetch_nba_standings_raises_clear_error_for_unexpected_payload(monkeypatch):
    class FakeEndpoint:
        def __init__(self, season, timeout=30):
            self.season = season

        def get_data_frames(self):
            raise KeyError("resultSet")

        def get_dict(self):
            return {"status": "ok"}

    monkeypatch.setattr(nba_stats.leaguestandingsv3, "LeagueStandingsV3", FakeEndpoint)
    monkeypatch.setattr(nba_stats, "update_standings", lambda *_args, **_kwargs: None)

    with pytest.raises(ValueError, match="missing 'resultSet'/'resultSets'"):
        nba_stats.fetch_nba_standings("2024-25")


def test_fetch_nba_standings_retries_timeout_then_succeeds(monkeypatch):
    calls = {"count": 0}
    sleep_calls = []

    class FlakyEndpoint:
        def __init__(self, season, timeout=30):
            calls["count"] += 1
            if calls["count"] < 3:
                raise ReadTimeout("read timed out")

        def get_data_frames(self):
            return [
                pd.DataFrame(
                    [["Boston", "Celtics", "East", 1, 60, 22]],
                    columns=["TeamCity", "TeamName", "Conference", "PlayoffRank", "WINS", "LOSSES"],
                )
            ]

        def get_dict(self):
            return {}

    monkeypatch.setattr(nba_stats.leaguestandingsv3, "LeagueStandingsV3", FlakyEndpoint)
    monkeypatch.setattr(nba_stats, "update_standings", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(nba_stats.time, "sleep", lambda seconds: sleep_calls.append(seconds))

    standings_df = nba_stats.fetch_nba_standings("2024-25", timeout=5, retries=3, retry_delay=2)

    assert len(standings_df) == 1
    assert calls["count"] == 3
    assert sleep_calls == [2, 4]


def test_fetch_nba_standings_timeout_after_max_retries(monkeypatch):
    calls = {"count": 0}

    class AlwaysTimeoutEndpoint:
        def __init__(self, season, timeout=30):
            calls["count"] += 1
            raise ReadTimeout("read timed out")

    monkeypatch.setattr(nba_stats.leaguestandingsv3, "LeagueStandingsV3", AlwaysTimeoutEndpoint)
    monkeypatch.setattr(nba_stats, "update_standings", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(nba_stats.time, "sleep", lambda _seconds: None)

    with pytest.raises(TimeoutError, match="after 2 attempts"):
        nba_stats.fetch_nba_standings("2024-25", timeout=5, retries=2, retry_delay=0)

    assert calls["count"] == 2


def test_fetch_nba_standings_normalizes_short_season_slug(monkeypatch):
    seen = {}

    class FakeEndpoint:
        def __init__(self, season, timeout=30):
            seen["season"] = season

        def get_data_frames(self):
            return [
                pd.DataFrame(
                    [["Boston", "Celtics", "East", 1, 60, 22]],
                    columns=["TeamCity", "TeamName", "Conference", "PlayoffRank", "WINS", "LOSSES"],
                )
            ]

    monkeypatch.setattr(nba_stats.leaguestandingsv3, "LeagueStandingsV3", FakeEndpoint)
    monkeypatch.setattr(nba_stats, "update_standings", lambda *_args, **_kwargs: None)

    nba_stats.fetch_nba_standings("24-25", retries=1, retry_delay=0)

    assert seen["season"] == "2024-25"


def test_fetch_nba_standings_falls_back_when_endpoint_init_raises_resultset(monkeypatch):
    class FailingEndpoint:
        def __init__(self, season, timeout=30):
            raise KeyError("resultSet")

    class FakeResponse:
        def get_dict(self):
            return {
                "resultSets": [
                    {
                        "name": "Standings",
                        "headers": ["TeamCity", "TeamName", "Conference", "PlayoffRank", "WINS", "LOSSES"],
                        "rowSet": [["Denver", "Nuggets", "West", 2, 57, 25]],
                    }
                ]
            }

    class FakeHTTP:
        def send_api_request(self, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(nba_stats.leaguestandingsv3, "LeagueStandingsV3", FailingEndpoint)
    monkeypatch.setattr(nba_stats, "NBAStatsHTTP", lambda: FakeHTTP())
    monkeypatch.setattr(nba_stats, "update_standings", lambda *_args, **_kwargs: None)

    standings_df = nba_stats.fetch_nba_standings("24-25", retries=1, retry_delay=0)

    assert standings_df.iloc[0]["TeamName"] == "Nuggets"
