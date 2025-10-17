"""
Stripe integration service for handling checkout sessions and payments.
"""

import stripe
from stripe import StripeError
from django.conf import settings
from django.urls import reverse
from decimal import Decimal
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def get_stripe_api_key() -> str:
    """Get Stripe secret API key from settings."""
    api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
    if not api_key:
        raise ValueError("STRIPE_SECRET_KEY not configured in settings")
    return api_key


def get_stripe_publishable_key() -> str:
    """Get Stripe publishable key from settings."""
    return getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')


def get_stripe_webhook_secret() -> str:
    """Get Stripe webhook secret from settings."""
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)
    if not webhook_secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET not configured in settings")
    return webhook_secret


def initialize_stripe():
    """Initialize Stripe with API key."""
    stripe.api_key = get_stripe_api_key()


def create_checkout_session(
    user,
    season,
    amount: Decimal,
    success_url: str,
    cancel_url: str,
    metadata: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Create a Stripe Checkout Session for entry fee payment.

    Args:
        user: Django User instance
        season: Season instance
        amount: Payment amount in USD
        success_url: URL to redirect to after successful payment
        cancel_url: URL to redirect to if user cancels
        metadata: Optional metadata to attach to the session

    Returns:
        Dictionary containing session_id, checkout_url, and expires_at
    """
    initialize_stripe()

    # Convert Decimal to cents (Stripe uses cents for USD)
    amount_cents = int(amount * 100)

    # Build metadata
    session_metadata = {
        'user_id': str(user.id),
        'username': user.username,
        'season_slug': season.slug,
        'season_year': season.year,
    }
    if metadata:
        session_metadata.update(metadata)

    try:
        # Create Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'unit_amount': amount_cents,
                        'product_data': {
                            'name': f'NBA Predictions Entry Fee - {season.year}',
                            'description': f'Entry fee for the {season.year} NBA Predictions Game',
                        },
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user.email if user.email else None,
            client_reference_id=f"{user.id}:{season.slug}",
            metadata=session_metadata,
            expires_at=int((datetime.now().timestamp()) + 3600),  # 1 hour from now
            # Enable Apple Pay and Google Pay automatically where available
            payment_method_options={
                'card': {
                    'request_three_d_secure': 'automatic',
                },
            },
        )

        logger.info(
            f"Created Stripe checkout session {session.id} for user {user.username} "
            f"and season {season.slug}"
        )

        return {
            'session_id': session.id,
            'checkout_url': session.url,
            'expires_at': session.expires_at,
            'status': session.status,
        }

    except StripeError as e:
        logger.error(f"Stripe error creating checkout session: {str(e)}")
        raise


def retrieve_checkout_session(session_id: str) -> Dict[str, Any]:
    """
    Retrieve a Stripe Checkout Session by ID.

    Args:
        session_id: Stripe Checkout Session ID

    Returns:
        Dictionary with session details
    """
    initialize_stripe()

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        return {
            'session_id': session.id,
            'payment_intent': session.payment_intent,
            'payment_status': session.payment_status,
            'status': session.status,
            'customer_email': session.customer_details.email if session.customer_details else None,
            'amount_total': session.amount_total / 100 if session.amount_total else 0,  # Convert cents to dollars
            'currency': session.currency,
            'metadata': session.metadata,
            'created': session.created,
            'expires_at': session.expires_at,
        }

    except StripeError as e:
        logger.error(f"Stripe error retrieving checkout session {session_id}: {str(e)}")
        raise


def verify_webhook_signature(payload: bytes, sig_header: str) -> Dict[str, Any]:
    """
    Verify Stripe webhook signature and return the event.

    Args:
        payload: Raw request body bytes
        sig_header: Stripe-Signature header value

    Returns:
        Stripe Event object as dictionary

    Raises:
        ValueError: If signature verification fails
    """
    webhook_secret = get_stripe_webhook_secret()

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        return event

    except ValueError as e:
        logger.error(f"Invalid webhook payload: {str(e)}")
        raise
    except Exception as e:
        # Catch signature verification errors and other Stripe errors
        logger.error(f"Webhook verification error: {str(e)}")
        raise ValueError("Invalid signature")


def get_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
    """
    Retrieve a Stripe Payment Intent by ID.

    Args:
        payment_intent_id: Stripe Payment Intent ID

    Returns:
        Dictionary with payment intent details
    """
    initialize_stripe()

    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        return {
            'id': payment_intent.id,
            'amount': payment_intent.amount / 100,  # Convert cents to dollars
            'currency': payment_intent.currency,
            'status': payment_intent.status,
            'customer_email': payment_intent.receipt_email,
            'metadata': payment_intent.metadata,
            'created': payment_intent.created,
        }

    except StripeError as e:
        logger.error(f"Stripe error retrieving payment intent {payment_intent_id}: {str(e)}")
        raise
