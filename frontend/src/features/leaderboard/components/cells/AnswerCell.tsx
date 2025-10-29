/**
 * AnswerCell component
 *
 * Renders a single cell in the awards/props comparison grid showing:
 * - User's answer (text, Yes/No with icons)
 * - Points earned (color-coded background)
 * - Visual indicators for correctness (green = correct, rose = wrong)
 * - Hover tooltip showing points
 *
 * @module features/leaderboard/components/cells/AnswerCell
 */

import React from 'react';
import type { Prediction } from '../../types/leaderboard';
import { CheckCircle2, XCircle } from 'lucide-react';

interface AnswerCellProps {
  /** User's prediction for this question */
  prediction?: Prediction;

  /** Whether this user's column is pinned */
  isPinned?: boolean;

  /** Column index for sticky positioning */
  columnIndex?: number;

  /** Width of columns before this one (for sticky positioning) */
  leftOffset?: number;
}

/**
 * Get color classes based on answer correctness and points
 */
function getAnswerColorClasses(prediction?: Prediction): string {
  if (!prediction) {
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
  }

  const pts = prediction.points || 0;
  const isWrong = prediction.correct === false;

  if (isWrong) {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30';
  }

  if (pts > 0) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
  }

  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
}

/**
 * AnswerCell component
 *
 * Displays a user's answer for a specific question with color-coded
 * styling based on correctness and points earned.
 *
 * @param props - Component props
 * @returns Rendered table cell
 */
export function AnswerCell({
  prediction,
  isPinned = false,
  leftOffset = 0,
}: AnswerCellProps): React.ReactElement {
  const answerRaw = (prediction?.answer || '').toString();
  const answer = answerRaw || '—';
  const isYes = /^yes$/i.test(answerRaw);
  const isNo = /^no$/i.test(answerRaw);
  const pts = prediction?.points || 0;

  const colorClasses = getAnswerColorClasses(prediction);

  // Sticky positioning styles for pinned columns
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

  const cellClasses = `px-3 py-2.5 transition-all duration-200 ${
    isPinned
      ? 'sticky z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm'
      : ''
  }`;

  return (
    <td className={cellClasses} style={stickyStyles}>
      <div className="flex justify-center">
        <div className="relative inline-block group">
          <span
            className={`inline-flex items-center gap-1.5 max-w-[140px] truncate text-center px-2.5 py-1.5 rounded-md border text-xs font-medium ${colorClasses}`}
            title={answer}
          >
            {/* Yes/No icons */}
            {isYes && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {isNo && <XCircle className="w-3.5 h-3.5 shrink-0" />}

            {/* Answer text */}
            <span className="truncate">{answer}</span>
          </span>

          {/* Points tooltip on hover */}
          {pts > 0 && (
            <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700">
              +{pts}
            </span>
          )}
        </div>
      </div>
    </td>
  );
}
