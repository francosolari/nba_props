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

    Only updates the session if it hasn't been updated in the last 15 minutes.
    This reduces database write load while still keeping active users logged in.

    Controlled by SESSION_ACTIVITY_UPDATE_INTERVAL (default 15 minutes) so we can
    keep active sessions alive without enabling SESSION_SAVE_EVERY_REQUEST.
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
            except Exception:
                # If the session backend is unavailable we keep the request flowing
                logger.exception("Failed to update throttled session activity timestamp")

        response = self.get_response(request)
        return response
