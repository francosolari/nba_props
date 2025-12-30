# File: backend/predictions/api/v2/schemas/questions.py
"""
Pydantic schemas for Question and Answer operations in API v2.
Supports all polymorphic question types with proper serialization.
"""

from ninja import Schema
from typing import Optional, List, Literal, Union, Dict
from datetime import datetime


# ============================================
# BASE QUESTION SCHEMAS
# ============================================

class QuestionBaseSchema(Schema):
    """Base schema for all question types"""
    id: int
    season_slug: str
    text: str
    point_value: float
    is_manual: bool
    last_updated: datetime
    question_type: str  # Discriminator field


# ============================================
# SPECIFIC QUESTION TYPE SCHEMAS
# ============================================

class SuperlativeQuestionSchema(QuestionBaseSchema):
    """Schema for Superlative (Award) Questions"""
    question_type: Literal["superlative"] = "superlative"
    award_id: int
    award_name: str
    is_finalized: bool
    winners: Optional[List[int]] = None  # List of player IDs


class PropQuestionSchema(QuestionBaseSchema):
    """Schema for Prop Questions (Over/Under or Yes/No)"""
    question_type: Literal["prop"] = "prop"
    outcome_type: Literal["over_under", "yes_no"]
    related_player_id: Optional[int] = None
    related_player_name: Optional[str] = None
    line: Optional[float] = None  # Only for over_under type


class PlayerStatPredictionQuestionSchema(QuestionBaseSchema):
    """Schema for Player Stat Prediction Questions"""
    question_type: Literal["player_stat"] = "player_stat"
    player_stat_id: int
    stat_type: str
    fixed_value: Optional[float] = None
    current_leaders: Optional[dict] = None
    top_performers: Optional[dict] = None


class HeadToHeadQuestionSchema(QuestionBaseSchema):
    """Schema for Head-to-Head Questions"""
    question_type: Literal["head_to_head"] = "head_to_head"
    team1_id: int
    team1_name: str
    team2_id: int
    team2_name: str


class InSeasonTournamentQuestionSchema(QuestionBaseSchema):
    """Schema for In-Season Tournament Questions"""
    question_type: Literal["ist"] = "ist"
    prediction_type: Literal["group_winner", "wildcard", "conference_winner", "champion", "tiebreaker"]
    ist_group: Optional[str] = None
    is_tiebreaker: bool


class NBAFinalsPredictionQuestionSchema(QuestionBaseSchema):
    """Schema for NBA Finals Prediction Questions"""
    question_type: Literal["nba_finals"] = "nba_finals"
    group_name: Optional[str] = None


QuestionSchema = Union[
    SuperlativeQuestionSchema,
    PropQuestionSchema,
    PlayerStatPredictionQuestionSchema,
    HeadToHeadQuestionSchema,
    InSeasonTournamentQuestionSchema,
    NBAFinalsPredictionQuestionSchema,
]


class SubmissionStatusSchema(Schema):
    """Detailed submission window status"""
    is_open: bool
    message: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    days_until_open: Optional[int] = None
    days_until_close: Optional[int] = None


# ============================================
# ANSWER SCHEMAS
# ============================================

class AnswerSchema(Schema):
    """Schema for user answers"""
    id: int
    question_id: int
    question_text: str
    question_type: str
    answer: str
    points_earned: Optional[float] = None
    is_correct: Optional[bool] = None
    submission_date: datetime


class AnswerSubmitSchema(Schema):
    """Schema for submitting a single answer"""
    question_id: int
    answer: str


class BulkAnswerSubmitSchema(Schema):
    """Schema for submitting multiple answers at once"""
    answers: List[AnswerSubmitSchema]


class AnswerSubmitResponseSchema(Schema):
    """Response schema after submitting answers"""
    status: str
    message: str
    saved_count: int
    errors: Optional[Dict[str, str]] = None


# ============================================
# STANDINGS PREDICTION SCHEMAS
# ============================================


class StandingPredictionEntrySchema(Schema):
    """Single standings prediction entry"""
    team_id: int
    predicted_position: int


class StandingPredictionsSubmitSchema(Schema):
    """Payload schema for submitting standings predictions"""
    predictions: List[StandingPredictionEntrySchema]


class StandingPredictionResponseSchema(Schema):
    """Single saved standings prediction record"""
    team_id: int
    team_name: str
    team_conference: str
    predicted_position: int


class StandingPredictionsResponseSchema(Schema):
    """Response schema for fetching standings predictions"""
    season_slug: str
    username: Optional[str] = None
    predictions: List[StandingPredictionResponseSchema]
    east: List[StandingPredictionResponseSchema]
    west: List[StandingPredictionResponseSchema]


class StandingPredictionsSubmitResponseSchema(Schema):
    """Response schema after submitting standings predictions"""
    status: str
    message: str
    saved_count: int
    errors: Optional[Dict[str, str]] = None


# ============================================
# QUESTION LIST RESPONSE
# ============================================

class QuestionsListResponse(Schema):
    """Response schema for getting questions list"""
    season_slug: str
    submission_open: bool
    submission_start_date: Optional[datetime] = None
    submission_end_date: Optional[datetime] = None
    submission_status: SubmissionStatusSchema
    questions: List[QuestionSchema]


class UserAnswersResponse(Schema):
    """Response schema for getting user's answers"""
    season_slug: str
    answers: List[AnswerSchema]
    total_points: Optional[float] = None


# ============================================
# ADMIN QUESTION CREATION SCHEMAS
# ============================================

class SuperlativeQuestionCreateSchema(Schema):
    """Schema for creating a Superlative question"""
    season_slug: str
    text: str
    point_value: float = 0.5
    award_id: int


class PropQuestionCreateSchema(Schema):
    """Schema for creating a Prop question"""
    season_slug: str
    text: str
    point_value: float = 0.5
    outcome_type: Literal["over_under", "yes_no"]
    related_player_id: Optional[int] = None
    line: Optional[float] = None


class PlayerStatPredictionQuestionCreateSchema(Schema):
    """Schema for creating a Player Stat Prediction question"""
    season_slug: str
    text: str
    point_value: float = 0.5
    player_stat_id: int
    stat_type: str
    fixed_value: Optional[float] = None


class HeadToHeadQuestionCreateSchema(Schema):
    """Schema for creating a Head-to-Head question"""
    season_slug: str
    text: str
    point_value: float = 0.5
    team1_id: int
    team2_id: int


class InSeasonTournamentQuestionCreateSchema(Schema):
    """Schema for creating an IST question"""
    season_slug: str
    text: str
    point_value: float = 0.5
    prediction_type: Literal["group_winner", "wildcard", "conference_winner", "champion", "tiebreaker"]
    ist_group: Optional[str] = None
    is_tiebreaker: bool = False


class NBAFinalsPredictionQuestionCreateSchema(Schema):
    """Schema for creating an NBA Finals question"""
    season_slug: str
    text: str
    point_value: float = 0.5
    group_name: Optional[str] = None


class QuestionUpdateSchema(Schema):
    """Schema for updating any question"""
    text: Optional[str] = None
    point_value: Optional[float] = None

    # Superlative question fields
    award_id: Optional[int] = None

    # Prop question fields
    outcome_type: Optional[Literal["over_under", "yes_no"]] = None
    related_player_id: Optional[int] = None
    line: Optional[float] = None

    # Player stat question fields
    player_stat_id: Optional[int] = None
    stat_type: Optional[str] = None
    fixed_value: Optional[float] = None

    # Head-to-head question fields
    team1_id: Optional[int] = None
    team2_id: Optional[int] = None

    # IST question fields
    prediction_type: Optional[Literal["group_winner", "wildcard", "conference_winner", "champion", "tiebreaker"]] = None
    ist_group: Optional[str] = None
    is_tiebreaker: Optional[bool] = None

    # NBA Finals question fields
    group_name: Optional[str] = None


class QuestionReorderSchema(Schema):
    """Schema for reordering questions"""
    question_ids: List[int]


class QuestionDeleteResponseSchema(Schema):
    """Response schema for question deletion"""
    status: str
    message: str
    deleted_id: int
