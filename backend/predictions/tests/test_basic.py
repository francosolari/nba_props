"""
Basic tests to verify Django test setup is working.
"""
from django.test import TestCase
from django.contrib.auth.models import User


class BasicTestCase(TestCase):
    """Basic tests to verify test configuration."""

    def test_django_setup(self):
        """Test that Django is properly configured."""
        self.assertTrue(True)

    def test_user_creation(self):
        """Test that we can create a user."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))

    def test_database_connection(self):
        """Test that database connection is working."""
        user_count = User.objects.count()
        self.assertGreaterEqual(user_count, 0)
