"""
ASGI config for nba_predictions project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

import sys
from pathlib import Path

# Add the apps directory to the Python path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR / "apps"))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')

application = get_asgi_application()
