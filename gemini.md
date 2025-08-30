# Gemini Development Guide

This document provides a guide for AI-powered development on the NBA Predictions Game project. It outlines the project's architecture, conventions, and key components to ensure that AI-generated code is consistent, maintainable, and aligned with the project's goals.

## Project Overview

The NBA Predictions Game is a Django application with a React frontend. The backend is built with Django and Django Ninja, and the frontend is built with React and Tailwind CSS. The project is containerized with Docker and uses a blue-green deployment strategy.

## Backend

The backend is a Django project with the following structure:

- `nba_predictions/`: The main Django project directory.
- `accounts/`: Handles user authentication.
- `predictions/`: The core application logic, including models, views, and APIs.

### Models

The models are organized into separate files based on their domain. The key models are:

- `Season`: Represents an NBA season.
- `Team`: Represents an NBA team.
- `Player`: Represents an NBA player.
- `Question`: Represents a prediction question.
- `Answer`: Represents a user's answer to a question.
- `Prediction`: Represents a user's prediction.
- `UserStats`: Stores user statistics.

### APIs

The project has two API versions:

- **v1 (Legacy)**: The original API, built with Django REST Framework.
- **v2 (Modern)**: The current API, built with Django Ninja.

All new API development should be done in v2. The v1 API is being deprecated and will be removed in a future release.

## Frontend

The frontend is a React application with the following structure:

- `src/`: The main React source code directory.
- `components/`: Reusable React components.
- `hooks/`: Custom React hooks.
- `pages/`: Top-level page components.
- `utils/`: Utility functions.

### State Management

The frontend uses Redux for state management and React Query for data fetching.

### Styling

The frontend is styled with Tailwind CSS.

## Conventions

### Code Style

- **Python**: Follow the PEP 8 style guide.
- **JavaScript/TypeScript**: Follow the Airbnb style guide.

### Testing

- **Backend**: Use `pytest` for unit and integration tests.
- **Frontend**: Use Jest and React Testing Library for unit and component tests.

### Documentation

- **Backend**: Use docstrings for all modules, classes, and functions.
- **Frontend**: Use JSDoc for all components and functions.

## How to Contribute

When contributing to the project, please follow these guidelines:

1.  **Create a new branch** for your changes.
2.  **Write tests** for your changes.
3.  **Update the documentation** as needed.
4.  **Open a pull request** and request a review.
