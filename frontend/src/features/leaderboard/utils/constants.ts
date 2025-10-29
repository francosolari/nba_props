/**
 * Constants for the Leaderboard feature
 *
 * This file contains all magic strings, enums, and constant values used
 * throughout the leaderboard feature to ensure type safety and consistency.
 *
 * @module features/leaderboard/utils/constants
 */

/**
 * Category keys used in the API and throughout the app
 * These must match the Django backend category names exactly
 */
export const CATEGORY_KEYS = {
  STANDINGS: 'Regular Season Standings',
  AWARDS: 'Player Awards',
  PROPS: 'Props & Yes/No',
} as const;

/**
 * Type representing a category key
 */
export type CategoryKey = typeof CATEGORY_KEYS[keyof typeof CATEGORY_KEYS];

/**
 * Mapping from section names to category keys
 */
export const SECTION_TO_CATEGORY = {
  standings: CATEGORY_KEYS.STANDINGS,
  awards: CATEGORY_KEYS.AWARDS,
  props: CATEGORY_KEYS.PROPS,
} as const;

/**
 * Points awarded for standings predictions
 */
export const STANDINGS_POINTS = {
  /** Points for exact match */
  EXACT: 3,

  /** Points for off-by-one */
  CLOSE: 1,

  /** Points for incorrect */
  WRONG: 0,
} as const;

/**
 * Fixed column widths for the leaderboard grid (in pixels)
 */
export const COLUMN_WIDTHS = {
  /** Team name column */
  TEAM: 160,

  /** Position column */
  POSITION: 72,

  /** User column */
  USER: 108,
} as const;

/**
 * LocalStorage keys used by the leaderboard
 */
export const STORAGE_KEYS = {
  /** Key for mobile drag tooltip seen flag */
  MOBILE_DRAG_TOOLTIP_SEEN: 'nba-mobile-drag-tooltip-seen',
} as const;

/**
 * Conference names
 */
export const CONFERENCES = {
  WEST: 'West',
  EAST: 'East',
} as const;

/**
 * Image fallback extensions for team logos
 */
export const IMAGE_FALLBACK_EXTENSIONS = ['png', 'svg', 'PNG', 'SVG'] as const;
