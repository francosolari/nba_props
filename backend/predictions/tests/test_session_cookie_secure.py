"""
Tests for the SESSION_COOKIE_SECURE override.

Secure session cookies are the production default and must stay that way.
The override exists only so a blue/green idle container -- which is reached
directly over plain HTTP at http://<ip>:8000|8002, bypassing nginx's TLS
termination -- can be smoke-tested, since a browser discards a Secure cookie
on an http:// origin and login then silently fails to persist.

These boot a throwaway process against the real settings module, the same
way a Gunicorn worker does, because the test suite overrides settings and so
can't show what dev/production would actually resolve to.
"""
import json
import os
import subprocess
import sys

import pytest

pytestmark = pytest.mark.django_db


def _resolved_settings(is_development, session_cookie_secure=None):
    """Boot real settings under the given env and report what resolves."""
    code = (
        "import django, json, os\n"
        "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')\n"
        "os.environ.setdefault('SECRET_KEY', 'test')\n"
        "django.setup()\n"
        "from django.conf import settings\n"
        "print(json.dumps({'SESSION_COOKIE_SECURE': settings.SESSION_COOKIE_SECURE,\n"
        "                  'IS_DEVELOPMENT': settings.IS_DEVELOPMENT}))\n"
    )

    env = dict(os.environ)
    env['DJANGO_DEVELOPMENT'] = str(is_development)
    # Inherited values would mask what this case is meant to exercise.
    env.pop('SESSION_COOKIE_SECURE', None)
    if session_cookie_secure is not None:
        env['SESSION_COOKIE_SECURE'] = session_cookie_secure

    backend_dir = os.path.join(os.path.dirname(__file__), '..', '..')
    result = subprocess.run(
        [sys.executable, '-c', code],
        cwd=backend_dir, env=env, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


class TestSessionCookieSecureDefaults:
    """The default must not change: secure in production, relaxed in dev."""

    def test_production_defaults_to_secure(self):
        resolved = _resolved_settings(is_development=False)
        assert resolved['IS_DEVELOPMENT'] is False
        assert resolved['SESSION_COOKIE_SECURE'] is True

    def test_development_defaults_to_not_secure(self):
        resolved = _resolved_settings(is_development=True)
        assert resolved['IS_DEVELOPMENT'] is True
        assert resolved['SESSION_COOKIE_SECURE'] is False


class TestSessionCookieSecureOverride:
    def test_production_can_opt_out_for_idle_container_testing(self):
        resolved = _resolved_settings(is_development=False, session_cookie_secure='False')
        assert resolved['SESSION_COOKIE_SECURE'] is False

    def test_development_can_opt_in(self):
        resolved = _resolved_settings(is_development=True, session_cookie_secure='True')
        assert resolved['SESSION_COOKIE_SECURE'] is True

    @pytest.mark.parametrize('value', ['false', 'FALSE', 'False'])
    def test_opt_out_is_case_insensitive(self, value):
        resolved = _resolved_settings(is_development=False, session_cookie_secure=value)
        assert resolved['SESSION_COOKIE_SECURE'] is False

    @pytest.mark.parametrize('value', ['0', 'no', 'off', '', 'yes', 'garbage'])
    def test_production_stays_secure_for_anything_but_an_explicit_true(self, value):
        """
        Opting out requires exactly "false"-ish parsing of a truthy flag: the
        setting is `== 'true'`, so any unrecognised value lands on False.
        This pins that down so the parsing is a deliberate choice rather than
        an accident -- the dangerous direction would be an unrecognised value
        silently turning security ON in dev or OFF in prod unnoticed.
        """
        resolved = _resolved_settings(is_development=False, session_cookie_secure=value)
        # Anything that isn't "true" disables the flag, including typos.
        assert resolved['SESSION_COOKIE_SECURE'] is False
