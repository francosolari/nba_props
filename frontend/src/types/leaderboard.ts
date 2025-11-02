/**
 * TypeScript interfaces for the NBA Predictions Leaderboard API
 * 
 * These types define the data contract for the `/api/v2/leaderboard/{season}` endpoint.
 * They are designed to handle potential missing data from the API gracefully.
 */

/**
 * Represents a user on the leaderboard
 */
export interface LeaderboardUser {
  /** Unique user identifier */
  id: number;
  
  /** User's position on the leaderboard */
  rank: number;
  
  /** User's unique username */
  username: string;
  
  /** User's formatted display name (typically first name + last initial) */
  display_name: string;
  
  /** URL to user's avatar image (optional) */
  avatar?: string | null;
  
  /** Total points earned across all categories */
  total_points: number;
  
  /** Percentage of correct predictions (0-100) */
  accuracy: number;
  
  /** User's performance in each prediction category */
  categories: Record<string, Category>;
}

/**
 * Represents a prediction category (e.g., "Regular Season Standings", "Player Awards", etc.)
 */
export interface Category {
  /** Total points earned in this category */
  points: number;
  
  /** Maximum possible points available in this category */
  max_points: number;
  
  /** List of individual predictions made in this category */
  predictions: Prediction[];
}

/**
 * Represents an individual prediction
 * 
 * This interface handles both team standing predictions and question/answer predictions
 * with union types for the different possible fields.
 */
export interface Prediction {
  /** 
   * For team standing predictions: Team name
   * For other predictions: undefined
   */
  team?: string;
  
  /**
   * For team standing predictions: Conference ("East" or "West") 
   * For other predictions: undefined
   */
  conference?: string;
  
  /**
   * For team standing predictions: Predicted position (1-15)
   * For other predictions: undefined
   */
  predicted_position?: number;
  
  /**
   * For team standing predictions: Actual position (1-15)
   * For other predictions: undefined
   * 
   * May be null if the season is ongoing
   */
  actual_position?: number | null;
  
  /**
   * For question/answer predictions: Question text
   * For team standing predictions: undefined
   */
  question?: string;
  
  /**
   * For question/answer predictions: User's submitted answer
   * For team standing predictions: undefined
   */
  answer?: string;
  
  /**
   * Whether the prediction was correct
   * 
   * May be null if the outcome is not yet determined
   */
  correct: boolean | null;
  
  /** Points earned for this prediction */
  points: number;
}

/**
 * Full response from the leaderboard API endpoint
 */
export interface LeaderboardResponse {
  /** List of users ranked by points */
  users: LeaderboardUser[];
}
