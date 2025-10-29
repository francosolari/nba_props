/**
 * Leaderboard hooks barrel export
 *
 * Central export point for all leaderboard-related custom hooks.
 *
 * @module features/leaderboard/hooks
 */

export {
  useLeaderboardState,
  type LeaderboardState,
  type LeaderboardStateOptions,
} from './useLeaderboardState';

export {
  useUserManagement,
  type UserManagementState,
  type UserManagementOptions,
} from './useUserManagement';

export {
  useWhatIfSimulation,
  type WhatIfSimulationState,
  type WhatIfSimulationOptions,
  type DragEndResult,
} from './useWhatIfSimulation';

export {
  useURLSync,
  type URLSyncState,
  type URLSyncActions,
  type URLSyncOptions,
} from './useURLSync';

export {
  useMobileSticky,
  type MobileStickyState,
  type MobileStickyOptions,
} from './useMobileSticky';
