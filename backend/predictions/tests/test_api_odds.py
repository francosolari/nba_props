"""
Comprehensive test suite for odds-related API endpoints (v2).

Targets: nba_predictions-40 - "API Testing: Odds scraping & display endpoints"
Scope:
- Current odds retrieval for all awards
- Scoring positions (top 2 players per award)
- Historical odds trends over time
- Player-specific award odds lookup
- Season slug resolution ("current" vs specific)
- Empty state handling

The goal is to provide ~15 high-quality tests ensuring odds data is accurately
retrieved, filtered, and displayed for betting analysis and scoring purposes.
"""

import json
from decimal import Decimal
from datetime import datetime, timedelta

import pytest
from django.test import Client
from django.utils import timezone

from predictions.models import Odds
from predictions.tests.factories import (
    SeasonFactory,
    AwardFactory,
    PlayerFactory,
    SuperlativeQuestionFactory,
)


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def api_client():
    """Django test client fixture."""
    return Client()


def create_odds(player, award, season, odds_value="+500", rank=1, scraped_at=None):
    """Helper to create odds records."""
    # Don't use auto_now_add, manually set scraped_at
    if scraped_at is None:
        scraped_at = timezone.now()

    # Create without auto_now_add by using update after creation
    odds = Odds(
        player=player,
        award=award,
        season=season,
        odds_value=odds_value,
        decimal_odds=Decimal('6.00') if odds_value == "+500" else Decimal('2.00'),
        implied_probability=Decimal('16.67') if odds_value == "+500" else Decimal('50.00'),
        rank=rank,
    )
    odds.save()
    # Update scraped_at to override auto_now_add
    Odds.objects.filter(id=odds.id).update(scraped_at=scraped_at)
    odds.refresh_from_db()
    return odds


# ============================================================================
# Current Odds Tests
# ============================================================================

class TestGetCurrentOdds:
    """Tests for GET /api/v2/odds/current/{season_slug}."""

    def test_get_current_odds_success(self, api_client):
        """Test retrieving current odds for a season."""
        season = SeasonFactory(slug='24-25')
        mvp_award = AwardFactory(name="MVP")
        dpoy_award = AwardFactory(name="DPOY")

        player1 = PlayerFactory(name="Nikola Jokic")
        player2 = PlayerFactory(name="Luka Doncic")
        player3 = PlayerFactory(name="Rudy Gobert")

        # Use a consistent scrape time (truncate microseconds for consistency)
        scrape_time = timezone.now().replace(microsecond=0)

        # Create MVP odds
        create_odds(player1, mvp_award, season, "+250", 1, scrape_time)
        create_odds(player2, mvp_award, season, "+400", 2, scrape_time)

        # Create DPOY odds
        create_odds(player3, dpoy_award, season, "+150", 1, scrape_time)

        response = api_client.get('/api/v2/odds/current/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['season_slug'] == '24-25'
        assert data['last_updated'] is not None
        assert len(data['awards']) == 2

        # Check MVP data
        mvp_data = next(a for a in data['awards'] if a['award_name'] == 'MVP')
        assert len(mvp_data['player_odds']) == 2
        assert mvp_data['player_odds'][0]['player_name'] == 'Nikola Jokic'
        assert mvp_data['player_odds'][0]['in_scoring_position'] is True
        assert mvp_data['player_odds'][1]['in_scoring_position'] is True

    def test_get_current_odds_uses_latest_scrape(self, api_client):
        """Test that only the most recent scrape data is returned."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        player = PlayerFactory(name="Nikola Jokic")

        # Old scrape
        old_time = timezone.now() - timedelta(days=1)
        create_odds(player, award, season, "+300", 1, old_time)

        # New scrape
        new_time = timezone.now()
        create_odds(player, award, season, "+250", 1, new_time)

        response = api_client.get('/api/v2/odds/current/24-25')

        assert response.status_code == 200
        data = response.json()
        mvp_data = data['awards'][0]
        assert mvp_data['player_odds'][0]['odds'] == '+250'

    def test_get_current_odds_with_current_slug(self, api_client):
        """Test retrieving odds using 'current' season slug."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        player = PlayerFactory(name="Nikola Jokic")
        create_odds(player, award, season, "+250", 1)

        response = api_client.get('/api/v2/odds/current/current')

        assert response.status_code == 200
        data = response.json()
        assert data['season_slug'] == '24-25'

    def test_get_current_odds_no_data(self, api_client):
        """Test retrieving odds when no data exists."""
        season = SeasonFactory(slug='24-25')

        response = api_client.get('/api/v2/odds/current/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['season_slug'] == '24-25'
        assert data['last_updated'] is None
        assert data['awards'] == []

    def test_get_current_odds_invalid_season(self, api_client):
        """Test retrieving odds for non-existent season."""
        response = api_client.get('/api/v2/odds/current/invalid-season')

        assert response.status_code == 404

    def test_get_current_odds_top_10_limit(self, api_client):
        """Test that only top 10 players are returned per award."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        scrape_time = timezone.now().replace(microsecond=0)

        # Create 15 players with odds
        for i in range(15):
            player = PlayerFactory(name=f"Player {i+1}")
            create_odds(player, award, season, f"+{100*(i+1)}", i+1, scrape_time)

        response = api_client.get('/api/v2/odds/current/24-25')

        assert response.status_code == 200
        data = response.json()
        mvp_data = data['awards'][0]
        assert len(mvp_data['player_odds']) == 10  # Only top 10


# ============================================================================
# Scoring Positions Tests
# ============================================================================

class TestGetScoringPositions:
    """Tests for GET /api/v2/odds/scoring-positions/{season_slug}."""

    def test_get_scoring_positions_success(self, api_client):
        """Test retrieving scoring positions for a season."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        leader = PlayerFactory(name="Nikola Jokic")
        runner_up = PlayerFactory(name="Luka Doncic")

        question = SuperlativeQuestionFactory(
            season=season,
            award=award,
            current_leader=leader,
            current_leader_odds="+250",
            current_runner_up=runner_up,
            current_runner_up_odds="+400",
            last_odds_update=timezone.now()
        )

        response = api_client.get('/api/v2/odds/scoring-positions/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['season_slug'] == '24-25'
        assert len(data['awards']) == 1

        position = data['awards'][0]
        assert position['award_name'] == 'MVP'
        assert position['leader']['player_name'] == 'Nikola Jokic'
        assert position['leader']['odds'] == '+250'
        assert position['runner_up']['player_name'] == 'Luka Doncic'
        assert position['runner_up']['odds'] == '+400'

    def test_get_scoring_positions_no_leader(self, api_client):
        """Test scoring positions when no leader is set."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        question = SuperlativeQuestionFactory(
            season=season,
            award=award,
            current_leader=None,
            current_runner_up=None
        )

        response = api_client.get('/api/v2/odds/scoring-positions/24-25')

        assert response.status_code == 200
        data = response.json()
        position = data['awards'][0]
        assert position['leader'] is None
        assert position['runner_up'] is None

    def test_get_scoring_positions_with_current_slug(self, api_client):
        """Test scoring positions using 'current' season slug."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        leader = PlayerFactory(name="Nikola Jokic")
        question = SuperlativeQuestionFactory(
            season=season,
            award=award,
            current_leader=leader
        )

        response = api_client.get('/api/v2/odds/scoring-positions/current')

        assert response.status_code == 200
        data = response.json()
        assert data['season_slug'] == '24-25'

    def test_get_scoring_positions_finalized_question(self, api_client):
        """Test scoring positions includes finalization status."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        leader = PlayerFactory(name="Nikola Jokic")
        question = SuperlativeQuestionFactory(
            season=season,
            award=award,
            current_leader=leader,
            is_finalized=True
        )

        response = api_client.get('/api/v2/odds/scoring-positions/24-25')

        assert response.status_code == 200
        position = response.json()['awards'][0]
        assert position['is_finalized'] is True


# ============================================================================
# Odds History Tests
# ============================================================================

class TestGetOddsHistory:
    """Tests for GET /api/v2/odds/history/{award_id}."""

    def test_get_odds_history_success(self, api_client):
        """Test retrieving odds history for an award."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        player = PlayerFactory(name="Nikola Jokic")

        # Create historical odds over 3 days
        for i in range(3):
            scrape_time = timezone.now() - timedelta(days=i)
            create_odds(player, award, season, f"+{300+i*50}", 1, scrape_time)

        response = api_client.get(f'/api/v2/odds/history/{award.id}?season_slug=24-25&days=30')

        assert response.status_code == 200
        data = response.json()
        assert data['award_name'] == 'MVP'
        assert data['season_slug'] == '24-25'
        assert data['days'] == 30
        assert len(data['history']) == 3

    def test_get_odds_history_filtered_by_player(self, api_client):
        """Test odds history filtered to specific player."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        player1 = PlayerFactory(name="Nikola Jokic")
        player2 = PlayerFactory(name="Luka Doncic")

        scrape_time = timezone.now()
        create_odds(player1, award, season, "+250", 1, scrape_time)
        create_odds(player2, award, season, "+400", 2, scrape_time)

        response = api_client.get(
            f'/api/v2/odds/history/{award.id}?season_slug=24-25&player_id={player1.id}'
        )

        assert response.status_code == 200
        data = response.json()
        history_entry = data['history'][0]
        assert len(history_entry['players']) == 1
        assert history_entry['players'][0]['player_name'] == 'Nikola Jokic'

    def test_get_odds_history_respects_days_parameter(self, api_client):
        """Test odds history respects the days filter."""
        season = SeasonFactory(slug='24-25')
        award = AwardFactory(name="MVP")
        player = PlayerFactory(name="Nikola Jokic")

        # Create odds 10 days ago (should be excluded with days=5)
        old_time = timezone.now() - timedelta(days=10)
        create_odds(player, award, season, "+300", 1, old_time)

        # Create odds 2 days ago (should be included)
        recent_time = timezone.now() - timedelta(days=2)
        create_odds(player, award, season, "+250", 1, recent_time)

        response = api_client.get(f'/api/v2/odds/history/{award.id}?season_slug=24-25&days=5')

        assert response.status_code == 200
        data = response.json()
        assert len(data['history']) == 1

    def test_get_odds_history_invalid_award(self, api_client):
        """Test odds history for non-existent award."""
        response = api_client.get('/api/v2/odds/history/99999?season_slug=24-25')

        assert response.status_code == 404


# ============================================================================
# Player Award Odds Tests
# ============================================================================

class TestGetPlayerAwardOdds:
    """Tests for GET /api/v2/odds/player/{player_id}/awards."""

    def test_get_player_award_odds_success(self, api_client):
        """Test retrieving all award odds for a player."""
        season = SeasonFactory(slug='24-25')
        player = PlayerFactory(name="Nikola Jokic")
        mvp_award = AwardFactory(name="MVP")
        dpoy_award = AwardFactory(name="DPOY")

        scrape_time = timezone.now().replace(microsecond=0)
        create_odds(player, mvp_award, season, "+250", 1, scrape_time)
        create_odds(player, dpoy_award, season, "+1500", 5, scrape_time)

        response = api_client.get(f'/api/v2/odds/player/{player.id}/awards?season_slug=24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['player_name'] == 'Nikola Jokic'
        assert data['season_slug'] == '24-25'
        assert len(data['awards']) == 2

        mvp_odds = next(a for a in data['awards'] if a['award_name'] == 'MVP')
        assert mvp_odds['odds'] == '+250'
        assert mvp_odds['rank'] == 1
        assert mvp_odds['in_scoring_position'] is True

        dpoy_odds = next(a for a in data['awards'] if a['award_name'] == 'DPOY')
        assert dpoy_odds['in_scoring_position'] is False

    def test_get_player_award_odds_no_data(self, api_client):
        """Test player award odds when player has no odds."""
        season = SeasonFactory(slug='24-25')
        player = PlayerFactory(name="Nikola Jokic")

        response = api_client.get(f'/api/v2/odds/player/{player.id}/awards?season_slug=24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['player_name'] == 'Nikola Jokic'
        assert data['awards'] == []

    def test_get_player_award_odds_with_current_slug(self, api_client):
        """Test player award odds using 'current' season slug."""
        season = SeasonFactory(slug='24-25')
        player = PlayerFactory(name="Nikola Jokic")
        award = AwardFactory(name="MVP")
        create_odds(player, award, season, "+250", 1)

        response = api_client.get(f'/api/v2/odds/player/{player.id}/awards?season_slug=current')

        assert response.status_code == 200
        data = response.json()
        assert data['season_slug'] == '24-25'

    def test_get_player_award_odds_invalid_player(self, api_client):
        """Test player award odds for non-existent player."""
        response = api_client.get('/api/v2/odds/player/99999/awards?season_slug=24-25')

        assert response.status_code == 404
