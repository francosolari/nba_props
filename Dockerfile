# Multi-stage Production Dockerfile with Frontend Build
FROM node:20 AS frontend-builder

WORKDIR /build

# Copy package files
COPY package.json package-lock.json* ./
COPY frontend/ ./frontend/

# Install dependencies and build frontend
RUN npm install
RUN npm run build

# Python stage
FROM python:3.11-slim-bullseye

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy requirements and install
COPY backend/requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy backend code
COPY backend/ /app/

# Copy frontend build from frontend-builder stage
COPY --from=frontend-builder /build/frontend/static /app/../frontend/static

# Collect static files
RUN python manage.py collectstatic --noinput

ENV DJANGO_SETTINGS_MODULE=nba_predictions.settings

EXPOSE 8000

# Run the Django app using Gunicorn for production
CMD ["gunicorn", "nba_predictions.wsgi:application", "--bind", "0.0.0.0:8000"]
