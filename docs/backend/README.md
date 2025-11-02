# Backend Documentation

This document provides a comprehensive overview of the backend for the NBA Predictions Game project.

## 1. Project Structure

The backend is a Django project with the following structure:

- `nba_predictions/`: The main Django project directory.
- `accounts/`: Handles user authentication.
- `predictions/`: The core application logic, including models, views, and APIs.

### 1.1. `nba_predictions/`

This directory contains the main project settings, including `settings.py` and `urls.py`.

### 1.2. `accounts/`

This app handles user authentication, including registration, login, and logout. It uses Django's built-in authentication system.

### 1.3. `predictions/`

This is the core application, and contains the following key components:

- **`models/`**: The database models.
- **`views/`**: The views that handle user requests.
- **`api/`**: The API endpoints.
- **`templates/`**: The HTML templates.
- **`management/`**: Custom management commands.

## 2. Models

The models are organized into separate files based on their domain. For a detailed description of the models, see the [Models Documentation](./models.md).

## 3. APIs

The project has two API versions:

- **v1 (Legacy)**: The original API, built with Django REST Framework.
- **v2 (Modern)**: The current API, built with Django Ninja.

The v2 API is organized into multiple files in the `predictions/api/v2/endpoints` directory. For a detailed description of the APIs, see the [API Documentation](./api.md).
