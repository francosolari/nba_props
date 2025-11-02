"""
Stripe webhook handler for processing payment events.

This is a standalone Django view (not part of Django Ninja API) because:
1. Webhooks send raw request bodies that need special handling
2. Stripe signature verification requires the raw bytes
3. We want to return simple HTTP 200/400 responses, not JSON schemas
"""

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import logging

from predictions.models import Payment, PaymentStatus
from predictions.utils.stripe_service import verify_webhook_signature

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Handle Stripe webhook events.

    This endpoint is called by Stripe to notify us of payment events.
    We use it to update payment statuses in real-time.

    Supported events:
    - checkout.session.completed: Payment succeeded
    - checkout.session.expired: Session expired without payment
    - payment_intent.succeeded: Payment confirmed
    - payment_intent.payment_failed: Payment failed

    Security:
    - Verifies Stripe signature to ensure authenticity
    - Protected by CSRF exemption (Stripe can't provide CSRF tokens)
    - Uses webhook secret to validate requests

    Returns:
        HttpResponse: 200 on success, 400 on error
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    if not sig_header:
        logger.warning("Webhook received without Stripe signature")
        return HttpResponse('Missing signature', status=400)

    try:
        # Verify webhook signature
        event = verify_webhook_signature(payload, sig_header)
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {str(e)}")
        return HttpResponse('Invalid payload', status=400)
    except Exception as e:
        logger.error(f"Webhook signature verification failed: {str(e)}")
        return HttpResponse('Invalid signature', status=400)

    # Handle the event
    event_type = event.get('type')
    event_data = event.get('data', {}).get('object', {})

    logger.info(f"Received Stripe webhook event: {event_type}")

    try:
        if event_type == 'checkout.session.completed':
            handle_checkout_session_completed(event_data)

        elif event_type == 'checkout.session.expired':
            handle_checkout_session_expired(event_data)

        elif event_type == 'payment_intent.succeeded':
            handle_payment_intent_succeeded(event_data)

        elif event_type == 'payment_intent.payment_failed':
            handle_payment_intent_failed(event_data)

        else:
            logger.info(f"Unhandled webhook event type: {event_type}")

    except Exception as e:
        logger.error(f"Error processing webhook event {event_type}: {str(e)}", exc_info=True)
        return HttpResponse('Error processing event', status=500)

    return HttpResponse('Success', status=200)


def handle_checkout_session_completed(session):
    """
    Handle checkout.session.completed event.

    This event fires when a customer completes the checkout process.
    We use it to mark the payment as succeeded.
    """
    session_id = session.get('id')
    payment_intent_id = session.get('payment_intent')
    payment_status = session.get('payment_status')

    logger.info(f"Handling checkout session completed: {session_id}")

    try:
        payment = Payment.objects.get(checkout_session_id=session_id)

        if payment_status == 'paid':
            payment.mark_as_succeeded(
                payment_intent_id=payment_intent_id,
                stripe_payload=session
            )
            logger.info(
                f"Payment {payment.id} marked as succeeded via webhook "
                f"(user: {payment.user.username}, season: {payment.season.slug})"
            )
        else:
            logger.warning(
                f"Checkout session completed but payment_status is {payment_status} "
                f"for session {session_id}"
            )

    except Payment.DoesNotExist:
        logger.error(f"Payment record not found for session {session_id}")
    except Exception as e:
        logger.error(f"Error handling checkout session completed: {str(e)}", exc_info=True)
        raise


def handle_checkout_session_expired(session):
    """
    Handle checkout.session.expired event.

    This event fires when a checkout session expires (after 24 hours).
    """
    session_id = session.get('id')

    logger.info(f"Handling checkout session expired: {session_id}")

    try:
        payment = Payment.objects.get(checkout_session_id=session_id)

        if payment.payment_status == PaymentStatus.PENDING:
            payment.mark_as_expired()
            logger.info(
                f"Payment {payment.id} marked as expired via webhook "
                f"(user: {payment.user.username}, season: {payment.season.slug})"
            )

    except Payment.DoesNotExist:
        logger.error(f"Payment record not found for session {session_id}")
    except Exception as e:
        logger.error(f"Error handling checkout session expired: {str(e)}", exc_info=True)
        raise


def handle_payment_intent_succeeded(payment_intent):
    """
    Handle payment_intent.succeeded event.

    This is an additional confirmation that the payment went through.
    Usually fires after checkout.session.completed.
    """
    payment_intent_id = payment_intent.get('id')

    logger.info(f"Handling payment intent succeeded: {payment_intent_id}")

    try:
        # Find payment by payment_intent_id
        payment = Payment.objects.filter(payment_intent_id=payment_intent_id).first()

        if payment and not payment.is_successful:
            payment.mark_as_succeeded(
                payment_intent_id=payment_intent_id,
                stripe_payload=payment_intent
            )
            logger.info(
                f"Payment {payment.id} marked as succeeded via payment_intent webhook "
                f"(user: {payment.user.username}, season: {payment.season.slug})"
            )
        elif not payment:
            # This is okay - payment_intent might arrive before we link it to Payment record
            logger.info(f"Payment intent {payment_intent_id} succeeded but no Payment record found yet")

    except Exception as e:
        logger.error(f"Error handling payment intent succeeded: {str(e)}", exc_info=True)
        raise


def handle_payment_intent_failed(payment_intent):
    """
    Handle payment_intent.payment_failed event.

    This event fires when a payment fails (declined card, insufficient funds, etc.).
    """
    payment_intent_id = payment_intent.get('id')

    logger.info(f"Handling payment intent failed: {payment_intent_id}")

    try:
        payment = Payment.objects.filter(payment_intent_id=payment_intent_id).first()

        if payment:
            payment.mark_as_failed(stripe_payload=payment_intent)
            logger.warning(
                f"Payment {payment.id} marked as failed via webhook "
                f"(user: {payment.user.username}, season: {payment.season.slug})"
            )

    except Exception as e:
        logger.error(f"Error handling payment intent failed: {str(e)}", exc_info=True)
        raise
