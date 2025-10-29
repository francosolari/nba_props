/**
 * QuestionRowHeader component
 *
 * Renders the question text in the awards/props grid as a sticky
 * left column header with numbering and finalized indicator.
 *
 * @module features/leaderboard/components/cells/QuestionRowHeader
 */

import React from 'react';
import { Lock } from 'lucide-react';

interface QuestionRowHeaderProps {
  /** Question text */
  question: string;

  /** Question number (1-indexed) */
  questionNumber: number;

  /** Whether the question is finalized */
  isFinalized?: boolean;
}

/**
 * QuestionRowHeader component
 *
 * Displays question information in the first column of the awards/props grid.
 * Shows question number, text, and finalized status indicator.
 *
 * @param props - Component props
 * @returns Rendered table cell
 */
export function QuestionRowHeader({
  question,
  questionNumber,
  isFinalized = false,
}: QuestionRowHeaderProps): React.ReactElement {
  return (
    <td
      className="sticky left-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200"
      style={{ minWidth: '320px', width: '320px' }}
    >
      <div className="flex items-center gap-2.5">
        {/* Question number badge */}
        <span className="inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 shrink-0">
          {questionNumber}
        </span>

        {/* Question text with finalized indicator */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200/60 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 truncate"
          title={question}
        >
          {question}
          {isFinalized && (
            <Lock
              className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0"
              title="Finalized"
            />
          )}
        </span>
      </div>
    </td>
  );
}
