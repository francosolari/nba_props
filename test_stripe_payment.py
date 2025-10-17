#!/usr/bin/env python
"""
Test script for Stripe payment integration.
Tests the complete flow without requiring browser authentication.
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')
django.setup()

from django.contrib.auth import get_user_model
from predictions.models import Season
from predictions.utils.stripe_service import create_checkout_session
from decimal import Decimal

User = get_user_model()

def test_create_checkout_session():
    """Test creating a Stripe checkout session."""
    print("=" * 60)
    print("Testing Stripe Checkout Session Creation")
    print("=" * 60)

    # Get or create a test user
    try:
        user = User.objects.first()
        if not user:
            print("❌ No users found in database. Creating test user...")
            user = User.objects.create_user(
                username='testuser',
                email='test@example.com',
                password='testpass123'
            )
            print(f"✅ Created test user: {user.username}")
        else:
            print(f"✅ Using existing user: {user.username} ({user.email})")
    except Exception as e:
        print(f"❌ Error getting/creating user: {e}")
        return False

    # Get or create a test season
    try:
        season = Season.objects.filter(slug='2025-26').first()
        if not season:
            print("❌ Season 2025-26 not found in database")
            print("   Available seasons:")
            for s in Season.objects.all()[:5]:
                print(f"   - {s.slug} ({s.year})")
            season = Season.objects.first()
            if not season:
                print("❌ No seasons found at all!")
                return False
        print(f"✅ Using season: {season.slug} ({season.year})")
    except Exception as e:
        print(f"❌ Error getting season: {e}")
        return False

    # Test creating checkout session
    print("\n" + "-" * 60)
    print("Creating Stripe Checkout Session...")
    print("-" * 60)

    try:
        result = create_checkout_session(
            user=user,
            season=season,
            amount=Decimal('25.00'),
            success_url='http://localhost:8000/submissions/?payment_success=true',
            cancel_url='http://localhost:8000/submissions/?payment_canceled=true',
            metadata={
                'test': 'true',
                'source': 'test_script'
            }
        )

        print("\n✅ SUCCESS! Checkout session created:")
        print(f"   Session ID: {result['session_id']}")
        print(f"   Checkout URL: {result['checkout_url']}")
        print(f"   Expires At: {result['expires_at']}")
        print(f"   Status: {result['status']}")

        print("\n" + "=" * 60)
        print("🎉 Stripe integration is working correctly!")
        print("=" * 60)
        print("\nYou can test the payment flow by visiting:")
        print(f"   {result['checkout_url']}")
        print("\nUse test card: 4242 4242 4242 4242")
        print("Any future expiry date, any 3-digit CVC")

        return True

    except Exception as e:
        print(f"\n❌ ERROR creating checkout session:")
        print(f"   Type: {type(e).__name__}")
        print(f"   Message: {str(e)}")

        import traceback
        print("\n" + "-" * 60)
        print("Full Traceback:")
        print("-" * 60)
        traceback.print_exc()

        return False

if __name__ == '__main__':
    success = test_create_checkout_session()
    sys.exit(0 if success else 1)
