# File: backend/predictions/api/v2/endpoints/payments.py
"""
Payment endpoints for Stripe integration.
Handles checkout session creation, payment verification, and status checks.
"""

from ninja import Router
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from datetime import datetime
import logging

from predictions.models import Season, Payment, PaymentStatus, UserStats
from predictions.api.v2.schemas import (
    CreateCheckoutSessionSchema,
    CheckoutSessionResponseSchema,
    PaymentStatusSchema,
    SubmissionStatusWithPaymentSchema,
)
from predictions.utils.stripe_service import (
    create_checkout_session,
    retrieve_checkout_session,
)
from predictions.utils.payments import get_entry_fee_amount

logger = logging.getLogger(__name__)


router = Router(tags=["Payments"])


def _resolve_season(season_slug: str) -> Season:
    """Resolve a season slug, supporting the 'current' shortcut."""
    if season_slug == "current":
        season = Season.objects.order_by('-start_date').first()
        if not season:
            raise HttpError(404, "Latest season not found")
        return season
    return get_object_or_404(Season, slug=season_slug)


def _build_success_url(request, session_id: str, season_slug: str) -> str:
    """Build the success URL for Stripe redirect after successful payment."""
    protocol = 'https' if request.is_secure() else 'http'
    host = request.get_host()
    # Redirect to submit page with session_id for verification
    return f"{protocol}://{host}/submit/{season_slug}/?session_id={session_id}&payment=success"


def _build_cancel_url(request, season_slug: str) -> str:
    """Build the cancel URL for Stripe redirect when user cancels."""
    protocol = 'https' if request.is_secure() else 'http'
    host = request.get_host()
    return f"{protocol}://{host}/submit/{season_slug}/?payment=canceled"


@router.post(
    "/create-checkout-session",
    response=CheckoutSessionResponseSchema,
    summary="Create Stripe checkout session",
    description="Create a new Stripe checkout session for entry fee payment"
)
def create_payment_checkout_session(request, payload: CreateCheckoutSessionSchema):
    """
    Create a Stripe checkout session for the authenticated user to pay the entry fee.

    Flow:
    1. Validate user is authenticated
    2. Check if user already has a successful payment
    3. Create Stripe checkout session
    4. Store Payment record in database
    5. Return checkout URL for redirect
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    season = _resolve_season(payload.season_slug)

    # Check if user already has a successful payment
    existing_payment = Payment.objects.filter(
        user=request.user,
        season=season,
        payment_status=PaymentStatus.SUCCEEDED
    ).first()

    if existing_payment:
        raise HttpError(400, "Entry fee already paid for this season")

    # Get entry fee amount
    amount = get_entry_fee_amount()

    try:
        # Create Stripe checkout session
        checkout_data = create_checkout_session(
            user=request.user,
            season=season,
            amount=amount,
            success_url=_build_success_url(request, "{CHECKOUT_SESSION_ID}", season.slug),
            cancel_url=_build_cancel_url(request, season.slug),
            metadata={
                'user_id': str(request.user.id),
                'season_slug': season.slug,
            }
        )

        # Replace placeholder with actual session ID
        success_url = _build_success_url(request, checkout_data['session_id'], season.slug)

        # Create Payment record
        # Convert Unix timestamp to datetime
        expires_at_timestamp = checkout_data.get('expires_at')
        expires_at_dt = None
        if expires_at_timestamp:
            expires_at_dt = datetime.fromtimestamp(expires_at_timestamp, tz=timezone.utc)

        payment = Payment.objects.create(
            user=request.user,
            season=season,
            checkout_session_id=checkout_data['session_id'],
            amount=amount,
            currency='usd',
            payment_status=PaymentStatus.PENDING,
            email=request.user.email,
            expires_at=expires_at_dt,
        )

        logger.info(
            f"Created checkout session {payment.checkout_session_id} for user "
            f"{request.user.username} and season {season.slug}"
        )

        return {
            'session_id': checkout_data['session_id'],
            'checkout_url': checkout_data['checkout_url'],
            'expires_at': checkout_data['expires_at'],
        }

    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HttpError(500, f"Failed to create checkout session: {str(e)}")


@router.get(
    "/verify-payment/{season_slug}",
    response=PaymentStatusSchema,
    summary="Verify payment status",
    description="Verify payment status after redirect from Stripe checkout"
)
def verify_payment_status(request, season_slug: str, session_id: str):
    """
    Verify payment status after user returns from Stripe checkout.

    This endpoint is called when the user is redirected back from Stripe
    with a session_id in the query parameters.

    Flow:
    1. Retrieve Payment record by session_id
    2. Fetch latest status from Stripe
    3. Update Payment record if needed
    4. Return payment status to frontend
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    season = _resolve_season(season_slug)

    # Find the payment record
    payment = Payment.objects.filter(
        user=request.user,
        season=season,
        checkout_session_id=session_id
    ).first()

    if not payment:
        raise HttpError(404, "Payment record not found")

    try:
        # Retrieve latest status from Stripe
        session_data = retrieve_checkout_session(session_id)

        # Update payment record if status changed
        if session_data['payment_status'] == 'paid' and not payment.is_successful:
            payment.mark_as_succeeded(
                payment_intent_id=session_data.get('payment_intent'),
                stripe_payload=session_data
            )
            logger.info(
                f"Payment {payment.id} marked as succeeded for user {request.user.username}"
            )
        elif session_data['status'] == 'expired' and payment.payment_status == PaymentStatus.PENDING:
            payment.mark_as_expired()
            logger.info(
                f"Payment {payment.id} marked as expired for user {request.user.username}"
            )

        return {
            'payment_status': payment.payment_status,
            'is_paid': payment.is_successful,
            'amount': str(payment.amount),
            'paid_at': payment.paid_at,
            'session_status': session_data.get('status'),
        }

    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HttpError(500, f"Failed to verify payment: {str(e)}")


@router.get(
    "/payment-status/{season_slug}",
    response=PaymentStatusSchema,
    summary="Get payment status",
    description="Get current payment status for authenticated user and season"
)
def get_payment_status(request, season_slug: str):
    """
    Get the current payment status for the authenticated user and season.

    Returns the latest payment record or indicates no payment exists.
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    season = _resolve_season(season_slug)

    # Get latest payment for this user and season
    payment = Payment.get_latest_for_user_season(request.user, season)

    if not payment:
        return {
            'payment_status': 'none',
            'is_paid': False,
            'amount': None,
            'paid_at': None,
            'session_status': None,
        }

    return {
        'payment_status': payment.payment_status,
        'is_paid': payment.is_successful,
        'amount': str(payment.amount),
        'paid_at': payment.paid_at,
        'session_status': None,  # Don't fetch from Stripe on every status check
    }


@router.get(
    "/submission-status/{season_slug}",
    response=SubmissionStatusWithPaymentSchema,
    summary="Get submission status with payment info",
    description="Get comprehensive submission status including payment validation"
)
def get_submission_status_with_payment(request, season_slug: str):
    """
    Get comprehensive submission status including:
    - Whether submission window is open
    - Payment status and requirement
    - Whether submission is valid (paid + within deadline)
    - When submissions become locked
    """
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    season = _resolve_season(season_slug)

    from django.utils import timezone
    from predictions.utils.deadlines import is_submission_open

    now = timezone.now()
    submission_open = is_submission_open(season)
    payment_required = True  # Always require payment for valid submissions

    # Get payment status
    payment = Payment.get_latest_for_user_season(request.user, season)
    is_paid = payment and payment.is_successful if payment else False

    payment_status_data = None
    if payment:
        payment_status_data = {
            'payment_status': payment.payment_status,
            'is_paid': is_paid,
            'amount': str(payment.amount),
            'paid_at': payment.paid_at,
            'session_status': None,
        }

    # Submission is valid if payment is successful and deadline hasn't passed
    submission_valid = is_paid and submission_open

    return {
        'season_slug': season.slug,
        'is_submission_open': submission_open,
        'submission_end_date': season.submission_end_date,
        'payment_required': payment_required,
        'payment_status': payment_status_data,
        'submission_valid': submission_valid,
        'editable_until': season.submission_end_date,
    }
