# File: predictions/api/v2/schemas/payments.py
"""
Payment-related schemas for Stripe integration.
"""

from typing import Optional
from ninja import Schema
from pydantic import Field
from datetime import datetime


class CreateCheckoutSessionSchema(Schema):
    """
    Request schema for creating a Stripe checkout session.
    """
    season_slug: str = Field(..., description="Season slug for the entry fee", example="2025-26")


class CheckoutSessionResponseSchema(Schema):
    """
    Response schema for checkout session creation.
    Contains the session ID and checkout URL to redirect the user.
    """
    session_id: str = Field(..., description="Stripe Checkout Session ID")
    checkout_url: str = Field(..., description="URL to redirect user to Stripe checkout")
    expires_at: int = Field(..., description="Unix timestamp when session expires")


class PaymentStatusSchema(Schema):
    """
    Schema for payment status information.
    """
    payment_status: str = Field(..., description="Payment status", example="succeeded")
    is_paid: bool = Field(..., description="Whether payment is confirmed")
    amount: Optional[str] = Field(None, description="Payment amount", example="25.00")
    paid_at: Optional[datetime] = Field(None, description="When payment was confirmed")
    session_status: Optional[str] = Field(None, description="Checkout session status", example="complete")


class SubmissionStatusWithPaymentSchema(Schema):
    """
    Enhanced submission status that includes payment information.
    """
    season_slug: str = Field(..., description="Season identifier", example="2025-26")
    is_submission_open: bool = Field(..., description="Whether submissions are currently allowed")
    submission_end_date: Optional[datetime] = Field(None, description="Deadline for submissions")
    payment_required: bool = Field(..., description="Whether payment is required for valid submission")
    payment_status: Optional[PaymentStatusSchema] = Field(None, description="Current payment status")
    submission_valid: bool = Field(..., description="Whether submission is valid (paid and within deadline)")
    editable_until: Optional[datetime] = Field(None, description="When submissions become locked")
