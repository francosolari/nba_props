# NBA Predictions Leaderboard Data Types

This directory contains TypeScript interfaces and JSDoc type definitions for the data returned by the `/api/v2/leaderboard/{season}` endpoint.

## Overview

The leaderboard API returns data about users, their predictions across different categories, and their performance. The data structure is designed to handle both team standing predictions and question/answer predictions in a unified way.

## Key Types

### LeaderboardUser

Represents a user on the leaderboard with their overall stats and category-specific performance.

```typescript
interface LeaderboardUser {
  id: number;
  rank: number;
  username: string;
  display_name: string;
  avatar?: string | null;
  total_points: number;
  accuracy: number;
  categories: Record<string, Category>;
}
```

### Category

Represents a prediction category (e.g., "Regular Season Standings", "Player Awards", etc.) with aggregated stats and individual predictions.

```typescript
interface Category {
  points: number;
  max_points: number;
  predictions: Prediction[];
}
```

### Prediction

Represents an individual prediction, which can be either a team standing prediction or a question/answer prediction.

```typescript
interface Prediction {
  // Team standing prediction fields
  team?: string;
  conference?: string;
  predicted_position?: number;
  actual_position?: number | null;
  
  // Question/answer prediction fields
  question?: string;
  answer?: string;
  
  // Common fields
  correct: boolean | null;
  points: number;
}
```

## Handling Missing Data

The interfaces are designed to be resilient to missing data:

1. **Optional fields** are marked with a `?` suffix in TypeScript or as optional in JSDoc.
2. **Nullable fields** can be `null` when data is not available (e.g., `actual_position` can be null if the season is ongoing).
3. **Union types** are used to handle different field possibilities for different prediction types.

## Usage Examples

### TypeScript

```typescript
import { LeaderboardUser } from './types/leaderboard';

async function fetchLeaderboard(season: string): Promise<LeaderboardUser[]> {
  const response = await fetch(`/api/v2/leaderboard/${season}`);
  const data = await response.json();
  return data;
}

// Handling potentially missing data
function displayUserStats(user: LeaderboardUser) {
  // Safe access to optional fields
  const avatarUrl = user.avatar || '/default-avatar.png';
  
  // Check if a category exists before accessing it
  const regularSeasonCategory = user.categories['Regular Season Standings'];
  const regularSeasonPoints = regularSeasonCategory?.points || 0;
  
  // Check for nullable fields in predictions
  const pendingPredictions = user.categories['Player Awards']?.predictions
    .filter(prediction => prediction.correct === null)
    .length || 0;
}
```

### JavaScript with JSDoc

```javascript
/**
 * @param {string} season
 * @returns {Promise<import('./types/leaderboard').LeaderboardUser[]>}
 */
async function fetchLeaderboard(season) {
  const response = await fetch(`/api/v2/leaderboard/${season}`);
  const data = await response.json();
  return data;
}

/**
 * @param {import('./types/leaderboard').LeaderboardUser} user
 */
function displayUserStats(user) {
  // Safe access to optional fields
  const avatarUrl = user.avatar || '/default-avatar.png';
  
  // Check if a category exists before accessing it
  const regularSeasonCategory = user.categories['Regular Season Standings'];
  const regularSeasonPoints = regularSeasonCategory?.points || 0;
  
  // Check for nullable fields in predictions
  const pendingPredictions = user.categories['Player Awards']?.predictions
    .filter(prediction => prediction.correct === null)
    .length || 0;
}
```

## Category Types

Based on the API implementation, the following categories are known to exist:

1. "Regular Season Standings"
2. "Player Awards"
3. "Props & Yes/No"

New categories may be added in the future, so code should be resilient to unknown category names.
