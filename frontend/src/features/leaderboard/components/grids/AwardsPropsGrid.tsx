/**
 * AwardsPropsGrid component
 *
 * Desktop grid for comparing user awards/props predictions with:
 * - Sticky headers and pinned columns
 * - Color-coded answer indicators
 * - Question numbering and finalized status
 *
 * @module features/leaderboard/components/grids/AwardsPropsGrid
 */

import React, { useMemo } from 'react';
import type { LeaderboardEntry } from '../../types/leaderboard';
import { CATEGORY_KEYS } from '../../utils/constants';
import { Pin, PinOff, X, Lock, CheckCircle2, XCircle } from 'lucide-react';

interface AwardsPropsGridProps {
  /** Users to display in columns */
  displayedUsers: LeaderboardEntry[];

  /** Section key (awards or props) */
  sectionKey: 'awards' | 'props';

  /** Pinned user IDs */
  pinnedUserIds: Array<string | number>;

  /** ID of user whose pin button is pulsing */
  pinPulseId: string | null;

  /** Whether showing all users */
  showAll: boolean;

  /** Toggle pin for a user */
  onTogglePin: (userId: string | number) => void;

  /** Remove user from selection */
  onRemoveUser: (userId: string | number) => void;
}

/**
 * Get category key from section
 */
function getCategoryKey(section: 'awards' | 'props'): string {
  return section === 'awards' ? CATEGORY_KEYS.AWARDS : CATEGORY_KEYS.PROPS;
}

/**
 * AwardsPropsGrid component
 *
 * Full-featured desktop grid for awards/props comparison.
 */
export function AwardsPropsGrid({
  displayedUsers,
  sectionKey,
  pinnedUserIds,
  pinPulseId,
  showAll,
  onTogglePin,
  onRemoveUser,
}: AwardsPropsGridProps): React.ReactElement {
  const catKey = getCategoryKey(sectionKey);

  // Build questions map from all users' predictions
  const questions = useMemo(() => {
    const qMap = new Map<
      string | number,
      { id: string | number; text: string; is_finalized?: boolean }
    >();

    displayedUsers.forEach((e) => {
      const preds = e.user.categories?.[catKey]?.predictions || [];
      preds.forEach((p) => {
        if (!p.question_id) return;
        if (!qMap.has(p.question_id)) {
          qMap.set(p.question_id, {
            id: p.question_id,
            text: p.question,
            is_finalized: p.is_finalized,
          });
        }
      });
    });

    // Sort alphabetically
    return Array.from(qMap.values()).sort((a, b) => a.text.localeCompare(b.text));
  }, [displayedUsers, catKey]);

  return (
    <div className="overflow-auto hidden md:block">
      <table
        className="min-w-full border-t border-slate-200 dark:border-slate-700"
        style={{ tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: '320px' }} />
          {displayedUsers.map((_, idx) => (
            <col key={`qa-${idx}`} style={{ width: '160px' }} />
          ))}
        </colgroup>

        {/* Table Header */}
        <thead className="bg-slate-50/95 dark:bg-slate-800/95 sticky top-0 z-20">
          <tr>
            {/* Question column header */}
            <th
              className="sticky left-0 z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60"
              style={{ minWidth: '320px', width: '320px' }}
            >
              Question
            </th>

            {/* User column headers */}
            {displayedUsers.map((e, index) => {
              const catPts = e.user.categories?.[catKey]?.points || 0;
              const totalPts = e.user.total_points || 0;
              const isPinned = pinnedUserIds.includes(String(e.user.id));
              const leftPos = 320 + index * 160;

              return (
                <th
                  key={`h2-${e.user.id}`}
                  className={`px-2.5 py-2.5 text-center text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 align-top transition-all duration-200 ${
                    isPinned
                      ? 'sticky z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm'
                      : ''
                  }`}
                  style={
                    isPinned
                      ? { left: `${leftPos}px`, minWidth: '160px', width: '160px' }
                      : { minWidth: '160px', width: '160px' }
                  }
                >
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="truncate max-w-[80px]">
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
                    <span
                      className="inline-flex items-center justify-center gap-1"
                      title="Category points"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {catPts}
                    </span>
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
            })}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {questions.map((q, idx) => (
            <tr
              key={`q-${q.id}`}
              className="odd:bg-white/80 even:bg-white/50 dark:odd:bg-slate-800/60 dark:even:bg-slate-800/40"
            >
              {/* Question cell */}
              <td
                className="sticky left-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200"
                style={{ minWidth: '320px', width: '320px' }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Question number */}
                  <span className="inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 shrink-0">
                    {idx + 1}
                  </span>

                  {/* Question text */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200/60 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 truncate"
                    title={q.text}
                  >
                    {q.text}
                    {q.is_finalized && (
                      <Lock
                        className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0"
                        title="Finalized"
                      />
                    )}
                  </span>
                </div>
              </td>

              {/* User answer cells */}
              {displayedUsers.map((e, userIndex) => {
                const isPinned = pinnedUserIds.includes(String(e.user.id));
                const preds = e.user.categories?.[catKey]?.predictions || [];
                const p = preds.find((x) => String(x.question_id) === String(q.id));
                const pts = p?.points || 0;
                const answerRaw = (p?.answer || '').toString();
                const answer = answerRaw || '—';
                const isYes = /^yes$/i.test(answerRaw);
                const isNo = /^no$/i.test(answerRaw);
                const isWrong = p?.correct === false;
                const color = isWrong
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                  : pts > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                const leftPos = 320 + userIndex * 160;

                return (
                  <td
                    key={`q-${q.id}-${e.user.id}`}
                    className={`px-3 py-2.5 ${
                      isPinned
                        ? 'sticky z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm'
                        : ''
                    }`}
                    style={
                      isPinned
                        ? { left: `${leftPos}px`, minWidth: '160px', width: '160px' }
                        : { minWidth: '160px', width: '160px' }
                    }
                  >
                    <div className="flex justify-center">
                      <div className="relative inline-block group">
                        <span
                          className={`inline-flex items-center gap-1.5 max-w-[140px] truncate text-center px-2.5 py-1.5 rounded-md border text-xs font-medium ${color}`}
                          title={answer}
                        >
                          {/* Yes/No icons */}
                          {isYes && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          {isNo && <XCircle className="w-3.5 h-3.5 shrink-0" />}

                          {/* Answer text */}
                          <span className="truncate">{answer}</span>
                        </span>

                        {/* Points tooltip */}
                        {pts > 0 && (
                          <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700">
                            +{pts}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
