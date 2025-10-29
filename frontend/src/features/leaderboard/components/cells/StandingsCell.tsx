/**
 * StandingsCell component
 *
 * Renders a single cell in the standings comparison grid showing:
 * - User's predicted position
 * - Points earned (color-coded)
 * - Visual indicators for correctness
 *
 * @module features/leaderboard/components/cells/StandingsCell
 */

import React from 'react';
import type { Prediction, User } from '../../types/leaderboard';
import { standingPoints } from '../../utils/standings';
import { CATEGORY_KEYS } from '../../utils/constants';

interface StandingsCellProps {
  /** User whose prediction to display */
  user: User;

  /** Team name for this row */
  team: string;

  /** Whether What-If mode is enabled */
  whatIfEnabled: boolean;

  /** Simulated position (if What-If mode) */
  simPosition?: number | null;

  /** Actual position in standings */
  actualPosition?: number | null;

  /** Whether this user's column is pinned */
  isPinned?: boolean;

  /** Column index for sticky positioning */
  columnIndex?: number;

  /** Width of columns before this one (for sticky positioning) */
  leftOffset?: number;
}

/**
 * Get color classes based on points earned
 */
function getPointColorClasses(points: number): string {
  if (points >= 3) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
  }
  if (points >= 1) {
    return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
}

/**
 * StandingsCell component
 *
 * Displays a user's standings prediction for a specific team with
 * color-coded point indicators.
 *
 * @param props - Component props
 * @returns Rendered table cell
 */
export function StandingsCell({
  user,
  team,
  whatIfEnabled,
  simPosition,
  actualPosition,
  isPinned = false,
  leftOffset = 0,
}: StandingsCellProps): React.ReactElement {
  // Find the user's prediction for this team
  const predictions =
    user.categories?.[CATEGORY_KEYS.STANDINGS]?.predictions || [];
  const prediction = predictions.find((p) => p.team === team);

  // Calculate points
  const points = whatIfEnabled
    ? standingPoints(prediction?.predicted_position, simPosition)
    : (prediction?.points || 0);

  const predictedPosition = prediction?.predicted_position ?? '—';
  const colorClasses = getPointColorClasses(points);

  // Sticky positioning styles for pinned columns
  const stickyStyles = isPinned
    ? {
        left: `${leftOffset}px`,
        minWidth: '108px',
        width: '108px',
      }
    : {
        minWidth: '108px',
        width: '108px',
      };

  const cellClasses = `px-2.5 py-2.5 text-center text-xs border-b border-slate-100 dark:border-slate-700/50 transition-all duration-200 ${
    isPinned
      ? 'sticky z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm'
      : ''
  }`;

  return (
    <td className={cellClasses} style={stickyStyles}>
      <div className="flex justify-center">
        <div className="relative inline-block group">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-all ${colorClasses}`}
          >
            {predictedPosition}
            {points > 0 && (
              <span className="text-[10px] font-bold">+{points}</span>
            )}
          </span>

          {/* Tooltip on hover */}
          {prediction && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
              Predicted: {predictedPosition}
              {whatIfEnabled && simPosition && ` • Sim: ${simPosition}`}
              {!whatIfEnabled && actualPosition && ` • Actual: ${actualPosition}`}
              {' • '}+{points}pts
            </div>
          )}
        </div>
      </div>
    </td>
  );
}
