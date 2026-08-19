"""Shared pytest fixtures for predictions test suite."""
import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def fast_password_hashers(settings):
    """Use lightweight password hashing during tests to speed up user creation."""
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    settings.AUTH_PASSWORD_VALIDATORS = []


@pytest.fixture(autouse=True)
def clear_django_cache():
    """
    Reset the process-wide cache between tests.

    Several endpoints (leaderboard, IST leaderboard, homepage) now cache
    their computed data briefly by season slug. Some fixtures reuse fixed
    slugs (e.g. 'test-1') across tests, and unlike the test database that
    cache isn't rolled back per test, so without this a cached response from
    one test could leak into another that reuses the same slug.
    """
    cache.clear()
    yield
    cache.clear()
