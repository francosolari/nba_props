/**
 * TeamRowHeader component
 *
 * Renders the team name and position in the standings grid as a sticky
 * left column header.
 *
 * @module features/leaderboard/components/cells/TeamRowHeader
 */

import React from 'react';
import type { StandingsTeam } from '../../types/leaderboard';
import { teamSlug } from '../../utils/standings';

interface TeamRowHeaderProps {
  /** Team data */
  team: StandingsTeam;

  /** Current position (actual or simulated) */
  position: number | null;

  /** Row index for striping */
  rowIndex: number;

  /** Whether What-If mode is enabled (shows visual indicator if position changed) */
  whatIfEnabled?: boolean;

  /** Original actual position (for detecting What-If changes) */
  actualPosition?: number | null;
}

/**
 * TeamRowHeader component
 *
 * Displays team information in the first column of the standings grid.
 * Shows team logo, name, and position with visual indicators for What-If changes.
 *
 * @param props - Component props
 * @returns Rendered table cell
 */
export function TeamRowHeader({
  team,
  position,
  rowIndex,
  whatIfEnabled = false,
  actualPosition,
}: TeamRowHeaderProps): React.ReactElement {
  const isChanged =
    whatIfEnabled && actualPosition != null && position !== actualPosition;

  const rowBg =
    rowIndex % 2 === 0
      ? 'bg-white/95 dark:bg-slate-800/95'
      : 'bg-white/80 dark:bg-slate-800/80';

  const slug = teamSlug(team.team);

  return (
    <td
      className={`sticky left-0 z-20 ${rowBg} backdrop-blur-sm px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 transition-colors`}
      style={{ minWidth: '160px', width: '160px' }}
    >
      <div className="flex items-center gap-2.5">
        {/* Position number */}
        <span
          className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded ${
            isChanged
              ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/30 dark:text-amber-300 dark:border-amber-500/50'
              : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
          }`}
          title={isChanged ? `Changed from ${actualPosition}` : undefined}
        >
          {position ?? '—'}
        </span>

        {/* Team logo */}
        <img
          src={`/static/img/teams/${slug}.png`}
          alt={team.team}
          className="w-6 h-6 object-contain shrink-0"
          onError={(e) => {
            const img = e.currentTarget;
            const step = parseInt(img.dataset.step || '0', 10);

            // Try different file extensions
            if (step === 0) {
              img.dataset.step = '1';
              img.src = `/static/img/teams/${slug}.svg`;
              return;
            }
            if (step === 1) {
              img.dataset.step = '2';
              img.src = `/static/img/teams/${slug}.PNG`;
              return;
            }
            if (step === 2) {
              img.dataset.step = '3';
              img.src = `/static/img/teams/${slug}.SVG`;
              return;
            }

            // Fallback to unknown team icon
            img.onerror = null;
            img.src = '/static/img/teams/unknown.svg';
          }}
        />

        {/* Team name */}
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {team.team}
        </span>
      </div>
    </td>
  );
}
