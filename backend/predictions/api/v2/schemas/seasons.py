from datetime import datetime, date
from ninja import Schema


class SeasonCreateSchema(Schema):
    """Schema for creating a new Season."""
    year: str
    start_date: date
    end_date: date
    submission_start_date: datetime
    submission_end_date: datetime
