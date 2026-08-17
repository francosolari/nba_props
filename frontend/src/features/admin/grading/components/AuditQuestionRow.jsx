// File: frontend/src/features/admin/grading/components/AuditQuestionRow.jsx
import React from 'react';
import { CheckCircle2, CheckSquare, Lock, Square, XCircle } from 'lucide-react';

const AuditQuestionRow = ({ question, bulkGradeMode, isSelected, onToggleSelect, onGrade }) => (
  <div className="court-admin-grading-row">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        {bulkGradeMode && (
          <button type="button" onClick={onToggleSelect} className="mr-2">
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-[var(--court-blue)]" />
            ) : (
              <Square className="w-5 h-5 text-[var(--court-steel)]" />
            )}
          </button>
        )}
        <div className="text-sm font-medium mb-1">{question.question_text}</div>
        <div className="text-xs text-[var(--court-steel)] space-y-1">
          <div>User Answer: <span className="text-[var(--court-ink)]">{question.user_answer || '—'}</span></div>
          <div>Correct Answer: <span className="text-[var(--court-ink)]">{question.correct_answer || '—'}</span></div>
          <div className="flex items-center gap-2">
            Points: <span className="text-[var(--court-blue)]">{question.points_earned} / {question.point_value}</span>
            {question.is_finalized && <Lock className="w-3 h-3 text-[var(--court-warning)]" title="Finalized" />}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {question.is_correct === null ? (
          <span className="court-admin-badge court-admin-badge--warning">Pending</span>
        ) : question.is_correct ? (
          <CheckCircle2 className="w-5 h-5 text-[var(--court-success)]" />
        ) : (
          <XCircle className="w-5 h-5 text-[var(--court-danger)]" />
        )}
        {!bulkGradeMode && (
          <div className="flex gap-1">
            <button type="button" onClick={() => onGrade(true)} className="court-admin-chip-btn court-admin-chip-btn--success" title="Mark Correct">
              &#10003;
            </button>
            <button type="button" onClick={() => onGrade(false)} className="court-admin-chip-btn court-admin-chip-btn--danger" title="Mark Incorrect">
              &#10007;
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AuditQuestionRow;
