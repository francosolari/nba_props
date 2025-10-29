/**
 * WhatIfToggle component
 *
 * Checkbox toggle for enabling/disabling What-If simulation mode.
 *
 * @module features/leaderboard/components/controls/WhatIfToggle
 */

import React from 'react';

interface WhatIfToggleProps {
  /** Whether What-If mode is enabled */
  enabled: boolean;

  /** Whether the toggle is disabled (only works in standings section) */
  disabled?: boolean;

  /** Current section (used for conditional styling) */
  isStandingsSection: boolean;

  /** Callback when toggle changes */
  onToggle: (enabled: boolean) => void;
}

/**
 * WhatIfToggle component
 *
 * Labeled checkbox for enabling What-If simulation mode. Only enabled
 * in the standings section.
 *
 * @param props - Component props
 * @returns Rendered What-If toggle
 */
export function WhatIfToggle({
  enabled,
  disabled = false,
  isStandingsSection,
  onToggle,
}: WhatIfToggleProps): React.ReactElement {
  const isActive = enabled && isStandingsSection;

  const labelClasses = `inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-all whitespace-nowrap ${
    isStandingsSection
      ? isActive
        ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
        : 'bg-white text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700'
      : 'bg-slate-100 text-slate-400 border-slate-200/60 cursor-not-allowed dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700/50'
  }`;

  const tooltipText = isStandingsSection
    ? 'Simulate by dragging rows in the grid'
    : 'What‑If available in Regular Season Standings tab';

  return (
    <label className={labelClasses} title={tooltipText}>
      <input
        type="checkbox"
        className="accent-slate-700 dark:accent-slate-200 w-3 h-3"
        checked={isActive}
        onChange={(e) => onToggle(e.target.checked)}
        disabled={disabled || !isStandingsSection}
      />
      What‑If
    </label>
  );
}
