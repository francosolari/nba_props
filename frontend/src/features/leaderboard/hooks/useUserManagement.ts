/**
 * User selection and pinning management hook
 *
 * Handles user selection, pinning/unpinning, and related state management
 * for the leaderboard comparison view.
 *
 * @module features/leaderboard/hooks/useUserManagement
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LeaderboardEntry } from '../types/leaderboard';

/**
 * State returned by useUserManagement hook
 */
export interface UserManagementState {
  /** Array of selected user IDs to display */
  selectedUserIds: Array<string | number>;

  /** Array of pinned user IDs (always shown first) */
  pinnedUserIds: Array<string | number>;

  /** Add a user to selection */
  addUser: (userId: string | number) => void;

  /** Remove a user from selection */
  removeUser: (userId: string | number) => void;

  /** Toggle pin status for a user */
  togglePin: (userId: string | number) => void;

  /** Replace all selected users */
  setSelectedUserIds: React.Dispatch<
    React.SetStateAction<Array<string | number>>
  >;

  /** Replace all pinned users */
  setPinnedUserIds: React.Dispatch<React.SetStateAction<Array<string | number>>>;

  /** Map of user ID to LeaderboardEntry for quick lookups */
  usersMap: Map<string, LeaderboardEntry>;

  /** Primary user ID (first selected user for showcase mode) */
  primaryUserId: string;

  /** Primary user entry */
  primaryUser: LeaderboardEntry | undefined;

  /** Logged-in user's entry (if available) */
  loggedInEntry: LeaderboardEntry | undefined;

  /** Logged-in user's ID (if available) */
  loggedInUserId: string | null;
}

/**
 * Options for initializing user management
 */
export interface UserManagementOptions {
  /** Initial user ID to select */
  initialUserId?: string;

  /** Username of logged-in user */
  loggedInUsername?: string | null;

  /** All leaderboard entries */
  leaderboardData?: LeaderboardEntry[];
}

/**
 * User selection and pinning management hook
 *
 * Manages selected users, pinned users, and provides utilities for
 * adding/removing users and toggling pin status.
 *
 * Automatically handles:
 * - Auto-selecting top 4 users on initial load
 * - Auto-pinning logged-in user
 * - Preventing duplicate selections
 *
 * @param options - Initialization options
 * @returns User management state and actions
 *
 * @example
 * ```tsx
 * const userMgmt = useUserManagement({
 *   initialUserId: '123',
 *   loggedInUsername: 'john_doe',
 *   leaderboardData: entries
 * });
 *
 * // Add a user to selection
 * <Button onClick={() => userMgmt.addUser('456')}>Add User</Button>
 *
 * // Toggle pin
 * <Button onClick={() => userMgmt.togglePin('456')}>
 *   {userMgmt.pinnedUserIds.includes('456') ? 'Unpin' : 'Pin'}
 * </Button>
 * ```
 */
export function useUserManagement(
  options: UserManagementOptions = {}
): UserManagementState {
  const { initialUserId = '', loggedInUsername = null, leaderboardData = [] } = options;

  // Initialize with top 4 users + initial user ID
  const [selectedUserIds, setSelectedUserIds] = useState<Array<string | number>>(() => {
    const top = leaderboardData.slice(0, 4).map((e) => String(e.user.id));
    return Array.from(new Set([initialUserId, ...top])).filter(Boolean);
  });

  const [pinnedUserIds, setPinnedUserIds] = useState<Array<string | number>>([]);

  // Create map of user ID to entry for O(1) lookups
  const usersMap = useMemo(() => {
    const m = new Map<string, LeaderboardEntry>();
    leaderboardData.forEach((e) => m.set(String(e.user.id), e));
    return m;
  }, [leaderboardData]);

  // Primary user for showcase mode (first selected user)
  const primaryUserId = useMemo(() => {
    if (selectedUserIds && selectedUserIds.length > 0) {
      return String(selectedUserIds[0]);
    }
    if (leaderboardData && leaderboardData.length > 0) {
      return String(leaderboardData[0].user.id);
    }
    return '';
  }, [selectedUserIds, leaderboardData]);

  const primaryUser = primaryUserId ? usersMap.get(primaryUserId) : undefined;

  // Resolve logged-in user
  const loggedInEntry = useMemo(() => {
    if (!loggedInUsername) return undefined;
    return leaderboardData.find(
      (e) => String(e.user.username) === String(loggedInUsername)
    );
  }, [leaderboardData, loggedInUsername]);

  const loggedInUserId = loggedInEntry?.user?.id
    ? String(loggedInEntry.user.id)
    : null;

  // Auto-pin and include logged-in user by default
  useEffect(() => {
    if (!loggedInUserId) return;

    // Auto-pin logged-in user
    setPinnedUserIds((prev) =>
      prev.includes(loggedInUserId) ? prev : [...prev, loggedInUserId]
    );

    // Auto-select logged-in user (unless URL specified users)
    try {
      const sp = new URLSearchParams(window.location.search);
      const usersParam = sp.get('users');
      if (!usersParam) {
        setSelectedUserIds((prev) =>
          prev.map(String).includes(loggedInUserId)
            ? prev
            : [loggedInUserId, ...prev]
        );
      }
    } catch {
      // URL parsing failed, ignore
    }
  }, [loggedInUserId]);

  // Fallback: if no logged-in user but we have an initialUserId, pin/select it
  useEffect(() => {
    if (loggedInUserId) return; // Primary handler above takes precedence
    if (!initialUserId) return;

    const id = String(initialUserId);
    setPinnedUserIds((prev) =>
      prev.map(String).includes(id) ? prev : [...prev, id]
    );

    try {
      const sp = new URLSearchParams(window.location.search);
      const usersParam = sp.get('users');
      if (!usersParam) {
        setSelectedUserIds((prev) =>
          prev.map(String).includes(id) ? prev : [id, ...prev]
        );
      }
    } catch {
      // URL parsing failed, ignore
    }
  }, [loggedInUserId, initialUserId]);

  // Add user to selection
  const addUser = useCallback((userId: string | number) => {
    if (!userId) return;
    setSelectedUserIds((prev) =>
      Array.from(new Set([...prev, String(userId)]))
    );
  }, []);

  // Remove user from selection
  const removeUser = useCallback((userId: string | number) => {
    if (!userId) return;
    setSelectedUserIds((prev) =>
      prev.filter((id) => String(id) !== String(userId))
    );
  }, []);

  // Toggle pin status
  const togglePin = useCallback((userId: string | number) => {
    if (!userId) return;
    const userIdStr = String(userId);
    setPinnedUserIds((prev) =>
      prev.includes(userIdStr)
        ? prev.filter((id) => String(id) !== userIdStr)
        : [...prev, userIdStr]
    );
  }, []);

  return {
    selectedUserIds,
    pinnedUserIds,
    addUser,
    removeUser,
    togglePin,
    setSelectedUserIds,
    setPinnedUserIds,
    usersMap,
    primaryUserId,
    primaryUser,
    loggedInEntry,
    loggedInUserId,
  };
}
