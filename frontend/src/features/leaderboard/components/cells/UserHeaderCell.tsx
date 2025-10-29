/**
 * UserHeaderCell component
 *
 * Renders a user column header in the comparison grid with:
 * - Username/display name
 * - Pin/unpin button
 * - Remove button (when not showing all users)
 * - Category points and total points
 * - Visual pin pulse animation
 *
 * @module features/leaderboard/components/cells/UserHeaderCell
 */

import React from 'react';
import type { User } from '../../types/leaderboard';
import { Pin, PinOff, X } from 'lucide-react';

interface UserHeaderCellProps {
  /** User data */
  user: User;

  /** Category key to display points for */
  categoryKey: string;

  /** Whether this column is pinned */
  isPinned: boolean;

  /** Whether this user's pin button should pulse (animation feedback) */
  shouldPulse: boolean;

  /** Whether to show all users (hides remove button if true) */
  showAll: boolean;

  /** Callback when pin button is clicked */
  onTogglePin: () => void;

  /** Callback when remove button is clicked */
  onRemove: () => void;

  /** Column index for sticky positioning */
  columnIndex: number;

  /** Width of column before this one (for sticky positioning) */
  leftOffset: number;
}

/**
 * UserHeaderCell component
 *
 * Displays a user's column header with controls for pinning and removing
 * from the comparison view.
 *
 * @param props - Component props
 * @returns Rendered table header cell
 */
export function UserHeaderCell({
  user,
  categoryKey,
  isPinned,
  shouldPulse,
  showAll,
  onTogglePin,
  onRemove,
  leftOffset,
}: UserHeaderCellProps): React.ReactElement {
  const catPts = user.categories?.[categoryKey]?.points || 0;
  const totalPts = user.total_points || 0;
  const displayName = user.display_name || user.username;

  const stickyStyles = isPinned
    ? {
        left: `${leftOffset}px`,
        minWidth: '160px',
        width: '160px',
      }
    : {
        minWidth: '160px',
        width: '160px',
      };

  const cellClasses = `px-2.5 py-2.5 text-center text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 align-top transition-all duration-200 ${
    isPinned
      ? 'sticky z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm'
      : ''
  }`;

  return (
    <th className={cellClasses} style={stickyStyles}>
      {/* Username and controls */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="truncate max-w-[80px]" title={displayName}>
          {displayName}
        </span>

        <div className="flex items-center gap-1">
          {/* Pin/Unpin button */}
          <button
            onClick={onTogglePin}
            title={isPinned ? 'Unpin column' : 'Pin column'}
            className={`transition-all duration-200 ${
              isPinned
                ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            } ${shouldPulse ? 'pin-pulse' : ''}`}
          >
            {isPinned ? (
              <Pin className="w-3.5 h-3.5" />
            ) : (
              <PinOff className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Remove button (hidden when showing all users) */}
          {!showAll && (
            <button
              onClick={onRemove}
              title="Remove from comparison"
              className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Points indicators */}
      <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
        {/* Category points */}
        <span
          className="inline-flex items-center justify-center gap-1"
          title={`${categoryKey} points`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {catPts}
        </span>

        {/* Total points */}
        <span
          className="inline-flex items-center justify-center gap-1"
          title="Total points"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          {totalPts}
        </span>
      </div>
    </th>
  );
}
