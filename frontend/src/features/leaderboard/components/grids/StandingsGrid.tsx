/**
 * StandingsGrid component
 *
 * Desktop grid for comparing user standings predictions with:
 * - Drag-and-drop team reordering (What-If mode)
 * - Sticky headers and pinned columns
 * - Color-coded point indicators
 * - Conference sections (West/East)
 *
 * @module features/leaderboard/components/grids/StandingsGrid
 */

import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type {
  LeaderboardEntry,
  OrderedTeam,
  StandingsTeam,
} from '../../types/leaderboard';
import { standingPoints, teamSlug } from '../../utils/standings';
import { Pin, PinOff, X } from 'lucide-react';
import type { DragEndResult } from '../../hooks/useWhatIfSimulation';

interface StandingsGridProps {
  /** Users to display in columns */
  displayedUsers: LeaderboardEntry[];

  /** All standings teams */
  standingsTeams: StandingsTeam[];

  /** West conference team order */
  westOrder: OrderedTeam[];

  /** East conference team order */
  eastOrder: OrderedTeam[];

  /** Whether What-If mode is enabled */
  whatIfEnabled: boolean;

  /** Map of team name to simulated position */
  simActualMap: Map<string, number>;

  /** Pinned user IDs */
  pinnedUserIds: Array<string | number>;

  /** ID of user whose pin button is pulsing */
  pinPulseId: string | null;

  /** Whether showing all users */
  showAll: boolean;

  /** Whether west conference is collapsed */
  collapsedWest: boolean;

  /** Whether east conference is collapsed */
  collapsedEast: boolean;

  /** Drag end handler */
  onDragEnd: (result: DragEndResult) => void;

  /** Toggle pin for a user */
  onTogglePin: (userId: string | number) => void;

  /** Remove user from selection */
  onRemoveUser: (userId: string | number) => void;

  /** Toggle west collapsed state */
  onToggleWestCollapse: () => void;

  /** Toggle east collapsed state */
  onToggleEastCollapse: () => void;
}

const TEAM_COL_WIDTH = 160;

/**
 * StandingsGrid component
 *
 * Full-featured desktop grid for standings comparison with drag-and-drop.
 */
export function StandingsGrid({
  displayedUsers,
  standingsTeams,
  westOrder,
  eastOrder,
  whatIfEnabled,
  simActualMap,
  pinnedUserIds,
  pinPulseId,
  showAll,
  collapsedWest,
  collapsedEast,
  onDragEnd,
  onTogglePin,
  onRemoveUser,
  onToggleWestCollapse,
  onToggleEastCollapse,
}: StandingsGridProps): React.ReactElement {
  return (
    <div className="overflow-auto hidden md:block">
      <table
        className="min-w-full border-t border-slate-200 dark:border-slate-700"
        style={{ tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: `${TEAM_COL_WIDTH}px` }} />
          <col style={{ width: '72px' }} />
          {displayedUsers.map((_, idx) => (
            <col key={`u-${idx}`} style={{ width: '108px' }} />
          ))}
        </colgroup>

        {/* Table Header */}
        <thead className="bg-slate-50/95 dark:bg-slate-800/95 sticky top-0 z-20">
          <tr>
            {/* Team column header */}
            <th
              className="sticky left-0 z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60"
              style={{ minWidth: `${TEAM_COL_WIDTH}px`, width: `${TEAM_COL_WIDTH}px` }}
            >
              Team
            </th>

            {/* Position column header */}
            <th
              className="sticky left-0 z-30 text-left text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-2.5 py-2.5"
              style={{ left: `${TEAM_COL_WIDTH}px`, minWidth: '72px', width: '72px' }}
            >
              Pos
            </th>

            {/* User column headers */}
            {displayedUsers.map((e, index) => {
              const standPts =
                e.user.categories?.['Regular Season Standings']?.points || 0;
              const totalPts = e.user.total_points || 0;
              const isPinned = pinnedUserIds.includes(String(e.user.id));
              const leftPos = TEAM_COL_WIDTH + 72 + index * 108;

              return (
                <th
                  key={`h-${e.user.id}`}
                  className={`px-2.5 py-2.5 text-center text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 align-top transition-all duration-200 ${
                    isPinned
                      ? 'sticky z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm'
                      : ''
                  }`}
                  style={
                    isPinned
                      ? { left: `${leftPos}px`, minWidth: '108px', width: '108px' }
                      : { minWidth: '108px', width: '108px' }
                  }
                  title={`Stand: ${standPts} • Total: ${totalPts}`}
                >
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="truncate max-w-[60px]">
                      {e.user.display_name || e.user.username}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Pin button */}
                      <button
                        onClick={() => onTogglePin(e.user.id)}
                        title={isPinned ? 'Unpin column' : 'Pin column'}
                        className={`transition-all duration-200 ${
                          isPinned
                            ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        } ${pinPulseId === String(e.user.id) ? 'pin-pulse' : ''}`}
                      >
                        {isPinned ? (
                          <Pin className="w-3.5 h-3.5" />
                        ) : (
                          <PinOff className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Remove button */}
                      {!showAll && (
                        <button
                          onClick={() => onRemoveUser(e.user.id)}
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
                    <span className="inline-flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {standPts}
                    </span>
                    <span className="inline-flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                      {totalPts}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* West Conference Section */}
        <tbody>
          <tr>
            <td
              className="sticky left-0 z-20 bg-rose-50/80 dark:bg-rose-400/15 backdrop-blur-sm px-3 py-2.5 text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold"
              colSpan={2 + displayedUsers.length}
            >
              <button
                onClick={onToggleWestCollapse}
                className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
              >
                <span
                  className={`inline-block transition-transform duration-200 ${
                    collapsedWest ? '-rotate-90' : 'rotate-0'
                  }`}
                >
                  ▾
                </span>
                West
              </button>
            </td>
          </tr>
        </tbody>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="west" isDropDisabled={!whatIfEnabled}>
            {(provided) => (
              <tbody
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: collapsedWest ? 'none' : undefined }}
              >
                {(westOrder.length
                  ? westOrder.map((it, idx) => ({
                      team: it.team,
                      conference: 'West' as const,
                      actual_position: standingsTeams.find((r) => r.team === it.team)
                        ?.actual_position,
                    }))
                  : standingsTeams.filter((r) =>
                      (r.conference || '').toLowerCase().startsWith('w')
                    )
                ).map((row, index) => (
                  <Draggable
                    key={`W-${row.team}`}
                    draggableId={`W-${row.team}`}
                    index={index}
                    isDragDisabled={!whatIfEnabled}
                  >
                    {(prov) => {
                      const isChanged =
                        whatIfEnabled &&
                        (simActualMap.get(row.team) ?? row.actual_position) !==
                          (row.actual_position ?? null);

                      return (
                        <tr
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`${
                            isChanged
                              ? 'bg-amber-50/80 dark:bg-amber-400/10'
                              : index % 2 === 0
                              ? 'bg-white/80 dark:bg-slate-800/60'
                              : 'bg-white/50 dark:bg-slate-800/40'
                          } transition-colors duration-200`}
                        >
                          {/* Team name cell */}
                          <td
                            className="sticky left-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50"
                            style={{
                              minWidth: `${TEAM_COL_WIDTH}px`,
                              width: `${TEAM_COL_WIDTH}px`,
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="inline-flex w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: '#ef4444' }}
                              />
                              {isChanged && (
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                                  title="What‑If moved"
                                />
                              )}
                              <img
                                src={`/static/img/teams/${teamSlug(row.team)}.png`}
                                alt=""
                                className="w-5 h-5 object-contain shrink-0"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  const slug = teamSlug(row.team);
                                  const step = parseInt(img.dataset.step || '0', 10);
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
                                  img.onerror = null;
                                  img.src = '/static/img/teams/unknown.svg';
                                }}
                              />
                              <span className="transition-colors duration-200 truncate">
                                {row.team}
                              </span>
                            </div>
                          </td>

                          {/* Position cell */}
                          <td
                            className="sticky z-20 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm font-medium"
                            style={{
                              left: `${TEAM_COL_WIDTH}px`,
                              minWidth: '72px',
                              width: '72px',
                            }}
                          >
                            {whatIfEnabled
                              ? simActualMap.get(row.team) ?? row.actual_position ?? '—'
                              : row.actual_position ?? '—'}
                          </td>

                          {/* User prediction cells */}
                          {displayedUsers.map((e, userIndex) => {
                            const isPinned = pinnedUserIds.includes(String(e.user.id));
                            const preds =
                              e.user.categories?.['Regular Season Standings']
                                ?.predictions || [];
                            const p = preds.find((x) => x.team === row.team);
                            const pts = whatIfEnabled
                              ? standingPoints(
                                  p?.predicted_position,
                                  simActualMap.get(row.team)
                                )
                              : p?.points || 0;
                            const predPos = p?.predicted_position ?? '—';
                            const color =
                              pts >= 3
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                                : pts >= 1
                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                            const leftPos = TEAM_COL_WIDTH + 72 + userIndex * 108;

                            return (
                              <td
                                key={`c-${e.user.id}-${row.team}`}
                                className={`px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 ${
                                  isPinned
                                    ? 'sticky z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm'
                                    : ''
                                }`}
                                style={
                                  isPinned
                                    ? {
                                        left: `${leftPos}px`,
                                        minWidth: '108px',
                                        width: '108px',
                                      }
                                    : { minWidth: '108px', width: '108px' }
                                }
                              >
                                <div className="flex justify-center">
                                  <div className="relative inline-block group">
                                    <span
                                      className={`inline-block min-w-[80px] text-center px-2.5 py-1.5 rounded-md border text-xs font-medium ${color}`}
                                      title={`Pred: ${predPos}`}
                                    >
                                      {predPos}
                                    </span>
                                    {pts > 0 && (
                                      <span
                                        className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                                          pts >= 3
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700'
                                            : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-800 dark:text-amber-200 dark:border-amber-700'
                                        }`}
                                      >
                                        +{pts}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </DragDropContext>

        {/* East Conference Section */}
        <tbody>
          <tr>
            <td
              className="sticky left-0 z-20 bg-sky-50/80 dark:bg-sky-400/15 backdrop-blur-sm px-3 py-2.5 text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold"
              colSpan={2 + displayedUsers.length}
            >
              <button
                onClick={onToggleEastCollapse}
                className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
              >
                <span
                  className={`inline-block transition-transform duration-200 ${
                    collapsedEast ? '-rotate-90' : 'rotate-0'
                  }`}
                >
                  ▾
                </span>
                East
              </button>
            </td>
          </tr>
        </tbody>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="east" isDropDisabled={!whatIfEnabled}>
            {(provided) => (
              <tbody
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: collapsedEast ? 'none' : undefined }}
              >
                {(eastOrder.length
                  ? eastOrder.map((it) => ({
                      team: it.team,
                      conference: 'East' as const,
                      actual_position: standingsTeams.find((r) => r.team === it.team)
                        ?.actual_position,
                    }))
                  : standingsTeams.filter((r) =>
                      (r.conference || '').toLowerCase().startsWith('e')
                    )
                ).map((row, index) => (
                  <Draggable
                    key={`E-${row.team}`}
                    draggableId={`E-${row.team}`}
                    index={index}
                    isDragDisabled={!whatIfEnabled}
                  >
                    {(prov) => {
                      const isChanged =
                        whatIfEnabled &&
                        (simActualMap.get(row.team) ?? row.actual_position) !==
                          (row.actual_position ?? null);

                      return (
                        <tr
                          ref={prov.innerRef}
                          {...prov.dragHandleProps}
                          {...prov.draggableProps}
                          className={`${
                            isChanged
                              ? 'bg-amber-50/80 dark:bg-amber-400/10'
                              : index % 2 === 0
                              ? 'bg-white/80 dark:bg-slate-800/60'
                              : 'bg-white/50 dark:bg-slate-800/40'
                          } transition-colors duration-200`}
                        >
                          {/* Team name cell */}
                          <td
                            className="sticky left-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50"
                            style={{
                              minWidth: `${TEAM_COL_WIDTH}px`,
                              width: `${TEAM_COL_WIDTH}px`,
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="inline-flex w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: '#0ea5e9' }}
                              />
                              {isChanged && (
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                                  title="What‑If moved"
                                />
                              )}
                              <img
                                src={`/static/img/teams/${teamSlug(row.team)}.png`}
                                alt=""
                                className="w-5 h-5 object-contain shrink-0"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  const slug = teamSlug(row.team);
                                  const step = parseInt(img.dataset.step || '0', 10);
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
                                  img.onerror = null;
                                  img.src = '/static/img/teams/unknown.svg';
                                }}
                              />
                              <span className="transition-colors duration-200 truncate">
                                {row.team}
                              </span>
                            </div>
                          </td>

                          {/* Position cell */}
                          <td
                            className="sticky z-20 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm font-medium"
                            style={{
                              left: `${TEAM_COL_WIDTH}px`,
                              minWidth: '72px',
                              width: '72px',
                            }}
                          >
                            {whatIfEnabled
                              ? simActualMap.get(row.team) ?? row.actual_position ?? '—'
                              : row.actual_position ?? '—'}
                          </td>

                          {/* User prediction cells */}
                          {displayedUsers.map((e, userIndex) => {
                            const isPinned = pinnedUserIds.includes(String(e.user.id));
                            const preds =
                              e.user.categories?.['Regular Season Standings']
                                ?.predictions || [];
                            const p = preds.find((x) => x.team === row.team);
                            const pts = whatIfEnabled
                              ? standingPoints(
                                  p?.predicted_position,
                                  simActualMap.get(row.team)
                                )
                              : p?.points || 0;
                            const predPos = p?.predicted_position ?? '—';
                            const color =
                              pts >= 3
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                                : pts >= 1
                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                            const leftPos = TEAM_COL_WIDTH + 72 + userIndex * 108;

                            return (
                              <td
                                key={`c-${e.user.id}-${row.team}`}
                                className={`px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 ${
                                  isPinned
                                    ? 'sticky z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm'
                                    : ''
                                }`}
                                style={
                                  isPinned
                                    ? {
                                        left: `${leftPos}px`,
                                        minWidth: '108px',
                                        width: '108px',
                                      }
                                    : { minWidth: '108px', width: '108px' }
                                }
                              >
                                <div className="flex justify-center">
                                  <div className="relative inline-block group">
                                    <span
                                      className={`inline-block min-w-[80px] text-center px-2.5 py-1.5 rounded-md border text-xs font-medium ${color}`}
                                      title={`Pred: ${predPos}`}
                                    >
                                      {predPos}
                                    </span>
                                    {pts > 0 && (
                                      <span
                                        className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                                          pts >= 3
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700'
                                            : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-800 dark:text-amber-200 dark:border-amber-700'
                                        }`}
                                      >
                                        +{pts}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </DragDropContext>
      </table>
    </div>
  );
}
