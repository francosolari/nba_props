"""
Utilities for handling entry fee payments and Venmo integration.
"""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib.parse import quote_plus
from django.conf import settings


DEFAULT_ENTRY_FEE_AMOUNT = Decimal("25.00")
DEFAULT_VENMO_USERNAME = "franco-solari"
DEFAULT_PAYMENT_NOTE = "NBA Predictions Entry Fee"


def _coerce_decimal(value) -> Decimal:
    """
    Safely coerce a value to a Decimal with two decimal places.
    Falls back to the default entry fee if conversion fails.
    """
    try:
        coerced = Decimal(str(value))
        return coerced.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError, ValueError):
        return DEFAULT_ENTRY_FEE_AMOUNT


def get_entry_fee_amount() -> Decimal:
    """
    Return the configured entry fee amount as a Decimal.
    """
    setting_value = getattr(settings, "ENTRY_FEE_AMOUNT", DEFAULT_ENTRY_FEE_AMOUNT)
    return _coerce_decimal(setting_value)


def get_entry_fee_amount_display() -> str:
    """
    Return the entry fee formatted as a string with two decimal places.
    """
    amount = get_entry_fee_amount()
    return f"{amount:.2f}"


def get_venmo_username() -> str:
    """
    Return the configured Venmo username (without @ prefix).
    """
    username = getattr(settings, "VENMO_USERNAME", DEFAULT_VENMO_USERNAME) or DEFAULT_VENMO_USERNAME
    return username.lstrip("@")


def get_payment_note() -> str:
    """
    Return the human-readable payment note to show to users.
    """
    note = getattr(settings, "VENMO_PAYMENT_NOTE", DEFAULT_PAYMENT_NOTE)
    return note or DEFAULT_PAYMENT_NOTE


def build_venmo_web_url(username: str, amount: Decimal, note: str) -> str:
    """
    Build a Venmo web URL that opens the payment prompt in a browser.
    """
    audience = "public"
    username = (username or "").lstrip("@")
    amount_str = f"{amount:.2f}"
    recipients=username
    return (
        f"https://account.venmo.com/pay?audience={audience}"
        f"&amount={amount}&note={note}"
        f"&recipients=%2C{recipients}&txn=pay"
    )
    # https://account.venmo.com/pay?audience=publci&amount=25&note=nba&recipients=%2
    # Crobbiekingsley&txn=pay
    # return (
    #     f"https://venmo.com/u/{quote_plus(username)}"
    #     f"?txn=pay&amount={quote_plus(amount_str)}&note={quote_plus(note)}"
    # )


def build_venmo_deep_link(username: str, amount: Decimal, note: str) -> str:
    """
    Build a Venmo deep link that attempts to open the Venmo mobile app.
    """
    username = (username or "").lstrip("@")
    amount_str = f"{amount:.2f}"
    return (
        f"venmo://paycharge?txn=pay&recipients={quote_plus(username)}"
        f"&amount={quote_plus(amount_str)}&note={quote_plus(note)}"
    )


def get_entry_fee_payload() -> dict:
    """
    Convenience helper returning all payment metadata in a single dictionary.
    """
    amount = get_entry_fee_amount()
    username = get_venmo_username()
    note = get_payment_note()
    return {
        "amount": amount,
        "amount_display": f"{amount:.2f}",
        "venmo_username": username,
        "payment_note": note,
        "venmo_web_url": build_venmo_web_url(username, amount, note),
        "venmo_deep_link": build_venmo_deep_link(username, amount, note),
    }
