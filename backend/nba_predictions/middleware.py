"""
Custom middleware for NBA Predictions application.
"""
import logging
import time

from django.conf import settings

logger = logging.getLogger(__name__)


class ThrottledSessionMiddleware:
    """
    Middleware to throttle session updates and reduce database writes.

    Replaces SESSION_SAVE_EVERY_REQUEST by only updating sessions every 15 minutes.
    This reduces database write load (~85% reduction) while keeping active users logged in.

    IMPORTANT: SESSION_SAVE_EVERY_REQUEST must be False (Django default) for this to work.
    If SESSION_SAVE_EVERY_REQUEST is True, Django will save on every request regardless
    of this middleware, defeating the purpose of throttling.

    Controlled by SESSION_ACTIVITY_UPDATE_INTERVAL (default 900 seconds = 15 minutes).
    """

    DEFAULT_UPDATE_INTERVAL = 900

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _get_update_interval():
        return getattr(
            settings, 'SESSION_ACTIVITY_UPDATE_INTERVAL', ThrottledSessionMiddleware.DEFAULT_UPDATE_INTERVAL
        )

    def __call__(self, request):
        # Check when session was last updated
        if hasattr(request, 'session'):
            try:
                session = request.session
                last_activity = session.get('last_activity')
                now = time.time()
                update_interval = self._get_update_interval()

                # Only mark session as modified if enough time has passed
                if not last_activity or (now - last_activity) > update_interval:
                    session['last_activity'] = now
                    # Mark session as modified to trigger save
                    session.modified = True
                    # Explicitly extend session expiry to ensure it's extended
                    # This makes the behavior explicit and backend-agnostic
                    session.set_expiry(settings.SESSION_COOKIE_AGE)
            except Exception as e:
                # If the session backend is unavailable we keep the request flowing
                # Log the error for debugging but don't break the request
                if settings.DEBUG:
                    logger.exception("Failed to update throttled session activity timestamp")
                else:
                    logger.error(f"Session update failed: {str(e)}")

        response = self.get_response(request)
        return response
