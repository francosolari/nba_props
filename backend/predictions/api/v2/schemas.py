# File: predictions/api/v2/schemas.py
"""
Pydantic Schemas for NBA Predictions API v2

This module defines all data validation and serialization schemas used throughout
the API. Schemas provide automatic request/response validation, documentation
generation, and type safety.

Each schema corresponds to a specific data structure:
- Request schemas: Validate incoming data
- Response schemas: Structure outgoing data
- Nested schemas: Reusable components
"""

from typing import List, Optional, Dict, Any, Union
from ninja import Schema
from pydantic import Field, field_validator
from datetime import datetime


# ====================
# CORE ENTITY SCHEMAS
# ====================

class PlayerSchema(Schema):
    """
    Represents an NBA player.

    Used for: Player listings, team rosters, award selections
    """
    id: int = Field(..., description="Unique player identifier", example=1)
    name: str = Field(..., description="Player's full name", example="LeBron James")


class TeamSchema(Schema):
    """
    Represents an NBA team with conference information.

    Used for: Team listings, standings, predictions
    """
    id: int = Field(..., description="Unique team identifier", example=1)
    name: str = Field(..., description="Team name", example="Los Angeles Lakers")
    conference: str = Field(..., description="Conference (East/West)", example="West")

    @field_validator('conference')
    @classmethod
    def validate_conference(cls, v):
        """Ensure conference is either East or West"""
        if v not in ['East', 'West']:
            raise ValueError('Conference must be either East or West')
        return v


# ====================
# STANDINGS SCHEMAS
# ====================

class StandingSchema(Schema):
    """
    Represents a team's position in regular season standings.

    Contains team information plus season performance metrics.
    Used for: Regular season standings displays, ranking comparisons
    """
    id: int = Field(..., description="Team ID", example=1)
    name: str = Field(..., description="Team name", example="Boston Celtics")
    conference: str = Field(..., description="Team conference", example="East")
    wins: int = Field(..., description="Games won", example=45, ge=0, le=82)
    losses: int = Field(..., description="Games lost", example=37, ge=0, le=82)
    position: int = Field(..., description="Conference ranking", example=3, ge=1, le=15)
    win_percentage: float = Field(..., description="Win percentage", example=0.549, ge=0.0, le=1.0)


class ISTStandingSchema(Schema):
    """
    Represents a team's position in In-Season Tournament standings.

    Contains specialized IST metrics including group rankings,
    point differentials, and tournament advancement status.
    Used for: IST group standings, wildcard calculations
    """
    team_id: int = Field(..., description="Team ID", example=1)
    team_name: str = Field(..., description="Team name", example="Denver Nuggets")
    group_rank: int = Field(..., description="Rank within IST group", example=2, ge=1, le=5)
    wins: int = Field(..., description="IST games won", example=3, ge=0)
    losses: int = Field(..., description="IST games lost", example=1, ge=0)
    point_differential: int = Field(..., description="Point differential in IST", example=15)
    wildcard_rank: Optional[int] = Field(None, description="Wildcard ranking", ge=1)
    clinch_group: bool = Field(..., description="Has clinched group", example=False)
    clinch_knockout: bool = Field(..., description="Has clinched knockout round", example=False)
    clinch_wildcard: bool = Field(..., description="Has clinched wildcard spot", example=True)


# ====================
# USER & LEADERBOARD SCHEMAS
# ====================

class UserDisplaySchema(Schema):
    """
    Represents user information for public display.

    Includes privacy-conscious user data suitable for leaderboards
    and public-facing features. Excludes sensitive information.
    Used for: Leaderboards, prediction attribution, user profiles
    """
    id: int = Field(..., description="User ID", example=123)
    username: str = Field(..., description="Username", example="nba_fan_2024")
    first_name: str = Field(..., description="First name", example="John")
    last_name: str = Field(..., description="Last name", example="Smith")
    display_name: str = Field(..., description="Formatted display name", example="John S.")


class LeaderboardEntrySchema(Schema):
    """
    Represents a single entry in the leaderboard.

    Combines user information with their point total.
    Designed for leaderboard rankings and competitive displays.
    Used for: Main leaderboard, IST leaderboard, season rankings
    """
    user: UserDisplaySchema = Field(..., description="User information")
    points: int = Field(..., description="Total points earned", example=150, ge=0)


# ====================
# PREDICTION SCHEMAS
# ====================

class PredictionSchema(Schema):
    """
    Represents a user's standing prediction for a team.

    Contains the user's predicted final position for a team
    along with points earned based on accuracy.
    Used for: Prediction displays, accuracy tracking, scoring
    """
    user: str = Field(..., description="Username who made prediction", example="nba_expert")
    team_id: int = Field(..., description="Team being predicted", example=1)
    team_name: str = Field(..., description="Team name", example="Golden State Warriors")
    team_conference: str = Field(..., description="Team conference", example="West")
    predicted_position: int = Field(..., description="Predicted final position", example=4, ge=1, le=15)
    points: int = Field(..., description="Points earned for accuracy", example=8, ge=0)


# ====================
# QUESTION & ANSWER SCHEMAS
# ====================

class QuestionBaseSchema(Schema):
    """
    Base schema for all question types.

    Contains common fields shared across different question types
    (superlative, prop bets, head-to-head, etc.).
    Used as: Parent class for specific question schemas
    """
    id: int = Field(..., description="Question ID", example=42)
    text: str = Field(..., description="Question text", example="Who will win MVP?")
    point_value: int = Field(..., description="Points awarded for correct answer", example=10, ge=1)
    question_type: str = Field(..., description="Type of question", example="superlative")


class AnswerSubmissionSchema(Schema):
    """
    Schema for submitting an answer to a question.

    Used in POST requests when users submit their predictions.
    Validates that both question ID and answer are provided.
    Used for: Answer submission endpoints, form validation
    """
    question: int = Field(..., description="Question ID", example=42, gt=0)
    answer: str = Field(..., description="User's answer", example="Nikola Jokic")

    @field_validator('answer')
    @classmethod
    def validate_answer_not_empty(cls, v):
        """Ensure answer is not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('Answer cannot be empty')
        return v.strip()


class AnswersRequestSchema(Schema):
    """
    Schema for bulk answer submission.

    Allows users to submit multiple answers in a single request.
    Validates that the answers list is not empty and contains valid submissions.
    Used for: Bulk answer submission, form processing
    """
    answers: List[AnswerSubmissionSchema] = Field(..., description="List of answers to submit")

    @field_validator('answers')
    @classmethod
    def validate_answers_not_empty(cls, v):
        """Ensure at least one answer is being submitted"""
        if not v:
            raise ValueError('At least one answer must be provided')
        return v


class UserAnswerSchema(Schema):
    """
    Schema for displaying a user's submitted answer.

    Contains the answer along with question context and scoring information.
    Used for: User answer history, answer review, scoring displays
    """
    question_id: int = Field(..., description="Question ID", example=42)
    question_text: str = Field(..., description="Original question", example="Who will win MVP?")
    question_type: str = Field(..., description="Question category", example="superlative")
    season: str = Field(..., description="Season slug", example="2023-24")
    answer: str = Field(..., description="User's submitted answer", example="Nikola Jokic")
    points_earned: Optional[int] = Field(None, description="Points earned (if graded)", example=10)

# ====================
# HOMEPAGE & TICKER SCHEMAS
# ====================

class TickerItemSchema(Schema):
    """
    Represents a single item in the homepage ticker carousel.

    Contains formatted messages for display in the scrolling ticker,
    including user attribution and content categorization.
    Used for: Homepage ticker display, activity feeds, user engagement
    """
    message: str = Field(..., description="Formatted ticker message", example="Franco S predicts Lakers will finish #3")
    user: str = Field(..., description="Display name of user", example="Franco S")
    type: str = Field(..., description="Content type", example="prediction")
    question: Optional[str] = Field(None, description="Original question text for props", example="Who will win MVP?")
    answer: Optional[str] = Field(None, description="User's answer for props", example="LeBron James")

    @field_validator('type')
    @classmethod
    def validate_ticker_type(cls, v):
        """Ensure ticker type is valid"""
        if v not in ['prediction', 'prop']:
            raise ValueError('Ticker type must be either prediction or prop')
        return v


class MiniLeaderboardEntrySchema(Schema):
    """
    Represents a condensed leaderboard entry for homepage display.

    Simplified version of LeaderboardEntrySchema optimized for
    space-constrained homepage widgets.
    Used for: Homepage mini-leaderboard, summary displays
    """
    rank: int = Field(..., description="User's ranking position", example=1, ge=1)
    user: Dict[str, Union[int, str]] = Field(..., description="User identification", example={"username": "nba_fan", "display_name": "John S."})
    points: int = Field(..., description="Total points earned", example=150, ge=0)


class MiniStandingSchema(Schema):
    """
    Represents a condensed team standing for homepage display.

    Simplified version of StandingSchema with essential information
    for quick reference on the homepage.
    Used for: Homepage mini-standings, conference summaries
    """
    team: str = Field(..., description="Team name", example="Boston Celtics")
    wins: int = Field(..., description="Games won", example=45, ge=0, le=82)
    losses: int = Field(..., description="Games lost", example=37, ge=0, le=82)
    position: int = Field(..., description="Conference ranking", example=3, ge=1, le=15)

    @field_validator('wins', 'losses')
    @classmethod
    def validate_game_counts(cls, v):
        """Ensure game counts are within valid NBA season range"""
        if v < 0 or v > 82:
            raise ValueError('Game count must be between 0 and 82')
        return v


class MiniStandingsSchema(Schema):
    """
    Represents condensed standings for both conferences.

    Contains top teams from each conference for homepage display.
    Optimized for quick overview of league standings.
    Used for: Homepage standings widget, conference comparisons
    """
    eastern: List[MiniStandingSchema] = Field(..., description="Top Eastern Conference teams")
    western: List[MiniStandingSchema] = Field(..., description="Top Western Conference teams")

    @field_validator('eastern', 'western')
    @classmethod
    def validate_standings_not_empty(cls, v):
        """Ensure each conference has at least one team"""
        if not v:
            raise ValueError('Conference standings cannot be empty')
        return v


# ====================
# RESPONSE WRAPPER SCHEMAS
# ====================

class PlayersResponseSchema(Schema):
    """Response schema for players endpoint"""
    players: List[PlayerSchema] = Field(..., description="List of all NBA players")


class TeamsResponseSchema(Schema):
    """Response schema for teams endpoint"""
    teams: List[TeamSchema] = Field(..., description="List of all NBA teams")


class StandingsResponseSchema(Schema):
    """Response schema for standings endpoint"""
    east: List[StandingSchema] = Field(..., description="Eastern Conference standings")
    west: List[StandingSchema] = Field(..., description="Western Conference standings")


class LeaderboardResponseSchema(Schema):
    """Response schema for leaderboard endpoint"""
    top_users: List[LeaderboardEntrySchema] = Field(..., description="Users ranked by points")


class PredictionsResponseSchema(Schema):
    """Response schema for predictions endpoint"""
    predictions: List[PredictionSchema] = Field(..., description="User predictions for season")


class UserAnswersResponseSchema(Schema):
    """Response schema for user answers endpoint"""
    user: Dict[str, Union[int, str]] = Field(..., description="User identification")
    answers: List[UserAnswerSchema] = Field(..., description="User's submitted answers")


class SeasonResponseSchema(Schema):
    """Response schema for latest season endpoint"""
    slug: Optional[str] = Field(None, description="Latest season slug", example="2023-24")


class EntryFeeStatusSchema(Schema):
    """Entry fee payment status and Venmo metadata"""
    season_slug: str = Field(..., description="Season slug the entry fee applies to", example="2025-26")
    is_paid: bool = Field(..., description="Whether the user has marked the entry fee as paid")
    paid_at: Optional[datetime] = Field(None, description="Timestamp when the fee was marked as paid")
    amount_due: str = Field(..., description="Entry fee amount formatted as currency", example="25.00")
    venmo_username: str = Field(..., description="Venmo username to send payment to", example="francosolari")
    venmo_web_url: str = Field(..., description="Web URL that opens the Venmo payment prompt")
    venmo_deep_link: str = Field(..., description="Deep link that attempts to open the Venmo app")
    payment_note: str = Field(..., description="Recommended payment note for the transaction")


class EntryFeeUpdateSchema(Schema):
    """Payload for updating entry fee payment status"""
    is_paid: bool = Field(..., description="Mark entry fee as paid (true) or unpaid (false)")

# ====================
# HOMEPAGE RESPONSE WRAPPER SCHEMAS
# ====================

class RandomPredictionsResponseSchema(Schema):
    """Response schema for random predictions ticker endpoint"""
    ticker_items: List[TickerItemSchema] = Field(..., description="Random user predictions for ticker display")


class RandomPropsResponseSchema(Schema):
    """Response schema for random props ticker endpoint"""
    ticker_items: List[TickerItemSchema] = Field(..., description="Random user prop answers for ticker display")


class HomepageDataResponseSchema(Schema):
    """
    Response schema for comprehensive homepage data endpoint.

    Combines multiple data sources into a single optimized response
    to minimize API calls for homepage rendering.
    Used for: Homepage initialization, dashboard data loading
    """
    mini_leaderboard: List[MiniLeaderboardEntrySchema] = Field(..., description="Top 5 users by points")
    mini_standings: MiniStandingsSchema = Field(..., description="Top 3 teams from each conference")



# ====================
# ERROR SCHEMAS
# ====================

class ErrorSchema(Schema):
    """
    Standard error response schema.

    Provides consistent error messaging across all endpoints.
    Used for: 400, 404, 422, 500 error responses
    """
    error: str = Field(..., description="Error message", example="Season not found")
    details: Optional[str] = Field(None, description="Additional error details")


class ValidationErrorSchema(Schema):
    """
    Schema for validation error responses.

    Used when request data fails validation.
    Provides detailed field-level error information.
    Used for: 422 Unprocessable Entity responses
    """
    status: str = Field(..., description="Error status", example="error")
    errors: Dict[str, str] = Field(..., description="Field-specific error messages")


class SuccessSchema(Schema):
    """
    Schema for successful operation responses.

    Used for operations that don't return data (like submissions).
    Provides consistent success messaging.
    Used for: POST, PUT, DELETE success responses
    """
    status: str = Field(..., description="Operation status", example="success")
    message: str = Field(..., description="Success message", example="Data saved successfully")
