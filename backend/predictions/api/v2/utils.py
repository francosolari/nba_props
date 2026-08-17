# File: backend/predictions/api/v2/utils.py
"""
Utility functions and decorators for API v2 endpoints.
"""

from functools import wraps
from django.conf import settings
from ninja.errors import HttpError


# Admin usernames list - can be extended via settings
ADMIN_USERNAMES = getattr(settings, 'ADMIN_USERNAMES', ['francosolari'])


def is_admin_user(user) -> bool:
    """
    Check if a user has admin privileges for question management.
    
    Args:
        user: Django User object
        
    Returns:
        True if user is admin, False otherwise
    """
    if not user or not user.is_authenticated:
        return False
    
    # Check if user is Django staff/superuser
    if user.is_staff or user.is_superuser:
        return True
    
    # Check if username is in admin list
    if user.username in ADMIN_USERNAMES:
        return True
    
    return False


def admin_required(func):
    """
    Decorator to require admin privileges for an endpoint.
    
    Usage:
        @router.post("/admin-endpoint")
        @admin_required
        def my_admin_endpoint(request):
            ...
    """
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        if not is_admin_user(request.user):
            raise HttpError(
                403,
                "Admin privileges required. You do not have permission to access this resource."
            )
        return func(request, *args, **kwargs)
    
    return wrapper


def get_user_context(request) -> dict:
    """
    Get user context information for frontend.
    
    Args:
        request: Django request object
        
    Returns:
        Dictionary with user context
    """
    user = request.user
    
    if not user or not user.is_authenticated:
        return {
            "is_authenticated": False,
            "is_admin": False,
            "username": None,
        }
    
    return {
        "is_authenticated": True,
        "is_admin": is_admin_user(user),
        "username": user.username,
        "user_id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }


def results_visible(season, user) -> bool:
    """
    Whether one participant may see other participants' picks and scores.

    Entries stay private until the submission window closes. While it is open,
    anyone who has already submitted would otherwise be exposed to whoever
    submits after them, who could simply copy the leading entry. Once the window
    shuts every entry is locked, so the comparison is fair and the leaderboard,
    the Cup table, and other players' answers all open up.

    Admins are exempt throughout: they grade, audit, and support during the
    window and need to see the entries to do it.

    Args:
        season: Season object being read, or None
        user: The requesting Django user

    Returns:
        True if other participants' entries may be returned
    """
    if is_admin_user(user):
        return True
    if not season:
        return False

    from django.utils import timezone
    from predictions.utils.deadlines import _ensure_aware

    submission_end = _ensure_aware(season.submission_end_date)
    if not submission_end:
        return False
    return timezone.localtime(timezone.now()) > submission_end
