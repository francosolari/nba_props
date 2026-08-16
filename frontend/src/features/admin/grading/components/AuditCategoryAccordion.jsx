// File: frontend/src/features/admin/grading/components/AuditCategoryAccordion.jsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getCategoryIcon } from '../utils';
import AuditQuestionRow from './AuditQuestionRow';

const AuditCategoryAccordion = ({
  category,
  isExpanded,
  onToggle,
  bulkGradeMode,
  selectedAnswers,
  onToggleAnswerSelection,
  onGradeAnswer,
}) => (
  <div className="court-admin-subaccordion">
    <button type="button" onClick={onToggle} className="court-admin-subaccordion__head">
      <div className="flex items-center gap-3">
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--court-steel)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--court-steel)]" />
        )}
        {getCategoryIcon(category.category_name)}
        <span className="font-medium">{category.category_name}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-[var(--court-success)]">{category.correct_count} correct</span>
        <span className="text-[var(--court-danger)]">{category.incorrect_count} wrong</span>
        <span className="text-[var(--court-warning)]">{category.pending_count} pending</span>
        <span className="font-bold text-[var(--court-blue)]">
          {category.total_points.toFixed(1)} / {category.possible_points.toFixed(1)}
        </span>
      </div>
    </button>

    {isExpanded && category.questions.length > 0 && (
      <div className="p-4 space-y-2">
        {category.questions.map((question) => (
          <AuditQuestionRow
            key={question.question_id}
            question={question}
            bulkGradeMode={bulkGradeMode}
            isSelected={selectedAnswers.has(question.question_id)}
            onToggleSelect={() => onToggleAnswerSelection(question.question_id)}
            onGrade={(isCorrect) => onGradeAnswer(question.question_id, isCorrect)}
          />
        ))}
      </div>
    )}
  </div>
);

export default AuditCategoryAccordion;
