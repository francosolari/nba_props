/**
 * Main state management hook for LeaderboardDetailPage
 *
 * Consolidates all primary state variables for the leaderboard detail view,
 * including section selection, mode, filters, and UI state.
 *
 * @module features/leaderboard/hooks/useLeaderboardState
 */

import { useState, useCallback } from 'react';
import type { Section, Mode, SortOption } from '../types/leaderboard';

/**
 * State returned by useLeaderboardState hook
 */
export interface LeaderboardState {
  /** Current active section */
  section: Section;
  setSection: (section: Section) => void;

  /** Display mode (showcase or compare) */
  mode: Mode;
  setMode: (mode: Mode) => void;

  /** Whether to show all users or only selected ones */
  showAll: boolean;
  setShowAll: (showAll: boolean) => void;

  /** Sort criterion */
  sortBy: SortOption;
  setSortBy: (sortBy: SortOption) => void;

  /** Search query for filtering users */
  query: string;
  setQuery: (query: string) => void;

  /** Whether What-If mode is enabled */
  whatIfEnabled: boolean;
  setWhatIfEnabled: (enabled: boolean) => void;

  /** Whether to show What-If confirmation modal */
  showWhatIfConfirm: boolean;
  setShowWhatIfConfirm: (show: boolean) => void;

  /** Whether west conference is collapsed (mobile) */
  collapsedWest: boolean;
  setCollapsedWest: (collapsed: boolean | ((prev: boolean) => boolean)) => void;

  /** Whether east conference is collapsed (mobile) */
  collapsedEast: boolean;
  setCollapsedEast: (collapsed: boolean | ((prev: boolean) => boolean)) => void;

  /** Whether to show manage players modal */
  showManagePlayers: boolean;
  setShowManagePlayers: (show: boolean) => void;

  /** Search query for manage players modal */
  manageQuery: string;
  setManageQuery: (query: string) => void;

  /** ID of user whose pin button is pulsing (animation feedback) */
  pinPulseId: string | null;
  setPinPulseId: (id: string | null) => void;

  /** Whether to show mobile drag tooltip */
  showMobileDragTooltip: boolean;
  dismissMobileDragTooltip: () => void;

  /** Currently selected season slug */
  selectedSeason: string;
  setSelectedSeason: (season: string) => void;
}

/**
 * Options for initializing leaderboard state
 */
export interface LeaderboardStateOptions {
  /** Initial section to display */
  initialSection?: Section;

  /** Initial season slug */
  initialSeasonSlug?: string;
}

/**
 * Main state management hook for LeaderboardDetailPage
 *
 * Provides centralized state management for all UI state variables including
 * section selection, display mode, filters, and UI flags.
 *
 * @param options - Initialization options
 * @returns State object with all state variables and setters
 *
 * @example
 * ```tsx
 * const state = useLeaderboardState({
 *   initialSection: 'standings',
 *   initialSeasonSlug: '2024-25'
 * });
 *
 * // Use state values
 * <Button onClick={() => state.setSection('awards')}>Awards</Button>
 * ```
 */
export function useLeaderboardState(
  options: LeaderboardStateOptions = {}
): LeaderboardState {
  const { initialSection = 'standings', initialSeasonSlug = 'current' } = options;

  // Section and mode state
  const [section, setSection] = useState<Section>(initialSection);
  const [mode, setMode] = useState<Mode>('compare');
  const [selectedSeason, setSelectedSeason] = useState(initialSeasonSlug);

  // Filter state
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('standings');
  const [query, setQuery] = useState('');

  // What-If mode state
  const [whatIfEnabled, setWhatIfEnabled] = useState(false);
  const [showWhatIfConfirm, setShowWhatIfConfirm] = useState(false);

  // Collapse state (for mobile/desktop conference sections)
  const [collapsedWest, setCollapsedWest] = useState(false);
  const [collapsedEast, setCollapsedEast] = useState(false);

  // Modal and UI state
  const [showManagePlayers, setShowManagePlayers] = useState(false);
  const [manageQuery, setManageQuery] = useState('');
  const [pinPulseId, setPinPulseId] = useState<string | null>(null);

  // Mobile drag tooltip (one-time tip for users)
  const [showMobileDragTooltip, setShowMobileDragTooltip] = useState(() => {
    try {
      return !localStorage.getItem('nba-mobile-drag-tooltip-seen');
    } catch {
      return true;
    }
  });

  const dismissMobileDragTooltip = useCallback(() => {
    setShowMobileDragTooltip(false);
    try {
      localStorage.setItem('nba-mobile-drag-tooltip-seen', 'true');
    } catch {
      // localStorage not available
    }
  }, []);

  return {
    section,
    setSection,
    mode,
    setMode,
    showAll,
    setShowAll,
    sortBy,
    setSortBy,
    query,
    setQuery,
    whatIfEnabled,
    setWhatIfEnabled,
    showWhatIfConfirm,
    setShowWhatIfConfirm,
    collapsedWest,
    setCollapsedWest,
    collapsedEast,
    setCollapsedEast,
    showManagePlayers,
    setShowManagePlayers,
    manageQuery,
    setManageQuery,
    pinPulseId,
    setPinPulseId,
    showMobileDragTooltip,
    dismissMobileDragTooltip,
    selectedSeason,
    setSelectedSeason,
  };
}
