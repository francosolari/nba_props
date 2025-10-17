#!/usr/bin/env python
"""
Test the payment API endpoint with authentication.
"""

import os
import sys
import django
import json

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model

User = get_user_model()

def test_payment_api():
    """Test the create-checkout-session API endpoint."""
    print("=" * 60)
    print("Testing Payment API Endpoint")
    print("=" * 60)

    # Get a test user
    user = User.objects.first()
    if not user:
        print("❌ No users found")
        return False

    print(f"✅ Testing with user: {user.username}")

    # Create test client and login
    client = Client()
    client.force_login(user)

    # Test create checkout session
    print("\n" + "-" * 60)
    print("POST /api/v2/payments/create-checkout-session")
    print("-" * 60)

    response = client.post(
        '/api/v2/payments/create-checkout-session',
        data=json.dumps({'season_slug': '2025-26'}),
        content_type='application/json'
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("\n✅ SUCCESS! Response:")
        print(f"   Session ID: {data.get('session_id')}")
        print(f"   Checkout URL: {data.get('checkout_url')[:80]}...")
        print(f"   Expires At: {data.get('expires_at')}")

        print("\n" + "=" * 60)
        print("🎉 API endpoint is working correctly!")
        print("=" * 60)

        # Test payment status endpoint
        print("\n" + "-" * 60)
        print("GET /api/v2/payments/payment-status/2025-26")
        print("-" * 60)

        status_response = client.get('/api/v2/payments/payment-status/2025-26')
        print(f"Status Code: {status_response.status_code}")

        if status_response.status_code == 200:
            status_data = status_response.json()
            print("\n✅ Payment Status Response:")
            print(f"   Payment Status: {status_data.get('payment_status')}")
            print(f"   Is Paid: {status_data.get('is_paid')}")
            print(f"   Amount: {status_data.get('amount')}")

        return True
    else:
        print(f"\n❌ ERROR: {response.status_code}")
        print(f"Response: {response.content.decode()}")
        return False

if __name__ == '__main__':
    success = test_payment_api()
    sys.exit(0 if success else 1)
