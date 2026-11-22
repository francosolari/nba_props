"""
Regression tests for two infrastructure-level performance settings that
affect every request, not just cache hits:

1. Persistent DB connections (CONN_MAX_AGE / CONN_HEALTH_CHECKS) -- without
   this, Django opens a fresh TCP + Postgres auth handshake on every single
   request, cache hit or not. This is checked by actually booting a fresh
   Python process against the real settings module (the same way a Gunicorn
   worker would), rather than against the test suite's sqlite override,
   since that's the only way to see the real DATABASES dict Django would use
   in dev/production.

2. Response compression (GZipMiddleware) -- WhiteNoise only compresses
   static files; without gzip on the middleware chain, JSON payloads like
   the leaderboard response go over the wire uncompressed.
"""
import json
import os
import subprocess
import sys

import pytest
from django.test import Client

from predictions.tests.factories import (
    CurrentSeasonFactory,
    UserFactory,
    AnswerFactory,
    PropQuestionFactory,
)

pytestmark = pytest.mark.django_db


def _settings_conn_config(is_development: bool) -> dict:
    """Boot a throwaway process against the real settings module (as a
    Gunicorn worker would) and report what DATABASES['default'] resolves to.
    """
    code = (
        "import django, json, os\n"
        "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')\n"
        "os.environ['DJANGO_DEVELOPMENT'] = {development!r}\n"
        "os.environ.setdefault('SECRET_KEY', 'test')\n"
        "django.setup()\n"
        "from django.conf import settings\n"
        "db = settings.DATABASES['default']\n"
        "print(json.dumps({{'CONN_MAX_AGE': db.get('CONN_MAX_AGE'), "
        "'CONN_HEALTH_CHECKS': db.get('CONN_HEALTH_CHECKS')}}))\n"
    ).format(development=str(is_development))

    backend_dir = os.path.join(os.path.dirname(__file__), '..', '..')
    result = subprocess.run(
        [sys.executable, '-c', code],
        cwd=backend_dir,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


class TestPersistentDatabaseConnections:
    def test_development_settings_reuse_connections(self):
        config = _settings_conn_config(is_development=True)
        assert config['CONN_MAX_AGE'] and config['CONN_MAX_AGE'] > 0
        assert config['CONN_HEALTH_CHECKS'] is True

    def test_production_settings_reuse_connections(self):
        config = _settings_conn_config(is_development=False)
        assert config['CONN_MAX_AGE'] and config['CONN_MAX_AGE'] > 0
        assert config['CONN_HEALTH_CHECKS'] is True


class TestResponseCompression:
    def test_large_json_response_is_gzip_compressed(self):
        """The leaderboard payload is exactly the kind of response this is
        meant to shrink: JSON, often well above the ~200 byte gzip floor."""
        season = CurrentSeasonFactory()
        for i in range(15):
            user = UserFactory()
            question = PropQuestionFactory(
                season=season, outcome_type='yes_no', point_value=3,
                correct_answer='Yes', text=f'Prop {i}',
            )
            AnswerFactory(user=user, question=question, answer='Yes', points_earned=3, is_correct=True)

        client = Client(HTTP_ACCEPT_ENCODING='gzip, deflate')
        response = client.get(f'/api/v2/leaderboards/{season.slug}')

        assert response.status_code == 200
        assert response.get('Content-Encoding') == 'gzip'

    def test_client_without_gzip_support_gets_uncompressed_response(self):
        """Sanity check: compression is negotiated, not forced on everyone."""
        season = CurrentSeasonFactory()
        client = Client(HTTP_ACCEPT_ENCODING='identity')
        response = client.get(f'/api/v2/leaderboards/{season.slug}')

        assert response.status_code == 200
        assert response.get('Content-Encoding') != 'gzip'


def _gzip_middleware_present(gzip_responses=None):
    """Report whether GZipMiddleware is on the chain a fresh worker builds."""
    code = (
        "import django, json, os\n"
        "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')\n"
        "os.environ.setdefault('SECRET_KEY', 'test')\n"
        "django.setup()\n"
        "from django.conf import settings\n"
        "gz = 'django.middleware.gzip.GZipMiddleware'\n"
        "print(json.dumps({'present': gz in settings.MIDDLEWARE,\n"
        "                  'index': settings.MIDDLEWARE.index(gz) if gz in settings.MIDDLEWARE else None,\n"
        "                  'chain': list(settings.MIDDLEWARE)}))\n"
    )

    env = dict(os.environ)
    env.pop('GZIP_RESPONSES', None)
    if gzip_responses is not None:
        env['GZIP_RESPONSES'] = gzip_responses

    backend_dir = os.path.join(os.path.dirname(__file__), '..', '..')
    result = subprocess.run(
        [sys.executable, '-c', code],
        cwd=backend_dir, env=env, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


class TestGzipToggle:
    """
    Compression must stay on unless explicitly switched off -- the toggle is a
    diagnostic escape hatch, not a new default. Disabling it should also leave
    the rest of the middleware chain untouched, since ordering matters for
    sessions and CSRF.
    """

    def test_enabled_by_default(self):
        resolved = _gzip_middleware_present()
        assert resolved['present'] is True

    def test_sits_directly_after_whitenoise(self):
        """WhiteNoise serves static files pre-compressed and short-circuits
        them, so gzip belongs just below it: high enough to see every response
        body, low enough not to recompress what WhiteNoise already handled."""
        resolved = _gzip_middleware_present()
        chain = resolved['chain']
        assert chain[resolved['index'] - 1] == 'whitenoise.middleware.WhiteNoiseMiddleware'

    def test_can_be_switched_off_for_diagnosis(self):
        resolved = _gzip_middleware_present(gzip_responses='False')
        assert resolved['present'] is False

    def test_switching_off_leaves_the_rest_of_the_chain_intact(self):
        on = _gzip_middleware_present()
        off = _gzip_middleware_present(gzip_responses='False')
        expected = [m for m in on['chain'] if m != 'django.middleware.gzip.GZipMiddleware']
        assert off['chain'] == expected

    @pytest.mark.parametrize('value', ['0', 'no', 'off', 'FALSE'])
    def test_recognised_false_values_switch_it_off(self, value):
        assert _gzip_middleware_present(gzip_responses=value)['present'] is False

    @pytest.mark.parametrize('value', ['', 'garbage', 'flase'])
    def test_stays_enabled_for_an_unrecognised_value(self, value):
        """A typo must not silently cost the compression win."""
        assert _gzip_middleware_present(gzip_responses=value)['present'] is True
