"""
Payment models for tracking Stripe checkout sessions and payment status.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from .season import Season


class SubmissionState(models.TextChoices):
    """
    Submission state choices.
    """
    DRAFT = 'draft', 'Draft'
    SUBMITTED_UNPAID = 'submitted_unpaid', 'Submitted (Unpaid - Not Valid)'
    SUBMITTED_PAID = 'submitted_paid', 'Submitted (Paid - Valid)'


class PaymentStatus(models.TextChoices):
    """
    Payment status choices aligned with Stripe payment lifecycle.
    """
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    SUCCEEDED = 'succeeded', 'Succeeded'
    FAILED = 'failed', 'Failed'
    CANCELED = 'canceled', 'Canceled'
    EXPIRED = 'expired', 'Expired'


class Payment(models.Model):
    """
    Tracks Stripe checkout sessions and payment intents for entry fees.
    Each payment is associated with a user and season.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    season = models.ForeignKey(
        Season,
        on_delete=models.CASCADE,
        related_name='payments'
    )

    # Stripe identifiers
    checkout_session_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Stripe Checkout Session ID"
    )
    payment_intent_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Stripe Payment Intent ID (populated after checkout)"
    )

    # Payment details
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Payment amount in USD"
    )
    currency = models.CharField(
        max_length=3,
        default='usd',
        help_text="Currency code (ISO 4217)"
    )
    email = models.EmailField(
        null=True,
        blank=True,
        help_text="Customer email from Stripe checkout"
    )

    # Status tracking
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
        help_text="Current payment status"
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the checkout session was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last status update"
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the payment was confirmed as successful"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the checkout session expires"
    )

    # Metadata and audit trail
    stripe_payload = models.JSONField(
        null=True,
        blank=True,
        help_text="Raw Stripe event payload for audit purposes"
    )
    notes = models.TextField(
        blank=True,
        help_text="Internal notes about this payment"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'season', '-created_at']),
            models.Index(fields=['payment_status', '-created_at']),
        ]
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'

    def __str__(self):
        return (
            f"{self.user.username} - {self.season.slug} - "
            f"${self.amount} ({self.get_payment_status_display()})"
        )

    def mark_as_succeeded(self, payment_intent_id=None, stripe_payload=None):
        """
        Mark this payment as succeeded.
        Updates the payment status, paid_at timestamp, and related UserStats.
        """
        self.payment_status = PaymentStatus.SUCCEEDED
        self.paid_at = timezone.now()

        if payment_intent_id:
            self.payment_intent_id = payment_intent_id

        if stripe_payload:
            self.stripe_payload = stripe_payload

        self.save(update_fields=['payment_status', 'paid_at', 'payment_intent_id', 'stripe_payload', 'updated_at'])

        # Update UserStats to reflect payment
        from .user_stats import UserStats
        user_stats, _ = UserStats.objects.get_or_create(
            user=self.user,
            season=self.season
        )
        if not user_stats.entry_fee_paid:
            user_stats.entry_fee_paid = True
            user_stats.entry_fee_paid_at = self.paid_at
            user_stats.save(update_fields=['entry_fee_paid', 'entry_fee_paid_at'])

    def mark_as_failed(self, stripe_payload=None):
        """
        Mark this payment as failed.
        """
        self.payment_status = PaymentStatus.FAILED
        if stripe_payload:
            self.stripe_payload = stripe_payload
        self.save(update_fields=['payment_status', 'stripe_payload', 'updated_at'])

    def mark_as_canceled(self, stripe_payload=None):
        """
        Mark this payment as canceled.
        """
        self.payment_status = PaymentStatus.CANCELED
        if stripe_payload:
            self.stripe_payload = stripe_payload
        self.save(update_fields=['payment_status', 'stripe_payload', 'updated_at'])

    def mark_as_expired(self):
        """
        Mark this payment as expired.
        """
        self.payment_status = PaymentStatus.EXPIRED
        self.save(update_fields=['payment_status', 'updated_at'])

    @property
    def is_successful(self):
        """Check if payment was successful."""
        return self.payment_status == PaymentStatus.SUCCEEDED

    @property
    def is_pending(self):
        """Check if payment is still pending."""
        return self.payment_status in [PaymentStatus.PENDING, PaymentStatus.PROCESSING]

    @classmethod
    def get_latest_for_user_season(cls, user, season):
        """
        Get the most recent payment record for a user and season.
        """
        return cls.objects.filter(user=user, season=season).order_by('-created_at').first()

    @classmethod
    def has_valid_payment(cls, user, season):
        """
        Check if user has a valid (successful) payment for the season.
        """
        return cls.objects.filter(
            user=user,
            season=season,
            payment_status=PaymentStatus.SUCCEEDED
        ).exists()
