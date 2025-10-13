# File: backend/predictions/utils/deadlines.py
"""
Utilities for handling submission deadline validation and enforcement.
"""

from datetime import datetime, time
from django.utils import timezone
from predictions.models import Season
from ninja.errors import HttpError


def _ensure_aware(value):
    """Ensure datetimes are timezone-aware for reliable comparisons."""
    if value is None:
        return None
    if not isinstance(value, datetime):
        value = datetime.combine(value, time.min)
    if timezone.is_naive(value):
        value = timezone.make_aware(value)
    return timezone.localtime(value)


def validate_submission_window(season: Season) -> bool:
    """
    Validates if the current time is within the submission window for a season.
    
    Args:
        season: Season object to validate
        
    Returns:
        True if submission window is open
        
    Raises:
        HttpError: If submission window is not open (403 Forbidden)
    """
    now = timezone.localtime(timezone.now())
    
    # Check if submission window has started
    submission_start = _ensure_aware(season.submission_start_date)
    submission_end = _ensure_aware(season.submission_end_date)

    if submission_start and now < submission_start:
        raise HttpError(
            403,
            f"Submission window has not opened yet. Opens on {submission_start}."
        )

    # Check if submission window has ended
    if submission_end and now > submission_end:
        raise HttpError(
            403,
            f"Submission window has closed. Deadline was {submission_end}."
        )
    
    return True


def is_submission_open(season: Season) -> bool:
    """
    Check if submission window is open without raising an exception.
    
    Args:
        season: Season object to check
        
    Returns:
        True if submissions are currently allowed, False otherwise
    """
    now = timezone.localtime(timezone.now())
    
    # Check if window has started
    submission_start = _ensure_aware(season.submission_start_date)
    submission_end = _ensure_aware(season.submission_end_date)

    if submission_start and now < submission_start:
        return False

    # Check if window has ended
    if submission_end and now > submission_end:
        return False
    
    return True


def get_submission_status(season: Season) -> dict:
    """
    Get detailed information about submission window status.
    
    Args:
        season: Season object to check
        
    Returns:
        Dictionary with submission status information
    """
    now = timezone.localtime(timezone.now())
    
    submission_start = _ensure_aware(season.submission_start_date)
    submission_end = _ensure_aware(season.submission_end_date)

    status = {
        "is_open": False,
        "message": "",
        "start_date": submission_start,
        "end_date": submission_end,
        "days_until_open": None,
        "days_until_close": None,
    }
    
    # Window hasn't opened yet
    if submission_start and now < submission_start:
        delta = submission_start - now
        days_until = max(int(delta.total_seconds() // 86400), 0)
        status["is_open"] = False
        status["message"] = f"Submission window opens in {days_until} day(s)" if days_until else "Submission window opens later today"
        status["days_until_open"] = days_until
        return status
    
    # Window has closed
    if submission_end and now > submission_end:
        status["is_open"] = False
        status["message"] = "Submission window has closed"
        return status
    
    # Window is open
    if submission_end:
        delta = submission_end - now
        days_remaining = max(int(delta.total_seconds() // 86400), 0)
        status["is_open"] = True
        status["message"] = f"Submission window closes in {days_remaining} day(s)" if days_remaining else "Submission window closes later today"
        status["days_until_close"] = days_remaining
    else:
        status["is_open"] = True
        status["message"] = "Submission window is open"
    
    return status
