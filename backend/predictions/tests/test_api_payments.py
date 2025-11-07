"""
Comprehensive test suite for payment-related API endpoints (v2).

Targets: nba_predictions-38 - "API Testing: Payment endpoints (Stripe integration)"
Scope:
- Checkout session creation with Stripe mocking
- Payment verification and status checks
- Webhook handling (checkout completed, expired, payment intent events)
- Entry fee validation and edge cases
- Authentication and authorization
- Error handling and resilience

The goal is to provide ~20 high-quality tests covering the complete payment flow
from checkout creation to webhook processing, ensuring production-ready reliability.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock
import json

import pytest
from django.test import Client
from django.utils import timezone

try:
    from stripe import StripeError
except ImportError:
    # Mock StripeError if stripe is not installed
    class StripeError(Exception):
        pass

from predictions.models import Payment, PaymentStatus, UserStats
from predictions.tests.factories import (
    UserFactory,
    SeasonFactory,
    PaymentFactory,
    SucceededPaymentFactory,
)


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def api_client():
    """Django test client fixture."""
    return Client()


@pytest.fixture
def authenticated_client(api_client):
    """Client with authenticated user."""
    user = UserFactory()
    api_client.force_login(user)
    return api_client, user


@pytest.fixture
def mock_stripe_session():
    """Mock Stripe checkout session response."""
    return {
        'session_id': 'cs_test_123456',
        'checkout_url': 'https://checkout.stripe.com/c/pay/cs_test_123456',
        'expires_at': int((datetime.now() + timedelta(hours=1)).timestamp()),
        'status': 'open',
    }


@pytest.fixture
def mock_stripe_session_retrieved():
    """Mock retrieved Stripe session with payment completed."""
    return {
        'session_id': 'cs_test_123456',
        'payment_intent': 'pi_test_789',
        'payment_status': 'paid',
        'status': 'complete',
        'customer_email': 'test@example.com',
        'amount_total': 25.00,
        'currency': 'usd',
        'metadata': {},
        'created': int(datetime.now().timestamp()),
        'expires_at': int((datetime.now() + timedelta(hours=1)).timestamp()),
    }


# ============================================================================
# Create Checkout Session Tests
# ============================================================================

class TestCreateCheckoutSession:
    """Tests for POST /api/v2/payments/create-checkout-session."""

    @patch('predictions.api.v2.endpoints.payments.create_checkout_session')
    def test_create_checkout_session_success(self, mock_create, authenticated_client, mock_stripe_session):
        """Test successful checkout session creation."""
        api_client, user = authenticated_client
        season = SeasonFactory(slug='24-25')
        mock_create.return_value = mock_stripe_session

        response = api_client.post(
            '/api/v2/payments/create-checkout-session',
            data=json.dumps({'season_slug': '24-25'}),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.json()
        assert data['session_id'] == 'cs_test_123456'
        assert 'checkout_url' in data
        assert data['expires_at'] == mock_stripe_session['expires_at']

        # Verify Payment record was created
        payment = Payment.objects.get(checkout_session_id='cs_test_123456')
        assert payment.user == user
        assert payment.season == season
        assert payment.payment_status == PaymentStatus.PENDING

    def test_create_checkout_session_unauthenticated(self, api_client):
        """Test checkout creation fails without authentication."""
        response = api_client.post(
            '/api/v2/payments/create-checkout-session',
            data=json.dumps({'season_slug': '24-25'}),
            content_type='application/json'
        )

        assert response.status_code == 401
        assert 'Authentication required' in response.json()['detail']

    @patch('predictions.api.v2.endpoints.payments.create_checkout_session')
    def test_create_checkout_session_already_paid(self, mock_create, authenticated_client):
        """Test checkout creation fails if user already paid."""
        api_client, user = authenticated_client
        season = SeasonFactory(slug='24-25')

        # Create existing successful payment
        SucceededPaymentFactory(user=user, season=season)

        response = api_client.post(
            '/api/v2/payments/create-checkout-session',
            data=json.dumps({'season_slug': '24-25'}),
            content_type='application/json'
        )

        assert response.status_code == 400
        assert 'already paid' in response.json()['detail'].lower()

    def test_create_checkout_session_invalid_season(self, authenticated_client):
        """Test checkout creation with non-existent season."""
        api_client, user = authenticated_client

        response = api_client.post(
            '/api/v2/payments/create-checkout-session',
            data=json.dumps({'season_slug': 'invalid-season'}),
            content_type='application/json'
        )

        assert response.status_code == 404

    @patch('predictions.api.v2.endpoints.payments.create_checkout_session')
    def test_create_checkout_session_with_current_slug(self, mock_create, authenticated_client, mock_stripe_session):
        """Test checkout creation using 'current' season slug."""
        api_client, user = authenticated_client
        season = SeasonFactory(slug='24-25')
        mock_create.return_value = mock_stripe_session

        response = api_client.post(
            '/api/v2/payments/create-checkout-session',
            data=json.dumps({'season_slug': 'current'}),
            content_type='application/json'
        )

        assert response.status_code == 200
        payment = Payment.objects.get(checkout_session_id='cs_test_123456')
        assert payment.season == season

    @patch('predictions.api.v2.endpoints.payments.create_checkout_session')
    def test_create_checkout_session_stripe_error(self, mock_create, authenticated_client):
        """Test checkout creation handles Stripe errors gracefully."""
        api_client, user = authenticated_client
        SeasonFactory(slug='24-25')
        mock_create.side_effect = StripeError("Stripe API error")

        response = api_client.post(
            '/api/v2/payments/create-checkout-session',
            data=json.dumps({'season_slug': '24-25'}),
            content_type='application/json'
        )

        assert response.status_code == 500
        assert 'Failed to create checkout session' in response.json()['detail']

    @patch('predictions.api.v2.endpoints.payments.create_checkout_session')
    def test_create_checkout_session_stores_correct_amount(self, mock_create, authenticated_client, mock_stripe_session):
        """Test checkout session stores correct entry fee amount."""
        api_client, user = authenticated_client
        SeasonFactory(slug='24-25')
        mock_create.return_value = mock_stripe_session

        response = api_client.post(
            '/api/v2/payments/create-checkout-session',
            data=json.dumps({'season_slug': '24-25'}),
            content_type='application/json'
        )

        assert response.status_code == 200
        payment = Payment.objects.get(checkout_session_id='cs_test_123456')
        assert payment.amount == Decimal('25.00')  # Default entry fee
        assert payment.currency == 'usd'


# ============================================================================
# Verify Payment Status Tests
# ============================================================================

class TestVerifyPaymentStatus:
    """Tests for GET /api/v2/payments/verify-payment/{season_slug}."""

    @patch('predictions.api.v2.endpoints.payments.retrieve_checkout_session')
    def test_verify_payment_success(self, mock_retrieve, authenticated_client, mock_stripe_session_retrieved):
        """Test successful payment verification."""
        api_client, user = authenticated_client
        season = SeasonFactory(slug='24-25')
        payment = PaymentFactory(
            user=user,
            season=season,
            checkout_session_id='cs_test_123456',
            payment_status=PaymentStatus.PENDING
        )
        mock_retrieve.return_value = mock_stripe_session_retrieved

        response = api_client.get(
            f'/api/v2/payments/verify-payment/24-25?session_id=cs_test_123456'
        )

        assert response.status_code == 200
        data = response.json()
        assert data['is_paid'] is True
        assert data['payment_status'] == PaymentStatus.SUCCEEDED

        # Verify payment was marked as succeeded
        payment.refresh_from_db()
        assert payment.payment_status == PaymentStatus.SUCCEEDED
        assert payment.payment_intent_id == 'pi_test_789'
        assert payment.paid_at is not None

    def test_verify_payment_unauthenticated(self, api_client):
        """Test verification fails without authentication."""
        response = api_client.get(
            '/api/v2/payments/verify-payment/24-25?session_id=cs_test_123'
        )

        assert response.status_code == 401

    @patch('predictions.api.v2.endpoints.payments.retrieve_checkout_session')
    def test_verify_payment_not_found(self, mock_retrieve, authenticated_client):
        """Test verification with non-existent payment record."""
        api_client, user = authenticated_client
        SeasonFactory(slug='24-25')

        response = api_client.get(
            '/api/v2/payments/verify-payment/24-25?session_id=cs_nonexistent'
        )

        assert response.status_code == 404
        assert 'Payment record not found' in response.json()['detail']

    @patch('predictions.api.v2.endpoints.payments.retrieve_checkout_session')
    def test_verify_payment_expired_session(self, mock_retrieve, authenticated_client):
        """Test verification marks expired sessions correctly."""
        api_client, user = authenticated_client
        season = SeasonFactory(slug='24-25')
        payment = PaymentFactory(
            user=user,
            season=season,
            checkout_session_id='cs_test_expired',
            payment_status=PaymentStatus.PENDING
        )

        mock_retrieve.return_value = {
            'session_id': 'cs_test_expired',
            'status': 'expired',
            'payment_status': 'unpaid',
        }

        response = api_client.get(
            f'/api/v2/payments/verify-payment/24-25?session_id=cs_test_expired'
        )

        assert response.status_code == 200
        payment.refresh_from_db()
        assert payment.payment_status == PaymentStatus.EXPIRED

    @patch('predictions.api.v2.endpoints.payments.retrieve_checkout_session')
    def test_verify_payment_updates_user_stats(self, mock_retrieve, authenticated_client, mock_stripe_session_retrieved):
        """Test verification updates UserStats when payment succeeds."""
        api_client, user = authenticated_client
        season = SeasonFactory(slug='24-25')
        payment = PaymentFactory(
            user=user,
            season=season,
            checkout_session_id='cs_test_123456',
            payment_status=PaymentStatus.PENDING
        )
        mock_retrieve.return_value = mock_stripe_session_retrieved

        response = api_client.get(
            f'/api/v2/payments/verify-payment/24-25?session_id=cs_test_123456'
        )

        assert response.status_code == 200

        # Verify UserStats was updated
        user_stats = UserStats.objects.get(user=user, season=season)
        assert user_stats.entry_fee_paid is True
        assert user_stats.entry_fee_paid_at is not None


# ============================================================================
# Get Payment Status Tests
# ============================================================================

class TestGetPaymentStatus:
    """Tests for GET /api/v2/payments/payment-status/{season_slug}."""

    def test_get_payment_status_with_successful_payment(self, authenticated_client):
        """Test getting status of successful payment."""
        api_client, user = authenticated_client
        season = SeasonFactory(slug='24-25')
        payment = SucceededPaymentFactory(user=user, season=season, amount=Decimal('25.00'))

        response = api_client.get('/api/v2/payments/payment-status/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['is_paid'] is True
        assert data['payment_status'] == PaymentStatus.SUCCEEDED
        assert data['amount'] == '25.00'

    def test_get_payment_status_no_payment(self, authenticated_client):
        """Test getting status when no payment exists."""
        api_client, user = authenticated_client
        SeasonFactory(slug='24-25')

        response = api_client.get('/api/v2/payments/payment-status/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['is_paid'] is False
        assert data['payment_status'] == 'none'
        assert data['amount'] is None

    def test_get_payment_status_pending_payment(self, authenticated_client):
        """Test getting status of pending payment."""
        api_client, user = authenticated_client
        season = SeasonFactory(slug='24-25')
        payment = PaymentFactory(user=user, season=season, payment_status=PaymentStatus.PENDING)

        response = api_client.get('/api/v2/payments/payment-status/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['is_paid'] is False
        assert data['payment_status'] == PaymentStatus.PENDING


# ============================================================================
# Submission Status with Payment Tests
# ============================================================================

class TestSubmissionStatusWithPayment:
    """Tests for GET /api/v2/payments/submission-status/{season_slug}."""

    def test_submission_status_paid_and_open(self, authenticated_client):
        """Test submission status when paid and window is open."""
        api_client, user = authenticated_client
        season = SeasonFactory(
            slug='24-25',
            submission_start_date=timezone.now().date() - timedelta(days=5),
            submission_end_date=timezone.now().date() + timedelta(days=5)
        )
        SucceededPaymentFactory(user=user, season=season)

        response = api_client.get('/api/v2/payments/submission-status/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['submission_valid'] is True
        assert data['is_submission_open'] is True
        assert data['payment_required'] is True

    def test_submission_status_unpaid(self, authenticated_client):
        """Test submission status when not paid."""
        api_client, user = authenticated_client
        season = SeasonFactory(
            slug='24-25',
            submission_start_date=timezone.now().date() - timedelta(days=5),
            submission_end_date=timezone.now().date() + timedelta(days=5)
        )

        response = api_client.get('/api/v2/payments/submission-status/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['submission_valid'] is False
        assert data['is_submission_open'] is True

    def test_submission_status_paid_but_closed(self, authenticated_client):
        """Test submission status when paid but submission window closed."""
        api_client, user = authenticated_client
        season = SeasonFactory(
            slug='24-25',
            submission_start_date=timezone.now().date() - timedelta(days=10),
            submission_end_date=timezone.now().date() - timedelta(days=1)
        )
        SucceededPaymentFactory(user=user, season=season)

        response = api_client.get('/api/v2/payments/submission-status/24-25')

        assert response.status_code == 200
        data = response.json()
        assert data['submission_valid'] is False
        assert data['is_submission_open'] is False


# ============================================================================
# Webhook Handler Tests
# ============================================================================

class TestStripeWebhook:
    """Tests for POST /stripe/webhook/."""

    @patch('predictions.views.stripe_webhook.verify_webhook_signature')
    def test_webhook_checkout_session_completed(self, mock_verify, api_client):
        """Test webhook handling for checkout.session.completed event."""
        season = SeasonFactory(slug='24-25')
        user = UserFactory()
        payment = PaymentFactory(
            user=user,
            season=season,
            checkout_session_id='cs_test_webhook',
            payment_status=PaymentStatus.PENDING
        )

        webhook_event = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_test_webhook',
                    'payment_intent': 'pi_webhook_123',
                    'payment_status': 'paid',
                }
            }
        }
        mock_verify.return_value = webhook_event

        response = api_client.post(
            '/stripe/webhook/',
            data=json.dumps(webhook_event),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )

        assert response.status_code == 200
        payment.refresh_from_db()
        assert payment.payment_status == PaymentStatus.SUCCEEDED
        assert payment.payment_intent_id == 'pi_webhook_123'

    @patch('predictions.views.stripe_webhook.verify_webhook_signature')
    def test_webhook_checkout_session_expired(self, mock_verify, api_client):
        """Test webhook handling for checkout.session.expired event."""
        user = UserFactory()
        season = SeasonFactory(slug='24-25')
        payment = PaymentFactory(
            user=user,
            season=season,
            checkout_session_id='cs_test_expired',
            payment_status=PaymentStatus.PENDING
        )

        webhook_event = {
            'type': 'checkout.session.expired',
            'data': {
                'object': {
                    'id': 'cs_test_expired',
                }
            }
        }
        mock_verify.return_value = webhook_event

        response = api_client.post(
            '/stripe/webhook/',
            data=json.dumps(webhook_event),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )

        assert response.status_code == 200
        payment.refresh_from_db()
        assert payment.payment_status == PaymentStatus.EXPIRED

    def test_webhook_missing_signature(self, api_client):
        """Test webhook rejects requests without Stripe signature."""
        response = api_client.post(
            '/stripe/webhook/',
            data=json.dumps({'type': 'test'}),
            content_type='application/json'
        )

        assert response.status_code == 400
        assert b'Missing signature' in response.content

    @patch('predictions.views.stripe_webhook.verify_webhook_signature')
    def test_webhook_invalid_signature(self, mock_verify, api_client):
        """Test webhook rejects invalid signatures."""
        mock_verify.side_effect = ValueError("Invalid signature")

        response = api_client.post(
            '/stripe/webhook/',
            data=json.dumps({'type': 'test'}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid_signature'
        )

        assert response.status_code == 400


# ============================================================================
# Entry Fee Validation Tests
# ============================================================================

class TestEntryFeeValidation:
    """Tests for entry fee amount validation and handling."""

    @patch('predictions.api.v2.endpoints.payments.create_checkout_session')
    @patch('predictions.api.v2.endpoints.payments.get_entry_fee_amount')
    def test_entry_fee_uses_configured_amount(self, mock_get_fee, mock_create, authenticated_client, mock_stripe_session):
        """Test checkout uses configured entry fee amount."""
        api_client, user = authenticated_client
        SeasonFactory(slug='24-25')
        mock_get_fee.return_value = Decimal('30.00')
        mock_create.return_value = mock_stripe_session

        response = api_client.post(
            '/api/v2/payments/create-checkout-session',
            data=json.dumps({'season_slug': '24-25'}),
            content_type='application/json'
        )

        assert response.status_code == 200
        payment = Payment.objects.get(checkout_session_id='cs_test_123456')
        assert payment.amount == Decimal('30.00')
