# File: predictions/api/v2/endpoints/odds.py
"""
Odds API Endpoints

Provides public endpoints for viewing betting odds and scoring positions.
Users can see:
- Current odds for all awards
- Historical odds trends
- Which players are in scoring position (top 2)
- Odds changes over time
"""

from ninja import Router
from django.shortcuts import get_object_or_404
from django.db.models import Q
from typing import List, Optional
from datetime import datetime, timedelta

from predictions.models import (
    Season, Award, Odds, SuperlativeQuestion, Player
)
from ..schemas.odds import (
    CurrentOddsResponse,
    AwardOddsDetail,
    PlayerOddsEntry,
    OddsHistoryResponse,
    OddsHistoryEntry,
    ScoringPositionResponse,
    AwardScoringPosition
)

router = Router(tags=["Odds"])


@router.get(
    "/current/{season_slug}",
    response=CurrentOddsResponse,
    summary="Get Current Odds",
    description="Get the latest betting odds for all awards in a season"
)
def get_current_odds(request, season_slug: str):
    """
    Get the most recent odds for all NBA awards.

    Shows which players are currently favored to win each award based on
    the latest scraping run from DraftKings.
    """
    # Get season
    if season_slug == 'current':
        season = Season.objects.order_by('-start_date').first()
        if not season:
            return {"error": "No season found"}, 404
    else:
        season = get_object_or_404(Season, slug=season_slug)

    # Get latest scrape time
    latest_scrape = Odds.objects.filter(season=season).order_by('-scraped_at').first()

    if not latest_scrape:
        return {
            'season_slug': season.slug,
            'season_year': season.year,
            'last_updated': None,
            'awards': []
        }

    latest_time = latest_scrape.scraped_at

    # Get all awards with odds in this season
    awards_with_odds = Award.objects.filter(
        odds__season=season,
        odds__scraped_at=latest_time
    ).distinct()

    awards_data = []

    for award in awards_with_odds:
        # Get top odds for this award
        top_odds = Odds.objects.filter(
            award=award,
            season=season,
            scraped_at=latest_time
        ).order_by('rank').select_related('player')[:10]  # Top 10

        players_odds = [
            {
                'player_id': odd.player.id,
                'player_name': odd.player.name,
                'odds': odd.odds_value,
                'decimal_odds': float(odd.decimal_odds) if odd.decimal_odds else None,
                'implied_probability': float(odd.implied_probability) if odd.implied_probability else None,
                'rank': odd.rank,
                'in_scoring_position': odd.rank <= 2  # Top 2 get points
            }
            for odd in top_odds
        ]

        awards_data.append({
            'award_id': award.id,
            'award_name': award.name,
            'player_odds': players_odds
        })

    return {
        'season_slug': season.slug,
        'season_year': season.year,
        'last_updated': latest_time.isoformat() if latest_time else None,
        'awards': awards_data
    }


@router.get(
    "/scoring-positions/{season_slug}",
    response=ScoringPositionResponse,
    summary="Get Scoring Positions",
    description="Get which players are currently in scoring position (top 2) for each award"
)
def get_scoring_positions(request, season_slug: str):
    """
    Get the current leader and runner-up for all awards.

    Players in the top 2 positions are "in scoring position" - if the season
    ended today, these players would earn points for users who predicted them.
    """
    # Get season
    if season_slug == 'current':
        season = Season.objects.order_by('-start_date').first()
        if not season:
            return {"error": "No season found"}, 404
    else:
        season = get_object_or_404(Season, slug=season_slug)

    # Get all SuperlativeQuestions for this season
    questions = SuperlativeQuestion.objects.filter(
        season=season
    ).select_related(
        'award', 'current_leader', 'current_runner_up'
    )

    awards_positions = []

    for q in questions:
        position_data = {
            'award_id': q.award.id,
            'award_name': q.award.name,
            'question_id': q.id,
            'question_text': q.text,
            'is_finalized': q.is_finalized,
            'leader': None,
            'runner_up': None,
            'last_updated': q.last_odds_update.isoformat() if q.last_odds_update else None
        }

        if q.current_leader:
            position_data['leader'] = {
                'player_id': q.current_leader.id,
                'player_name': q.current_leader.name,
                'odds': q.current_leader_odds
            }

        if q.current_runner_up:
            position_data['runner_up'] = {
                'player_id': q.current_runner_up.id,
                'player_name': q.current_runner_up.name,
                'odds': q.current_runner_up_odds
            }

        awards_positions.append(position_data)

    return {
        'season_slug': season.slug,
        'season_year': season.year,
        'awards': awards_positions
    }


@router.get(
    "/history/{award_id}",
    response=OddsHistoryResponse,
    summary="Get Odds History",
    description="Get historical odds for a specific award over time"
)
def get_odds_history(
    request,
    award_id: int,
    season_slug: str = 'current',
    days: int = 30,
    player_id: Optional[int] = None
):
    """
    Get historical odds data for an award.

    Shows how odds have changed over time, useful for tracking momentum
    and seeing which players are trending up or down.
    """
    # Get season
    if season_slug == 'current':
        season = Season.objects.order_by('-start_date').first()
        if not season:
            return {"error": "No season found"}, 404
    else:
        season = get_object_or_404(Season, slug=season_slug)

    award = get_object_or_404(Award, id=award_id)

    # Calculate date range
    cutoff_date = datetime.now() - timedelta(days=days)

    # Build query
    query = Q(award=award, season=season, scraped_at__gte=cutoff_date)
    if player_id:
        query &= Q(player_id=player_id)

    # Get historical odds
    historical_odds = Odds.objects.filter(query).select_related('player').order_by('scraped_at', 'rank')

    # Group by scrape time
    odds_by_time = {}
    for odd in historical_odds:
        scrape_time = odd.scraped_at.isoformat()
        if scrape_time not in odds_by_time:
            odds_by_time[scrape_time] = {
                'timestamp': scrape_time,
                'players': []
            }

        odds_by_time[scrape_time]['players'].append({
            'player_id': odd.player.id,
            'player_name': odd.player.name,
            'odds': odd.odds_value,
            'decimal_odds': float(odd.decimal_odds) if odd.decimal_odds else None,
            'rank': odd.rank
        })

    history_entries = list(odds_by_time.values())
    history_entries.sort(key=lambda x: x['timestamp'])

    return {
        'award_id': award.id,
        'award_name': award.name,
        'season_slug': season.slug,
        'days': days,
        'history': history_entries
    }


@router.get(
    "/player/{player_id}/awards",
    summary="Get Player Award Odds",
    description="Get all award odds for a specific player"
)
def get_player_award_odds(request, player_id: int, season_slug: str = 'current'):
    """
    Get all awards a player has odds for.

    Useful for showing a player's profile with all the awards they're
    in contention for.
    """
    player = get_object_or_404(Player, id=player_id)

    # Get season
    if season_slug == 'current':
        season = Season.objects.order_by('-start_date').first()
        if not season:
            return {"error": "No season found"}, 404
    else:
        season = get_object_or_404(Season, slug=season_slug)

    # Get latest odds for this player
    latest_scrape = Odds.objects.filter(
        player=player,
        season=season
    ).order_by('-scraped_at').first()

    if not latest_scrape:
        return {
            'player_id': player.id,
            'player_name': player.name,
            'season_slug': season.slug,
            'awards': []
        }

    latest_time = latest_scrape.scraped_at

    # Get all odds for this player at the latest scrape
    player_odds = Odds.objects.filter(
        player=player,
        season=season,
        scraped_at=latest_time
    ).select_related('award').order_by('rank')

    awards_data = [
        {
            'award_id': odd.award.id,
            'award_name': odd.award.name,
            'odds': odd.odds_value,
            'decimal_odds': float(odd.decimal_odds) if odd.decimal_odds else None,
            'implied_probability': float(odd.implied_probability) if odd.implied_probability else None,
            'rank': odd.rank,
            'in_scoring_position': odd.rank <= 2
        }
        for odd in player_odds
    ]

    return {
        'player_id': player.id,
        'player_name': player.name,
        'season_slug': season.slug,
        'last_updated': latest_time.isoformat() if latest_time else None,
        'awards': awards_data
    }
