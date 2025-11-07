# Multi-stage build to compile frontend assets during Docker build

FROM node:18-bullseye-slim AS frontend-build

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
COPY babel.config.js ./
RUN npm ci

# Copy frontend source and build assets
COPY frontend ./frontend
RUN npm run build


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

# Copy compiled frontend static assets from the build stage
COPY --from=frontend-build /app/frontend/static /frontend/static

# Copy static image assets that live in the repository
COPY frontend/static/img /frontend/static/img

# Collect static files (Django + WhiteNoise will serve these)
RUN python manage.py collectstatic --noinput

ENV DJANGO_SETTINGS_MODULE=nba_predictions.settings

EXPOSE 8000

# Run the Django app using Gunicorn for production
CMD ["gunicorn", "nba_predictions.wsgi:application", "--bind", "0.0.0.0:8000"]
