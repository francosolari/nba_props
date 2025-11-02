# API Documentation

This document provides a detailed description of the APIs for the NBA Predictions Game project.

## 1. API v1 (Legacy)

The v1 API is the original API for the project. It is built with Django REST Framework and is being deprecated in favor of the v2 API.

### 1.1. Endpoints

The v1 API has the following endpoints:

- `/api/v1/teams/`: Get a list of all NBA teams.
- `/api/v1/players/`: Get a list of all NBA players.
- `/api/v1/standings/<season_slug>/`: Get the standings for a specific season.
- `/api/v1/user-predictions/<season_slug>/`: Get the predictions for a specific user and season.
- `/api/v1/leaderboard/<season_slug>/`: Get the leaderboard for a specific season.
- `/api/v1/latest_season/`: Get the latest season.
- `/api/v1/questions/<season_slug>/`: Get the questions for a specific season.
- `/api/v1/submit-answers/<season_slug>/`: Submit answers to questions for a specific season.

## 2. API v2 (Modern)

The v2 API is the current API for the project. It is built with Django Ninja, a modern, fast, and type-safe API framework for Django. The v2 API is organized into multiple files in the `predictions/api/v2/endpoints` directory.

### 2.1. Authentication

The v2 API uses Django's built-in authentication system for authentication. To authenticate, you must include an `Authorization` header with a valid token in your request.

### 2.2. Endpoints

#### 2.2.1. Answers (`answers.py`)

- `/api/v2/answers/user/{identifier}`: Retrieve a user's answers with optional human-readable display values.
- `/api/v2/answers/all-by-season/`: Retrieve answers for all users for a specific season with efficient batch processing.
- `/api/v2/answers/lookup/refresh`: Manually refresh the player and team lookup cache.

#### 2.2.2. Homepage (`homepage.py`)

- `/api/v2/homepage/header-stats`: Provides key header stats for the homepage.
- `/api/v2/homepage/leaderboard-preview`: Provides a preview of the top 5 users for the leaderboard.
- `/api/v2/homepage/recent-predictions`: Provides a list of recent predictions.
- `/api/v2/homepage/upcoming-games`: Provides a list of upcoming games.

#### 2.2.3. Leaderboard (`leaderboard.py`)

- `/api/v2/leaderboard/{season_slug}`: Get the leaderboard for a specific season.

#### 2.2.4. Players (`players.py`)

- `/api/v2/players/`: Get a list of all NBA players.

#### 2.2.5. Standings (`standings.py`)

- `/api/v2/standings/{season_slug}`: Get the standings for a specific season.

#### 2.2.6. Teams (`teams.py`)

- `/api/v2/teams/`: Get a list of all NBA teams.