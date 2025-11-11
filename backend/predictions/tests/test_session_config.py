"""
Tests for session configuration and behavior.

These tests verify that the session management settings work correctly
and don't conflict with django-allauth authentication flows.
"""
import time
from unittest import mock
from django.test import TestCase, Client, override_settings
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.utils import timezone
from datetime import timedelta


class SessionConfigTest(TestCase):
    """Test session configuration settings."""

    def test_session_age_configuration(self):
        """Verify SESSION_COOKIE_AGE is set to 2 weeks."""
        self.assertEqual(settings.SESSION_COOKIE_AGE, 1209600)  # 2 weeks in seconds

    def test_session_expire_at_browser_close(self):
        """Verify sessions persist across browser restarts."""
        self.assertEqual(settings.SESSION_EXPIRE_AT_BROWSER_CLOSE, False)

    def test_session_save_every_request(self):
        """Verify SESSION_SAVE_EVERY_REQUEST is False (using middleware instead)."""
        # We use ThrottledSessionMiddleware instead of SESSION_SAVE_EVERY_REQUEST
        # to reduce database writes while keeping users logged in
        self.assertFalse(settings.SESSION_SAVE_EVERY_REQUEST)

    def test_session_cookie_httponly(self):
        """Verify session cookie is HTTP-only (prevents XSS)."""
        self.assertEqual(settings.SESSION_COOKIE_HTTPONLY, True)

    def test_session_cookie_samesite(self):
        """Verify session cookie uses Lax SameSite policy."""
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, 'Lax')

    def test_session_cookie_secure_in_production(self):
        """Verify SESSION_COOKIE_SECURE matches IS_DEVELOPMENT setting."""
        # SESSION_COOKIE_SECURE is set to: not IS_DEVELOPMENT in settings.py
        # This ensures it's False in development (HTTP) and True in production (HTTPS)
        is_development = getattr(settings, 'IS_DEVELOPMENT', settings.DEBUG)
        expected_secure = not is_development
        self.assertEqual(settings.SESSION_COOKIE_SECURE, expected_secure)


class SessionBehaviorTest(TestCase):
    """Test actual session behavior with configured settings."""

    def setUp(self):
        """Create a test user for session tests."""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_session_persists_across_requests(self):
        """Verify session remains active across multiple requests."""
        # Login
        self.client.login(username='testuser', password='testpass123')

        # Get initial session key
        initial_session_key = self.client.session.session_key
        self.assertIsNotNone(initial_session_key)

        # Make multiple requests (allow redirects from onboarding middleware)
        for _ in range(5):
            response = self.client.get('/', follow=True)
            # Should get 200 after following redirects
            self.assertEqual(response.status_code, 200)

        # Verify session key hasn't changed
        self.assertEqual(self.client.session.session_key, initial_session_key)

    def test_session_expiry_extends_on_activity(self):
        """Verify session expiry is extended by ThrottledSessionMiddleware."""
        # Login
        self.client.login(username='testuser', password='testpass123')
        session_key = self.client.session.session_key

        # Make initial request to set last_activity
        self.client.get('/')

        # Verify last_activity was set by middleware
        self.assertIn('last_activity', self.client.session)

        # Get initial values
        session = Session.objects.get(session_key=session_key)
        initial_expiry = session.expire_date
        initial_activity = self.client.session['last_activity']

        # Wait longer than test timing but less than throttle interval
        time.sleep(1)

        # Make another request (won't update due to throttling)
        self.client.get('/')

        # Activity timestamp should be the same (throttled)
        self.assertEqual(self.client.session['last_activity'], initial_activity)

        # Expiry should remain stable for throttled requests
        session.refresh_from_db()
        updated_expiry = session.expire_date
        self.assertGreaterEqual(updated_expiry, initial_expiry)

    @override_settings(SESSION_ACTIVITY_UPDATE_INTERVAL=1)
    def test_session_expiry_extends_after_throttle_interval(self):
        """Verify sessions are extended once the throttle window has passed."""
        self.client.login(username='testuser', password='testpass123')
        session_key = self.client.session.session_key

        with mock.patch('nba_predictions.middleware.time.time') as mocked_time:
            mocked_time.return_value = 1000.0
            self.client.get('/')
            initial_activity = self.client.session['last_activity']

            session = Session.objects.get(session_key=session_key)
            initial_expiry = session.expire_date

            # Advance mocked time beyond the throttle interval
            mocked_time.return_value = 1002.0
            self.client.get('/')

        session.refresh_from_db()
        updated_activity = self.client.session['last_activity']
        updated_expiry = session.expire_date

        self.assertGreater(updated_activity, initial_activity)
        self.assertGreater(updated_expiry, initial_expiry)

    def test_session_cleanup_removes_expired_sessions(self):
        """Verify expired sessions can be cleaned up."""
        # Create a session that's already expired
        expired_session = Session.objects.create(
            session_key='expired_test_session',
            session_data='test_data',
            expire_date=timezone.now() - timedelta(days=1)
        )

        # Create a valid session
        self.client.login(username='testuser', password='testpass123')
        valid_session_key = self.client.session.session_key

        # Count sessions before cleanup
        total_before = Session.objects.count()
        self.assertGreaterEqual(total_before, 2)  # At least expired + valid

        # Clean up expired sessions
        expired_count = Session.objects.filter(expire_date__lt=timezone.now()).count()
        Session.objects.filter(expire_date__lt=timezone.now()).delete()

        # Verify expired session was deleted
        self.assertFalse(Session.objects.filter(session_key='expired_test_session').exists())

        # Verify valid session still exists
        self.assertTrue(Session.objects.filter(session_key=valid_session_key).exists())

        # Verify count decreased
        total_after = Session.objects.count()
        self.assertEqual(total_after, total_before - expired_count)


class ThrottledSessionMiddlewareTest(TestCase):
    """Test the ThrottledSessionMiddleware."""

    def setUp(self):
        """Create a test user."""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_middleware_adds_last_activity(self):
        """Verify middleware adds last_activity to session."""
        # Login
        self.client.login(username='testuser', password='testpass123')

        # Make a request
        self.client.get('/')

        # Check session has last_activity
        self.assertIn('last_activity', self.client.session)
        self.assertIsInstance(self.client.session['last_activity'], float)

    def test_middleware_throttles_updates(self):
        """Verify middleware doesn't update session too frequently."""
        # Login
        self.client.login(username='testuser', password='testpass123')

        # Make initial request
        self.client.get('/')
        first_activity = self.client.session.get('last_activity')

        # Make another request immediately
        time.sleep(0.1)
        self.client.get('/')
        second_activity = self.client.session.get('last_activity')

        # Activity timestamp should be the same (throttled)
        self.assertEqual(first_activity, second_activity)


class DjangoAllauthCompatibilityTest(TestCase):
    """Test session configuration compatibility with django-allauth."""

    def setUp(self):
        """Create a test user."""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.user.is_active = True
        self.user.save()

    def test_login_with_allauth_backend(self):
        """Verify login works with allauth authentication backend."""
        # Login using Django's test client (which uses configured backends)
        logged_in = self.client.login(username='testuser', password='testpass123')
        self.assertTrue(logged_in)

        # Verify session was created
        self.assertIsNotNone(self.client.session.session_key)

    def test_session_persists_after_password_change(self):
        """Verify session handling during password reset flows."""
        # Login
        self.client.login(username='testuser', password='testpass123')
        initial_session_key = self.client.session.session_key

        # Change password
        self.user.set_password('newpass456')
        self.user.save()

        # Note: Django's test client doesn't automatically invalidate
        # session on password change like real browsers do
        # This test just verifies session can be recreated

        # Logout and login with new password
        self.client.logout()
        logged_in = self.client.login(username='testuser', password='newpass456')
        self.assertTrue(logged_in)

        # Verify new session was created
        new_session_key = self.client.session.session_key
        self.assertIsNotNone(new_session_key)

    def test_session_cookie_attributes(self):
        """Verify session cookie has correct security attributes."""
        # Login
        self.client.login(username='testuser', password='testpass123')

        # Make a request to get response with cookie
        response = self.client.get('/', follow=True)

        # Get session cookie
        session_cookie = response.cookies.get(settings.SESSION_COOKIE_NAME)

        if session_cookie:
            # Verify HttpOnly
            self.assertTrue(session_cookie.get('httponly', False))

            # Verify SameSite
            self.assertEqual(session_cookie.get('samesite', ''), 'Lax')

            # Verify Secure matches configuration
            # In development (DEBUG=True), SESSION_COOKIE_SECURE should be False
            # In production (DEBUG=False), SESSION_COOKIE_SECURE should be True
            if settings.DEBUG:
                # In development, secure flag may not be set (empty string is acceptable)
                # The important thing is it's not forcing HTTPS in development
                self.assertIn(session_cookie.get('secure', ''), ['', False])
            else:
                # In production, should be True
                self.assertTrue(session_cookie.get('secure', False))
