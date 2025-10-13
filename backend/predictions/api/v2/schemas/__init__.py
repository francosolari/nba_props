# File: predictions/api/v2/schemas/__init__.py
"""
Schema package for API v2.
Provides all Pydantic schemas for request/response validation.
"""

# Import legacy schemas from the old schemas.py location
# These will be deprecated and moved here eventually
from predictions.api.v2.schemas_legacy import (
    PlayerSchema,
    TeamSchema,
    StandingSchema,
    ISTStandingSchema,
    UserDisplaySchema,
    LeaderboardEntrySchema,
    PredictionSchema,
    ErrorSchema,
)

# Import new question-related schemas
from .questions import (
    # Base schemas
    QuestionBaseSchema,
    
    # Specific question type schemas
    SuperlativeQuestionSchema,
    PropQuestionSchema,
    PlayerStatPredictionQuestionSchema,
    HeadToHeadQuestionSchema,
    InSeasonTournamentQuestionSchema,
    NBAFinalsPredictionQuestionSchema,
    
    # Answer schemas
    AnswerSchema,
    AnswerSubmitSchema,
    BulkAnswerSubmitSchema,
    AnswerSubmitResponseSchema,
    
    # Response schemas
    QuestionsListResponse,
    UserAnswersResponse,
    
    # Admin schemas
    SuperlativeQuestionCreateSchema,
    PropQuestionCreateSchema,
    PlayerStatPredictionQuestionCreateSchema,
    HeadToHeadQuestionCreateSchema,
    InSeasonTournamentQuestionCreateSchema,
    NBAFinalsPredictionQuestionCreateSchema,
    QuestionUpdateSchema,
    QuestionReorderSchema,
    QuestionDeleteResponseSchema,
)

__all__ = [
    # Legacy schemas
    'PlayerSchema',
    'TeamSchema',
    'StandingSchema',
    'ISTStandingSchema',
    'UserDisplaySchema',
    'LeaderboardEntrySchema',
    'PredictionSchema',
    'ErrorSchema',
    
    # Question schemas
    'QuestionBaseSchema',
    'SuperlativeQuestionSchema',
    'PropQuestionSchema',
    'PlayerStatPredictionQuestionSchema',
    'HeadToHeadQuestionSchema',
    'InSeasonTournamentQuestionSchema',
    'NBAFinalsPredictionQuestionSchema',
    
    # Answer schemas
    'AnswerSchema',
    'AnswerSubmitSchema',
    'BulkAnswerSubmitSchema',
    'AnswerSubmitResponseSchema',
    
    # Response schemas
    'QuestionsListResponse',
    'UserAnswersResponse',
    
    # Admin schemas
    'SuperlativeQuestionCreateSchema',
    'PropQuestionCreateSchema',
    'PlayerStatPredictionQuestionCreateSchema',
    'HeadToHeadQuestionCreateSchema',
    'InSeasonTournamentQuestionCreateSchema',
    'NBAFinalsPredictionQuestionCreateSchema',
    'QuestionUpdateSchema',
    'QuestionReorderSchema',
    'QuestionDeleteResponseSchema',
]
