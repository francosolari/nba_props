# File: backend/predictions/utils/deadlines.py
"""
Utilities for handling submission deadline validation and enforcement.
"""

from django.utils import timezone
from predictions.models import Season
from ninja.errors import HttpError


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
    now = timezone.now().date()
    
    # Check if submission window has started
    if season.submission_start_date and now < season.submission_start_date:
        raise HttpError(
            403,
            f"Submission window has not opened yet. Opens on {season.submission_start_date}."
        )
    
    # Check if submission window has ended
    if season.submission_end_date and now > season.submission_end_date:
        raise HttpError(
            403,
            f"Submission window has closed. Deadline was {season.submission_end_date}."
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
    now = timezone.now().date()
    
    # Check if window has started
    if season.submission_start_date and now < season.submission_start_date:
        return False
    
    # Check if window has ended
    if season.submission_end_date and now > season.submission_end_date:
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
    now = timezone.now().date()
    
    status = {
        "is_open": False,
        "message": "",
        "start_date": season.submission_start_date,
        "end_date": season.submission_end_date,
        "days_until_open": None,
        "days_until_close": None,
    }
    
    # Window hasn't opened yet
    if season.submission_start_date and now < season.submission_start_date:
        days_until = (season.submission_start_date - now).days
        status["is_open"] = False
        status["message"] = f"Submission window opens in {days_until} day(s)"
        status["days_until_open"] = days_until
        return status
    
    # Window has closed
    if season.submission_end_date and now > season.submission_end_date:
        status["is_open"] = False
        status["message"] = "Submission window has closed"
        return status
    
    # Window is open
    if season.submission_end_date:
        days_remaining = (season.submission_end_date - now).days
        status["is_open"] = True
        status["message"] = f"Submission window closes in {days_remaining} day(s)"
        status["days_until_close"] = days_remaining
    else:
        status["is_open"] = True
        status["message"] = "Submission window is open"
    
    return status
