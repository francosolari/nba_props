# File: predictions/api/v2/schemas/odds.py
"""
Pydantic schemas for odds endpoints
"""

from ninja import Schema
from typing import List, Optional


class PlayerOddsEntry(Schema):
    """Single player's odds for an award"""
    player_id: int
    player_name: str
    odds: str  # American odds format (e.g., "+500")
    decimal_odds: Optional[float]
    implied_probability: Optional[float]
    rank: int
    in_scoring_position: bool  # True if rank <= 2


class AwardOddsDetail(Schema):
    """Odds details for a specific award"""
    award_id: int
    award_name: str
    player_odds: List[PlayerOddsEntry]


class CurrentOddsResponse(Schema):
    """Response for current odds endpoint"""
    season_slug: str
    season_year: str
    last_updated: Optional[str]
    awards: List[AwardOddsDetail]


class PlayerInPosition(Schema):
    """Player in scoring position"""
    player_id: int
    player_name: str
    odds: Optional[str]


class AwardScoringPosition(Schema):
    """Current leader and runner-up for an award"""
    award_id: int
    award_name: str
    question_id: int
    question_text: str
    is_finalized: bool
    leader: Optional[PlayerInPosition]
    runner_up: Optional[PlayerInPosition]
    last_updated: Optional[str]


class ScoringPositionResponse(Schema):
    """Response for scoring positions endpoint"""
    season_slug: str
    season_year: str
    awards: List[AwardScoringPosition]


class PlayerOddsInHistory(Schema):
    """Player odds at a specific point in time"""
    player_id: int
    player_name: str
    odds: str
    decimal_odds: Optional[float]
    rank: int


class OddsHistoryEntry(Schema):
    """Odds snapshot at a specific timestamp"""
    timestamp: str
    players: List[PlayerOddsInHistory]


class OddsHistoryResponse(Schema):
    """Response for odds history endpoint"""
    award_id: int
    award_name: str
    season_slug: str
    days: int
    history: List[OddsHistoryEntry]
