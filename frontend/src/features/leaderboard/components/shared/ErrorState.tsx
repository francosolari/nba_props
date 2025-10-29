/**
 * Error state component for leaderboard
 *
 * Displays an error message when data fetching fails.
 *
 * @module features/leaderboard/components/shared/ErrorState
 */

import React from 'react';

interface ErrorStateProps {
  /** Error message or Error object to display */
  error: string | Error | unknown;
}

/**
 * Error state component
 *
 * @param props - Component props
 * @returns Error UI with centered error message
 */
export function ErrorState({ error }: ErrorStateProps): React.ReactElement {
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center text-rose-600 dark:text-rose-400">
      {errorMessage}
    </div>
  );
}
