/**
 * ShowAllToggle component
 *
 * Button toggle for switching between showing selected users and all users.
 *
 * @module features/leaderboard/components/controls/ShowAllToggle
 */

import React from 'react';
import { Expand, Minimize2 } from 'lucide-react';

interface ShowAllToggleProps {
  /** Whether showing all users */
  showAll: boolean;

  /** Callback when toggle changes */
  onToggle: () => void;
}

/**
 * ShowAllToggle component
 *
 * Button that toggles between showing all users or only selected users
 * in the comparison grid.
 *
 * @param props - Component props
 * @returns Rendered toggle button
 */
export function ShowAllToggle({
  showAll,
  onToggle,
}: ShowAllToggleProps): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      className={`text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${
        showAll
          ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500'
          : 'border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300'
      }`}
    >
      {showAll ? (
        <Minimize2 className="w-3.5 h-3.5" />
      ) : (
        <Expand className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline">{showAll ? 'Selected' : 'All'}</span>
    </button>
  );
}
