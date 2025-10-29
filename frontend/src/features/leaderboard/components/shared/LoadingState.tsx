/**
 * Loading state component for leaderboard
 *
 * Displays a centered loading message while data is being fetched.
 *
 * @module features/leaderboard/components/shared/LoadingState
 */

import React from 'react';

/**
 * Loading state component
 *
 * @returns Loading UI with centered spinner/message
 */
export function LoadingState(): React.ReactElement {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center text-slate-500 dark:text-slate-400">
      Loading…
    </div>
  );
}
