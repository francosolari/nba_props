from datetime import date
from ninja import Schema


class SeasonCreateSchema(Schema):
    """Schema for creating a new Season."""
    year: str
    start_date: date
    end_date: date
    submission_start_date: date
    submission_end_date: date
