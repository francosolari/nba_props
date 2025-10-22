# File: predictions/api/v2/schemas/admin_grading.py
"""
Pydantic schemas for admin grading endpoints
"""

from ninja import Schema
from typing import List, Optional
from datetime import datetime


class QuestionGradingDetail(Schema):
    """Details of a single question's grading for a user"""
    question_id: int
    question_text: str
    question_type: str
    user_answer: Optional[str]
    correct_answer: Optional[str]
    is_correct: Optional[bool]
    points_earned: float
    point_value: float
    is_finalized: bool
    submission_date: Optional[str]


class CategoryBreakdown(Schema):
    """Points breakdown for a category"""
    category_name: str
    total_points: float
    possible_points: float
    correct_count: int
    incorrect_count: int
    pending_count: int
    finalized_count: int
    non_finalized_count: int
    questions: List[QuestionGradingDetail]


class UserGradingBreakdown(Schema):
    """Complete grading breakdown for a user"""
    user_id: int
    username: str
    display_name: str
    total_points: float
    categories: List[CategoryBreakdown]


class GradingAuditResponse(Schema):
    """Response for grading audit endpoint"""
    season_slug: str
    season_year: str
    users: List[UserGradingBreakdown]


class AnswerReviewItem(Schema):
    """Single answer for review"""
    answer_id: int
    question_id: int
    question_text: str
    question_type: str
    user_id: int
    username: str
    user_answer: Optional[str]
    correct_answer: Optional[str]
    is_correct: Optional[bool]
    points_earned: float
    point_value: float
    is_finalized: bool
    submission_date: Optional[str]


class AnswerReviewResponse(Schema):
    """Response for answer review endpoint"""
    season_slug: str
    total_count: int
    answers: List[AnswerReviewItem]


class ManualGradeRequest(Schema):
    """Request to manually grade an answer"""
    answer_id: int
    is_correct: bool
    points_override: Optional[float] = None
    correct_answer: Optional[str] = None


class ManualGradeResponse(Schema):
    """Response after manual grading"""
    success: bool
    answer_id: int
    is_correct: bool
    points_earned: float
    user_total_points: float
    message: str


class GradingCommandRequest(Schema):
    """Request to run a grading command"""
    command: str  # One of: grade_props_answers, grade_standing_predictions, grade_ist_predictions
    season_slug: str


class GradingCommandResponse(Schema):
    """Response after running a grading command"""
    success: bool
    command: str
    season_slug: str
    message: str
    timestamp: str


# New schemas for question grading interface

class QuestionForGradingItem(Schema):
    """Single question for grading (setting correct answer)"""
    question_id: int
    question_text: str
    question_type: str
    category: str
    correct_answer: Optional[str]
    point_value: float
    is_finalized: bool
    submission_count: int  # Number of user submissions for this question
    has_correct_answer: bool  # Whether correct_answer is set


class QuestionsForGradingResponse(Schema):
    """Response for questions-for-grading endpoint"""
    season_slug: str
    season_year: str
    total_questions: int
    questions: List[QuestionForGradingItem]


class UpdateQuestionRequest(Schema):
    """Request to update a question's correct answer"""
    question_id: int
    correct_answer: str
    is_finalized: Optional[bool] = None


class UpdateQuestionResponse(Schema):
    """Response after updating question"""
    success: bool
    question_id: int
    correct_answer: str
    is_finalized: bool
    message: str
