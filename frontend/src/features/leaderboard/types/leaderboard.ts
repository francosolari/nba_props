/**
 * TypeScript type definitions for the Leaderboard feature
 *
 * This file contains all type definitions for leaderboard data structures,
 * including user entries, predictions, categories, and related domain models.
 *
 * @module features/leaderboard/types
 */

/**
 * Prediction made by a user for a specific question
 */
export interface Prediction {
  /** Unique identifier for the question */
  question_id: string | number;

  /** The question text */
  question: string;

  /** User's answer to the question */
  answer: string;

  /** Whether the prediction was correct (undefined if not yet graded) */
  correct?: boolean;

  /** Points awarded for this prediction */
  points: number;

  /** Team associated with this prediction (for standings) */
  team?: string;

  /** User's predicted position (for standings) */
  predicted_position?: number | null;

  /** Whether this prediction is finalized */
  is_finalized?: boolean;

  /** Conference (for standings predictions) */
  conference?: 'West' | 'East';

  /** Actual position in standings */
  actual_position?: number | null;
}

/**
 * Category of predictions (e.g., Standings, Awards, Props)
 */
export interface Category {
  /** Points earned in this category */
  points: number;

  /** Maximum possible points in this category */
  max_points: number;

  /** Array of predictions in this category */
  predictions: Prediction[];
}

/**
 * User information and predictions
 */
export interface User {
  /** Unique user identifier */
  id: string | number;

  /** Username */
  username: string;

  /** Display name (optional, falls back to username) */
  display_name?: string;

  /** Total points across all categories */
  total_points: number;

  /** Breakdown of predictions by category */
  categories?: Record<string, Category>;
}

/**
 * Complete leaderboard entry for a user
 */
export interface LeaderboardEntry {
  /** User data and predictions */
  user: User;

  /** User's rank on the leaderboard */
  rank: number;

  /** Original total points (before What-If simulation) */
  __orig_total_points?: number;
}

/**
 * Team in conference standings
 */
export interface StandingsTeam {
  /** Team name */
  team: string;

  /** Conference the team belongs to */
  conference: 'West' | 'East';

  /** Actual position in standings */
  actual_position: number | null;
}

/**
 * Ordered team with unique identifier (for drag-and-drop)
 */
export interface OrderedTeam extends StandingsTeam {
  /** Unique identifier combining conference and team name */
  id: string;
}

/**
 * Season information
 */
export interface Season {
  /** Season slug (e.g., "2024-25") */
  slug: string;

  /** Season year for display */
  year: number;

  /** Whether submissions are still open */
  submissions_open: boolean;

  /** Submission end date (ISO string) */
  submission_end_date?: string;
}

/**
 * Section of the leaderboard detail page
 */
export type Section = 'standings' | 'awards' | 'props';

/**
 * Display mode for leaderboard
 */
export type Mode = 'showcase' | 'compare';

/**
 * Sort option for leaderboard
 */
export type SortOption = 'standings' | 'total' | 'name';

/**
 * Conference type
 */
export type Conference = 'West' | 'East';
