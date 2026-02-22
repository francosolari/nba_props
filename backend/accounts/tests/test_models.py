"""
Unit tests for accounts app models.

Tests cover:
- UserProfile model creation, fields, properties, and cascade behavior
- UserOnboarding model creation, fields, properties, methods, and Meta
- Signal handlers: create_user_onboarding (models.py), create_user_profile / save_user_profile (signals.py)
"""
import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from accounts.models import UserProfile, UserOnboarding
from predictions.tests.factories import UserFactory


User = get_user_model()


# ============================================================================
# UserProfile Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.django_db
class TestUserProfileCreation:
    """Tests for UserProfile creation and field defaults.

    Note: signals.py auto-creates a UserProfile on User creation via post_save,
    so we use the auto-created profile (user.userprofile) rather than manual creation.
    """

    def test_auto_created_profile_has_correct_defaults(self):
        """UserProfile auto-created via signal has has_paid_dues=False by default."""
        user = UserFactory()
        profile = user.userprofile

        assert profile.user == user
        assert profile.has_paid_dues is False

    def test_has_paid_dues_can_be_toggled(self):
        """has_paid_dues can be set to True and persisted."""
        user = UserFactory()
        profile = user.userprofile

        profile.has_paid_dues = True
        profile.save()
        profile.refresh_from_db()

        assert profile.has_paid_dues is True

    def test_one_to_one_enforces_uniqueness(self):
        """Creating a second UserProfile for the same user raises IntegrityError."""
        user = UserFactory()
        # Signal already created one; trying to create another should fail
        with pytest.raises(IntegrityError):
            UserProfile.objects.create(user=user)

    def test_cascade_delete_removes_profile(self):
        """Deleting the User cascades to delete the UserProfile."""
        user = UserFactory()
        user_id = user.id

        user.delete()

        assert not UserProfile.objects.filter(user_id=user_id).exists()


@pytest.mark.unit
@pytest.mark.django_db
class TestUserProfileDisplayName:
    """Tests for UserProfile.display_name property."""

    def test_with_first_and_last_name(self):
        """display_name returns 'First L.' when both names are present."""
        user = User.objects.create_user(
            username='johndoe',
            email='john@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
        )
        profile = user.userprofile

        assert profile.display_name == 'John D.'

    def test_uppercases_last_name_initial(self):
        """display_name uppercases the last name initial even if stored lowercase."""
        user = User.objects.create_user(
            username='lowerlast',
            email='lower@example.com',
            password='testpass123',
            first_name='Alice',
            last_name='van',
        )
        profile = user.userprofile

        assert profile.display_name == 'Alice V.'

    def test_single_character_last_name(self):
        """display_name handles a single-character last name correctly."""
        user = User.objects.create_user(
            username='janed',
            email='jane@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='D',
        )
        profile = user.userprofile

        assert profile.display_name == 'Jane D.'

    def test_fallback_to_username_when_both_names_missing(self):
        """display_name falls back to username when first_name and last_name are empty."""
        user = UserFactory(first_name='', last_name='')
        profile = user.userprofile

        assert profile.display_name == user.username

    def test_fallback_when_only_first_name_set(self):
        """display_name falls back to username when last_name is empty."""
        user = User.objects.create_user(
            username='bobonly',
            email='bob@example.com',
            password='testpass123',
            first_name='Bob',
            last_name='',
        )
        profile = user.userprofile

        assert profile.display_name == 'bobonly'

    def test_fallback_when_only_last_name_set(self):
        """display_name falls back to username when first_name is empty."""
        user = User.objects.create_user(
            username='smithonly',
            email='smith@example.com',
            password='testpass123',
            first_name='',
            last_name='Smith',
        )
        profile = user.userprofile

        assert profile.display_name == 'smithonly'


@pytest.mark.unit
@pytest.mark.django_db
class TestUserProfileStr:
    """Tests for UserProfile.__str__."""

    def test_str_returns_username(self):
        """String representation is the associated user's username."""
        user = UserFactory(username='testuser_str')
        profile = user.userprofile

        assert str(profile) == 'testuser_str'


# ============================================================================
# UserOnboarding Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.django_db
class TestUserOnboardingCreation:
    """Tests for UserOnboarding creation and default values."""

    def test_created_via_signal_on_user_creation(self):
        """UserOnboarding is automatically created by the post_save signal in models.py."""
        user = UserFactory()

        assert UserOnboarding.objects.filter(user=user).exists()
        onboarding = user.onboarding
        assert onboarding.user == user

    def test_default_values_on_creation(self):
        """All boolean fields default to False and timestamps are correct."""
        user = UserFactory()
        onboarding = user.onboarding

        assert onboarding.completed_welcome is False
        assert onboarding.completed_profile_setup is False
        assert onboarding.completed_tutorial is False
        assert onboarding.onboarding_complete is False
        assert onboarding.skipped is False
        assert onboarding.completed_at is None
        assert onboarding.created_at is not None

    def test_one_to_one_enforces_uniqueness(self):
        """Creating a second UserOnboarding for the same user raises IntegrityError."""
        user = UserFactory()
        # Signal already created one; trying to create another should fail
        with pytest.raises(IntegrityError):
            UserOnboarding.objects.create(user=user)

    def test_cascade_delete_removes_onboarding(self):
        """Deleting the User cascades to delete the UserOnboarding."""
        user = UserFactory()
        user_id = user.id

        user.delete()

        assert not UserOnboarding.objects.filter(user_id=user_id).exists()


@pytest.mark.unit
@pytest.mark.django_db
class TestUserOnboardingMarkComplete:
    """Tests for UserOnboarding.mark_complete method."""

    def test_mark_complete_sets_flag_and_timestamp(self):
        """mark_complete sets onboarding_complete=True and records completed_at."""
        user = UserFactory()
        onboarding = user.onboarding

        before = timezone.now()
        onboarding.mark_complete()
        after = timezone.now()

        onboarding.refresh_from_db()

        assert onboarding.onboarding_complete is True
        assert onboarding.completed_at is not None
        assert before <= onboarding.completed_at <= after

    def test_mark_complete_persists_to_database(self):
        """mark_complete calls save() so changes are persisted."""
        user = UserFactory()
        onboarding = user.onboarding
        onboarding.mark_complete()

        # Fetch a fresh instance from DB
        fresh = UserOnboarding.objects.get(user=user)
        assert fresh.onboarding_complete is True
        assert fresh.completed_at is not None

    def test_mark_complete_is_idempotent(self):
        """Calling mark_complete twice does not raise and updates completed_at."""
        user = UserFactory()
        onboarding = user.onboarding

        onboarding.mark_complete()
        first_completed_at = onboarding.completed_at

        onboarding.mark_complete()
        onboarding.refresh_from_db()

        assert onboarding.onboarding_complete is True
        # completed_at is updated on each call
        assert onboarding.completed_at >= first_completed_at


@pytest.mark.unit
@pytest.mark.django_db
class TestUserOnboardingNeedsUsername:
    """Tests for UserOnboarding.needs_username property."""

    def test_email_as_username_needs_username(self):
        """Username containing '@' (e.g., Google OAuth email) needs username."""
        user = User.objects.create_user(
            username='user@gmail.com',
            email='user@gmail.com',
            password='testpass123',
        )
        assert user.onboarding.needs_username is True

    def test_auto_generated_prefix_needs_username(self):
        """Username starting with 'user_' (auto-generated) needs username."""
        user = User.objects.create_user(
            username='user_12345',
            email='auto@example.com',
            password='testpass123',
        )
        assert user.onboarding.needs_username is True

    def test_custom_username_does_not_need_username(self):
        """A normal custom username does not trigger needs_username."""
        user = UserFactory(username='coolplayer99')
        assert user.onboarding.needs_username is False

    def test_username_with_at_sign_not_email(self):
        """Username with '@' that isn't an email still triggers needs_username."""
        user = User.objects.create_user(
            username='handle@tag',
            email='handle@example.com',
            password='testpass123',
        )
        assert user.onboarding.needs_username is True


@pytest.mark.unit
@pytest.mark.django_db
class TestUserOnboardingProgressPercentage:
    """Tests for UserOnboarding.progress_percentage property."""

    def test_zero_percent_with_no_steps_completed(self):
        """Progress is 0% when no onboarding steps are completed."""
        user = UserFactory()
        assert user.onboarding.progress_percentage == 0

    def test_thirty_three_percent_with_one_step(self):
        """Progress is 33% when 1 of 3 steps is completed."""
        user = UserFactory()
        onboarding = user.onboarding
        onboarding.completed_welcome = True
        onboarding.save()

        assert onboarding.progress_percentage == 33

    def test_sixty_six_percent_with_two_steps(self):
        """Progress is 66% when 2 of 3 steps are completed."""
        user = UserFactory()
        onboarding = user.onboarding
        onboarding.completed_welcome = True
        onboarding.completed_profile_setup = True
        onboarding.save()

        assert onboarding.progress_percentage == 66

    def test_hundred_percent_with_all_steps(self):
        """Progress is 100% when all 3 steps are completed."""
        user = UserFactory()
        onboarding = user.onboarding
        onboarding.completed_welcome = True
        onboarding.completed_profile_setup = True
        onboarding.completed_tutorial = True
        onboarding.save()

        assert onboarding.progress_percentage == 100

    def test_returns_integer(self):
        """progress_percentage returns an int, not a float."""
        user = UserFactory()
        assert isinstance(user.onboarding.progress_percentage, int)


@pytest.mark.unit
@pytest.mark.django_db
class TestUserOnboardingSkipped:
    """Tests for the skipped flag."""

    def test_skipped_defaults_to_false(self):
        """skipped is False by default."""
        user = UserFactory()
        assert user.onboarding.skipped is False

    def test_skipped_can_be_set_and_persisted(self):
        """skipped can be set to True and survives a refresh_from_db."""
        user = UserFactory()
        onboarding = user.onboarding

        onboarding.skipped = True
        onboarding.save()
        onboarding.refresh_from_db()

        assert onboarding.skipped is True


@pytest.mark.unit
@pytest.mark.django_db
class TestUserOnboardingStr:
    """Tests for UserOnboarding.__str__."""

    def test_str_with_zero_progress(self):
        """String representation includes username and 0% progress."""
        user = UserFactory(username='newuser')
        assert str(user.onboarding) == 'Onboarding for newuser (0% complete)'

    def test_str_with_partial_progress(self):
        """String representation reflects partial progress."""
        user = UserFactory(username='partialuser')
        onboarding = user.onboarding
        onboarding.completed_welcome = True
        onboarding.save()

        assert str(onboarding) == 'Onboarding for partialuser (33% complete)'

    def test_str_with_full_progress(self):
        """String representation reflects 100% progress."""
        user = UserFactory(username='doneuser')
        onboarding = user.onboarding
        onboarding.completed_welcome = True
        onboarding.completed_profile_setup = True
        onboarding.completed_tutorial = True
        onboarding.save()

        assert str(onboarding) == 'Onboarding for doneuser (100% complete)'


@pytest.mark.unit
class TestUserOnboardingMeta:
    """Tests for UserOnboarding Meta options (no DB needed)."""

    def test_verbose_name(self):
        """verbose_name is 'User Onboarding'."""
        assert UserOnboarding._meta.verbose_name == 'User Onboarding'

    def test_verbose_name_plural(self):
        """verbose_name_plural is 'User Onboardings'."""
        assert UserOnboarding._meta.verbose_name_plural == 'User Onboardings'


# ============================================================================
# Signal Integration Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.django_db
class TestSignalIntegration:
    """Tests for signal handlers that create related models on user creation."""

    def test_onboarding_signal_fires_on_user_creation(self):
        """create_user_onboarding signal creates UserOnboarding for new users."""
        user = UserFactory()

        assert UserOnboarding.objects.filter(user=user).count() == 1
        assert user.onboarding.user == user

    def test_onboarding_signal_does_not_fire_on_user_update(self):
        """Updating an existing user does not create a duplicate UserOnboarding."""
        user = UserFactory()
        initial_count = UserOnboarding.objects.filter(user=user).count()

        user.email = 'updated@example.com'
        user.save()

        assert UserOnboarding.objects.filter(user=user).count() == initial_count

    def test_onboarding_signal_uses_get_or_create_for_safety(self):
        """Manually re-triggering the signal does not create duplicates (get_or_create)."""
        user = UserFactory()

        # Simulate the signal being called again with created=True
        from accounts.models import create_user_onboarding
        create_user_onboarding(User, user, created=True)

        assert UserOnboarding.objects.filter(user=user).count() == 1

    def test_profile_signal_creates_profile_on_user_creation(self):
        """
        Verify the signals.py create_user_profile signal auto-creates a UserProfile
        when a new User is created.
        """
        user = User.objects.create_user(
            username='signal_profile_user',
            email='signal@example.com',
            password='testpass123',
        )

        assert UserProfile.objects.filter(user=user).exists()
        profile = UserProfile.objects.get(user=user)
        assert profile.has_paid_dues is False

    def test_save_user_profile_signal_persists_on_user_save(self):
        """
        Verify the signals.py save_user_profile signal calls profile.save()
        when the User is saved, keeping the profile in sync.
        """
        user = User.objects.create_user(
            username='save_signal_user',
            email='savesignal@example.com',
            password='testpass123',
        )
        profile = user.userprofile
        profile.has_paid_dues = True
        profile.save()

        # Saving user should not error (save_user_profile calls instance.userprofile.save())
        user.first_name = 'Updated'
        user.save()

        profile.refresh_from_db()
        assert profile.has_paid_dues is True
