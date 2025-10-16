# Lightweight Python-only Dockerfile (frontend built locally via npm run build)
FROM python:3.11-slim-bullseye

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy requirements first (for better layer caching)
COPY backend/requirements.txt /app/

# Install dependencies with --no-cache-dir to save space (~50MB savings)
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ /app/

# Copy pre-built frontend static files (already built via npm run build)
COPY frontend/static /app/../frontend/static

# Collect static files (Django + WhiteNoise will serve these)
RUN python manage.py collectstatic --noinput

ENV DJANGO_SETTINGS_MODULE=nba_predictions.settings

EXPOSE 8000

# Run the Django app using Gunicorn for production
CMD ["gunicorn", "nba_predictions.wsgi:application", "--bind", "0.0.0.0:8000"]
