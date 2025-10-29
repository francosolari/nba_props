/**
 * Utility functions for filtering and sorting leaderboard users
 *
 * This module provides pure functions for:
 * - Filtering users by search query
 * - Sorting users by different criteria
 * - Managing pinned users
 *
 * @module features/leaderboard/utils/filtering
 */

import type { LeaderboardEntry, SortOption } from '../types/leaderboard';
import { CATEGORY_KEYS } from './constants';

/**
 * Options for filtering and sorting leaderboard entries
 */
export interface FilterOptions {
  /** Search query to filter by username/display name */
  query?: string;

  /** Sort criterion */
  sortBy: SortOption;

  /** User IDs that should appear first (pinned) */
  pinnedUserIds: Array<string | number>;

  /** Whether to show all users or just selected ones */
  showAll: boolean;

  /** Selected user IDs to display (when showAll is false) */
  selectedUserIds: Array<string | number>;
}

/**
 * Get display name for a leaderboard entry
 *
 * Falls back to username if display_name is not set.
 *
 * @param entry - Leaderboard entry
 * @returns Display name for the user
 */
export function getDisplayName(entry: LeaderboardEntry): string {
  return entry.user.display_name || entry.user.username;
}

/**
 * Filter and sort leaderboard entries based on provided options
 *
 * Applies the following transformations in order:
 * 1. Filter by showAll/selectedUserIds
 * 2. Filter by search query
 * 3. Sort by chosen criterion
 * 4. Move pinned users to the top
 *
 * @param users - All leaderboard entries
 * @param options - Filtering and sorting options
 * @returns Filtered and sorted array of entries
 *
 * @example
 * ```ts
 * const displayed = filterAndSortUsers(allUsers, {
 *   query: 'john',
 *   sortBy: 'total',
 *   pinnedUserIds: ['123'],
 *   showAll: false,
 *   selectedUserIds: ['123', '456']
 * });
 * ```
 */
export function filterAndSortUsers(
  users: LeaderboardEntry[],
  options: FilterOptions
): LeaderboardEntry[] {
  let result: LeaderboardEntry[];

  // Step 1: Filter by selection
  if (options.showAll) {
    result = [...users];
  } else {
    const selectedSet = new Set(
      options.selectedUserIds.map((id) => String(id))
    );
    result = users.filter((entry) => selectedSet.has(String(entry.user.id)));
  }

  // Step 2: Filter by search query
  if (options.query && options.query.trim()) {
    const queryLower = options.query.toLowerCase();
    result = result.filter((entry) =>
      getDisplayName(entry).toLowerCase().includes(queryLower)
    );
  }

  // Step 3: Sort by chosen criterion
  result = sortUsers(result, options.sortBy);

  // Step 4: Move pinned users to the top
  const pinnedSet = new Set(options.pinnedUserIds.map((id) => String(id)));
  result.sort((a, b) => {
    const aIsPinned = pinnedSet.has(String(a.user.id));
    const bIsPinned = pinnedSet.has(String(b.user.id));

    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return 0;
  });

  return result;
}

/**
 * Sort leaderboard entries by a given criterion
 *
 * @param users - Entries to sort (will not mutate original)
 * @param sortBy - Sort option
 * @returns New sorted array
 */
function sortUsers(
  users: LeaderboardEntry[],
  sortBy: SortOption
): LeaderboardEntry[] {
  const result = [...users];

  switch (sortBy) {
    case 'total':
      result.sort(
        (a, b) => (b.user.total_points || 0) - (a.user.total_points || 0)
      );
      break;

    case 'standings':
      result.sort((a, b) => {
        const aStandPts =
          a.user.categories?.[CATEGORY_KEYS.STANDINGS]?.points || 0;
        const bStandPts =
          b.user.categories?.[CATEGORY_KEYS.STANDINGS]?.points || 0;
        return bStandPts - aStandPts;
      });
      break;

    case 'name':
      result.sort((a, b) =>
        getDisplayName(a).localeCompare(getDisplayName(b))
      );
      break;

    default:
      // No sorting
      break;
  }

  return result;
}

/**
 * Toggle a user ID in a pinned users array
 *
 * If the ID is present, removes it. If not present, adds it.
 *
 * @param pinnedUserIds - Current pinned user IDs
 * @param userId - User ID to toggle
 * @returns New array with user toggled
 */
export function togglePinnedUser(
  pinnedUserIds: Array<string | number>,
  userId: string | number
): Array<string | number> {
  const userIdStr = String(userId);
  const currentlyPinned = pinnedUserIds
    .map((id) => String(id))
    .includes(userIdStr);

  if (currentlyPinned) {
    return pinnedUserIds.filter((id) => String(id) !== userIdStr);
  } else {
    return [...pinnedUserIds, userId];
  }
}

/**
 * Add a user ID to selected users array if not already present
 *
 * @param selectedUserIds - Current selected user IDs
 * @param userId - User ID to add
 * @returns New array with user added
 */
export function addSelectedUser(
  selectedUserIds: Array<string | number>,
  userId: string | number
): Array<string | number> {
  const userIdStr = String(userId);
  const alreadySelected = selectedUserIds
    .map((id) => String(id))
    .includes(userIdStr);

  if (alreadySelected) {
    return selectedUserIds;
  }

  return [...selectedUserIds, userId];
}

/**
 * Remove a user ID from selected users array
 *
 * @param selectedUserIds - Current selected user IDs
 * @param userId - User ID to remove
 * @returns New array without the user
 */
export function removeSelectedUser(
  selectedUserIds: Array<string | number>,
  userId: string | number
): Array<string | number> {
  const userIdStr = String(userId);
  return selectedUserIds.filter((id) => String(id) !== userIdStr);
}
