/**
 * SortDropdown component
 *
 * Dropdown select for changing leaderboard sort order.
 *
 * @module features/leaderboard/components/controls/SortDropdown
 */

import React from 'react';
import type { SortOption } from '../../types/leaderboard';

interface SortDropdownProps {
  /** Current sort option */
  sortBy: SortOption;

  /** Callback when sort option changes */
  onSortChange: (sortBy: SortOption) => void;
}

/**
 * Sort option configurations
 */
const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'standings', label: 'Standings pts' },
  { value: 'total', label: 'Total pts' },
  { value: 'name', label: 'Name' },
];

/**
 * SortDropdown component
 *
 * Select dropdown for sorting leaderboard by different criteria.
 *
 * @param props - Component props
 * @returns Rendered sort dropdown
 */
export function SortDropdown({
  sortBy,
  onSortChange,
}: SortDropdownProps): React.ReactElement {
  return (
    <select
      className="text-xs font-medium border border-slate-200/60 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300 transition-colors flex-1 md:flex-initial hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
      value={sortBy}
      onChange={(e) => onSortChange(e.target.value as SortOption)}
    >
      {SORT_OPTIONS.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
