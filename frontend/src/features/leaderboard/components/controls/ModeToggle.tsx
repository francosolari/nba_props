/**
 * ModeToggle component
 *
 * Toggle buttons for switching between Showcase and Compare modes.
 *
 * @module features/leaderboard/components/controls/ModeToggle
 */

import React from 'react';
import type { Mode } from '../../types/leaderboard';

interface ModeToggleProps {
  /** Currently active mode */
  activeMode: Mode;

  /** Callback when mode changes */
  onModeChange: (mode: Mode) => void;
}

/**
 * ModeToggle component
 *
 * Two-button toggle for switching between Showcase (single user detail)
 * and Compare (multi-user grid) modes.
 *
 * @param props - Component props
 * @returns Rendered mode toggle buttons
 */
export function ModeToggle({
  activeMode,
  onModeChange,
}: ModeToggleProps): React.ReactElement {
  const modes: { key: Mode; label: string }[] = [
    { key: 'showcase', label: 'Showcase' },
    { key: 'compare', label: 'Compare' },
  ];

  return (
    <div className="flex items-center gap-2 w-full md:w-auto">
      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onModeChange(key)}
          className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            activeMode === key
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm dark:bg-emerald-500 dark:border-emerald-500'
              : 'bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50 dark:hover:bg-slate-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
