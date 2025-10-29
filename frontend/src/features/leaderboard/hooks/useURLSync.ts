/**
 * URL parameter synchronization hook
 *
 * Syncs leaderboard state with URL query parameters for shareable links
 * and browser back/forward navigation.
 *
 * @module features/leaderboard/hooks/useURLSync
 */

import { useEffect, useRef } from 'react';
import type { Section, Mode, SortOption } from '../types/leaderboard';

/**
 * State to sync with URL
 */
export interface URLSyncState {
  /** Current section */
  section: Section;

  /** Display mode */
  mode: Mode;

  /** Selected user IDs */
  selectedUserIds: Array<string | number>;

  /** Sort criterion */
  sortBy: SortOption;

  /** Search query */
  query: string;

  /** Whether What-If mode is enabled */
  whatIfEnabled: boolean;

  /** Whether showing all users */
  showAll: boolean;
}

/**
 * Actions to update state from URL
 */
export interface URLSyncActions {
  setSection: (section: Section) => void;
  setMode: (mode: Mode) => void;
  setSelectedUserIds: (ids: Array<string | number>) => void;
  setSortBy: (sortBy: SortOption) => void;
  setQuery: (query: string) => void;
  setWhatIfEnabled: (enabled: boolean) => void;
  setShowAll: (showAll: boolean) => void;
}

/**
 * Options for URL synchronization
 */
export interface URLSyncOptions {
  /** State to sync */
  state: URLSyncState;

  /** Actions to update state */
  actions: URLSyncActions;

  /** Whether to enable synchronization (default: true) */
  enabled?: boolean;
}

/**
 * URL parameter synchronization hook
 *
 * Automatically reads state from URL on mount and writes state changes
 * to URL params for shareable links and browser navigation.
 *
 * Query parameters:
 * - `section` - Current section (standings/awards/props)
 * - `mode` - Display mode (showcase/compare)
 * - `users` - Comma-separated list of selected user IDs
 * - `user` - Single user ID (for backward compatibility)
 * - `sortBy` - Sort criterion
 * - `q` - Search query
 * - `wi` - What-If mode (1 = enabled, 0 = disabled)
 * - `all` - Show all users (1 = yes, 0 = no)
 *
 * @param options - Sync options
 *
 * @example
 * ```tsx
 * const state = useLeaderboardState();
 * const userMgmt = useUserManagement();
 *
 * // Sync state with URL
 * useURLSync({
 *   state: {
 *     section: state.section,
 *     mode: state.mode,
 *     selectedUserIds: userMgmt.selectedUserIds,
 *     sortBy: state.sortBy,
 *     query: state.query,
 *     whatIfEnabled: state.whatIfEnabled,
 *     showAll: state.showAll
 *   },
 *   actions: {
 *     setSection: state.setSection,
 *     setMode: state.setMode,
 *     setSelectedUserIds: userMgmt.setSelectedUserIds,
 *     setSortBy: state.setSortBy,
 *     setQuery: state.setQuery,
 *     setWhatIfEnabled: state.setWhatIfEnabled,
 *     setShowAll: state.setShowAll
 *   }
 * });
 * ```
 */
export function useURLSync(options: URLSyncOptions): void {
  const { state, actions, enabled = true } = options;
  const didReadUrlRef = useRef(false);

  // Read from URL once on mount
  useEffect(() => {
    if (!enabled) return;
    if (didReadUrlRef.current) return;

    try {
      const sp = new URLSearchParams(window.location.search);

      // Section
      const sec = sp.get('section');
      if (sec && ['standings', 'awards', 'props'].includes(sec)) {
        actions.setSection(sec as Section);
      }

      // Users (comma-separated list)
      const usersParam = sp.get('users');
      if (usersParam) {
        actions.setSelectedUserIds(usersParam.split(',').filter(Boolean));
      }

      // Single user (backward compatibility)
      const singleUser = sp.get('user');
      if (singleUser && !usersParam) {
        actions.setSelectedUserIds([String(singleUser)]);
      }

      // Mode
      const m = sp.get('mode');
      if (m && ['showcase', 'compare'].includes(m)) {
        actions.setMode(m as Mode);
      }

      // Sort
      const srt = sp.get('sortBy');
      if (srt) {
        actions.setSortBy(srt as SortOption);
      }

      // Query
      const q = sp.get('q');
      if (q) {
        actions.setQuery(q);
      }

      // What-If
      const wi = sp.get('wi');
      if (wi === '1') {
        actions.setWhatIfEnabled(true);
      }

      // Show All
      const all = sp.get('all');
      if (all === '1') {
        actions.setShowAll(true);
      }

      didReadUrlRef.current = true;
    } catch (error) {
      console.error('Failed to read URL parameters:', error);
    }
  }, [enabled, actions]);

  // Write to URL whenever state changes
  useEffect(() => {
    if (!enabled) return;
    if (!didReadUrlRef.current) return; // Don't write before initial read

    try {
      const sp = new URLSearchParams(window.location.search);

      // Section
      sp.set('section', state.section);

      // Mode
      sp.set('mode', state.mode);

      // Users
      if (state.selectedUserIds.length > 0) {
        sp.set('users', state.selectedUserIds.join(','));
      } else {
        sp.delete('users');
      }

      // Backward compatibility: single user param
      if (state.selectedUserIds.length === 1) {
        sp.set('user', String(state.selectedUserIds[0]));
      } else {
        sp.delete('user');
      }

      // Sort
      sp.set('sortBy', state.sortBy);

      // Query
      if (state.query) {
        sp.set('q', state.query);
      } else {
        sp.delete('q');
      }

      // What-If
      sp.set('wi', state.whatIfEnabled ? '1' : '0');

      // Show All
      sp.set('all', state.showAll ? '1' : '0');

      // Update URL without reloading page
      const url = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState(null, '', url);
    } catch (error) {
      console.error('Failed to write URL parameters:', error);
    }
  }, [
    enabled,
    state.section,
    state.mode,
    state.selectedUserIds,
    state.sortBy,
    state.query,
    state.whatIfEnabled,
    state.showAll,
  ]);
}
