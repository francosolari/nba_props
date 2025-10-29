/**
 * Utility functions for standings calculations and What-If simulations
 *
 * This module contains pure functions for:
 * - Point calculations for standings predictions
 * - What-If simulation totals
 * - Team ordering and position mapping
 *
 * @module features/leaderboard/utils/standings
 */

import type {
  LeaderboardEntry,
  OrderedTeam,
  StandingsTeam,
  Prediction,
} from '../types/leaderboard';
import { STANDINGS_POINTS, CATEGORY_KEYS } from './constants';

/**
 * Calculate points awarded for a standings prediction
 *
 * Scoring rules:
 * - Exact match: 3 points
 * - Off by one position: 1 point
 * - Otherwise: 0 points
 *
 * @param predicted - User's predicted position (1-15)
 * @param actual - Actual position in standings
 * @returns Points awarded (0, 1, or 3)
 *
 * @example
 * ```ts
 * standingPoints(5, 5) // => 3 (exact match)
 * standingPoints(5, 6) // => 1 (off by one)
 * standingPoints(5, 8) // => 0 (wrong)
 * standingPoints(null, 5) // => 0 (no prediction)
 * ```
 */
export function standingPoints(
  predicted: number | null | undefined,
  actual: number | null | undefined
): number {
  if (actual == null || predicted == null) {
    return STANDINGS_POINTS.WRONG;
  }

  if (predicted === actual) {
    return STANDINGS_POINTS.EXACT;
  }

  if (Math.abs(predicted - actual) === 1) {
    return STANDINGS_POINTS.CLOSE;
  }

  return STANDINGS_POINTS.WRONG;
}

/**
 * Build a map of team names to simulated positions
 *
 * Used for What-If scenario calculations where users can reorder teams.
 *
 * @param westOrder - Ordered teams in Western Conference
 * @param eastOrder - Ordered teams in Eastern Conference
 * @returns Map of team name to simulated position (1-based index)
 */
export function buildSimulationMap(
  westOrder: OrderedTeam[],
  eastOrder: OrderedTeam[]
): Map<string, number> {
  const map = new Map<string, number>();

  westOrder.forEach((team, index) => {
    map.set(team.team, index + 1);
  });

  eastOrder.forEach((team, index) => {
    map.set(team.team, index + 1);
  });

  return map;
}

/**
 * Calculate simulated leaderboard totals based on What-If team ordering
 *
 * This recalculates each user's standings points based on the simulated
 * team positions and updates their total points accordingly.
 *
 * @param leaderboardData - Original leaderboard entries
 * @param westOrder - Simulated West conference order
 * @param eastOrder - Simulated East conference order
 * @returns New leaderboard entries with recalculated totals, sorted by total points
 *
 * @example
 * ```ts
 * const simulated = calculateSimulatedTotals(
 *   leaderboardData,
 *   newWestOrder,
 *   newEastOrder
 * );
 * // Users now have updated total_points based on new standings
 * ```
 */
export function calculateSimulatedTotals(
  leaderboardData: LeaderboardEntry[],
  westOrder: OrderedTeam[],
  eastOrder: OrderedTeam[]
): LeaderboardEntry[] {
  const simActualMap = buildSimulationMap(westOrder, eastOrder);

  return leaderboardData
    .map((entry) => {
      const cat = entry.user.categories?.[CATEGORY_KEYS.STANDINGS];

      if (!cat) {
        return entry;
      }

      // Calculate new standings points based on simulated positions
      const simStandPts = (cat.predictions || []).reduce((sum, prediction) => {
        const simPosition = simActualMap.get(prediction.team || '');
        return sum + standingPoints(prediction.predicted_position, simPosition);
      }, 0);

      // Preserve original standings points and recalculate total
      const originalStandPts = cat.points || 0;
      const otherPts = (entry.user.total_points || 0) - originalStandPts;
      const newTotal = otherPts + simStandPts;

      return {
        ...entry,
        __orig_total_points: entry.user.total_points,
        user: {
          ...entry.user,
          total_points: newTotal,
          categories: {
            ...entry.user.categories,
            [CATEGORY_KEYS.STANDINGS]: {
              ...cat,
              points: simStandPts,
            },
          },
        },
      };
    })
    .sort((a, b) => (b.user.total_points || 0) - (a.user.total_points || 0));
}

/**
 * Extract and order all unique teams from leaderboard predictions
 *
 * @param leaderboardData - Leaderboard entries
 * @returns Array of teams with their conference and actual position
 */
export function extractStandingsTeams(
  leaderboardData: LeaderboardEntry[]
): StandingsTeam[] {
  const byTeam = new Map<string, StandingsTeam>();

  leaderboardData.forEach((entry) => {
    const cat = entry.user.categories?.[CATEGORY_KEYS.STANDINGS];
    if (!cat?.predictions) return;

    cat.predictions.forEach((prediction) => {
      if (!prediction.team) return;

      const existing = byTeam.get(prediction.team);
      const actualPos = prediction.actual_position;

      // Keep the smallest (best) actual position if there are duplicates
      if (
        !existing ||
        (actualPos != null &&
          (existing.actual_position == null ||
            actualPos < existing.actual_position))
      ) {
        byTeam.set(prediction.team, {
          team: prediction.team,
          conference: (prediction.conference || 'West') as 'West' | 'East',
          actual_position: actualPos ?? null,
        });
      }
    });
  });

  // Sort by conference, then by actual position, then alphabetically
  const teams = Array.from(byTeam.values());
  teams.sort((a, b) => {
    // West before East
    const confCompare = a.conference === 'West' ? -1 : b.conference === 'West' ? 1 : 0;
    if (confCompare !== 0) return confCompare;

    // Lower position first (1, 2, 3...)
    const posA = a.actual_position ?? 999;
    const posB = b.actual_position ?? 999;
    if (posA !== posB) return posA - posB;

    // Alphabetical tie-breaker
    return a.team.localeCompare(b.team);
  });

  return teams;
}

/**
 * Convert array to ordered teams with unique IDs for drag-and-drop
 *
 * @param teams - Array of standings teams
 * @param conference - Conference these teams belong to
 * @returns Ordered teams with generated IDs
 */
export function createOrderedTeams(
  teams: StandingsTeam[],
  conference: 'West' | 'East'
): OrderedTeam[] {
  return teams.map((team) => ({
    ...team,
    id: `${conference.charAt(0)}-${team.team}`,
    conference,
  }));
}

/**
 * Reorder an array by moving an item from one index to another
 *
 * Used for drag-and-drop reordering in What-If mode.
 *
 * @param list - Original array
 * @param startIndex - Index of item to move
 * @param endIndex - Destination index
 * @returns New array with item moved
 *
 * @example
 * ```ts
 * const teams = ['Lakers', 'Clippers', 'Warriors'];
 * reorderList(teams, 0, 2)
 * // => ['Clippers', 'Warriors', 'Lakers']
 * ```
 */
export function reorderList<T>(
  list: T[],
  startIndex: number,
  endIndex: number
): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

/**
 * Generate a team slug for image URLs
 *
 * Converts team name to lowercase, removes special characters,
 * and replaces spaces with hyphens.
 *
 * @param teamName - Full team name
 * @returns URL-safe team slug
 *
 * @example
 * ```ts
 * teamSlug('Los Angeles Lakers') // => 'los-angeles-lakers'
 * teamSlug("Portland Trail Blazers") // => 'portland-trail-blazers'
 * ```
 */
export function teamSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
