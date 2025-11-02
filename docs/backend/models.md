# Models Documentation

This document provides a detailed description of the database models for the NBA Predictions Game project.

## 1. `Season`

Represents an NBA season.

- `year`: The year of the season (e.g., 2023).
- `start_date`: The start date of the season.
- `end_date`: The end date of the season.

## 2. `Team`

Represents an NBA team.

- `name`: The name of the team (e.g., "Los Angeles Lakers").
- `abbreviation`: The abbreviation of the team (e.g., "LAL").
- `conference`: The conference of the team (e.g., "East" or "West").

## 3. `Player`

Represents an NBA player.

- `name`: The name of the player (e.g., "LeBron James").
- `team`: A foreign key to the `Team` model.

## 4. `Question`

Represents a prediction question.

- `text`: The text of the question (e.g., "Who will win the MVP award?").
- `question_type`: The type of the question (e.g., "multiple_choice", "true_false").
- `season`: A foreign key to the `Season` model.

## 5. `Answer`

Represents a user's answer to a question.

- `user`: A foreign key to the `User` model.
- `question`: A foreign key to the `Question` model.
- `answer`: The user's answer to the question.

## 6. `Prediction`

Represents a user's prediction.

- `user`: A foreign key to the `User` model.
- `question`: A foreign key to the `Question` model.
- `prediction`: The user's prediction.

## 7. `UserStats`

Stores user statistics.

- `user`: A foreign key to the `User` model.
- `season`: A foreign key to the `Season` model.
- `points`: The user's total points for the season.
