"""
Custom middleware for NBA Predictions application.
"""
import time


class ThrottledSessionMiddleware:
    """
    Middleware to throttle session updates and reduce database writes.

    Only updates the session if it hasn't been updated in the last 15 minutes.
    This reduces database write load while still keeping active users logged in.

    Works in conjunction with SESSION_SAVE_EVERY_REQUEST = True setting.
    """

    # Update session every 15 minutes (900 seconds)
    UPDATE_INTERVAL = 900

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check when session was last updated
        if hasattr(request, 'session'):
            last_activity = request.session.get('last_activity')
            now = time.time()

            # Only mark session as modified if enough time has passed
            if not last_activity or (now - last_activity) > self.UPDATE_INTERVAL:
                request.session['last_activity'] = now
                # Mark session as modified to trigger save
                request.session.modified = True

        response = self.get_response(request)
        return response
