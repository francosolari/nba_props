"""Shared pytest fixtures for predictions test suite."""
import pytest


@pytest.fixture(autouse=True)
def fast_password_hashers(settings):
    """Use lightweight password hashing during tests to speed up user creation."""
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    settings.AUTH_PASSWORD_VALIDATORS = []
