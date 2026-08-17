// File: frontend/src/features/admin/grading/components/AuditUserRow.jsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import AuditCategoryAccordion from './AuditCategoryAccordion';

const AuditUserRow = ({
  user,
  isExpanded,
  onToggle,
  expandedCategories,
  onToggleCategory,
  bulkGradeMode,
  selectedAnswers,
  onToggleAnswerSelection,
  onGradeAnswer,
}) => (
  <div className="court-admin-accordion">
    <button type="button" onClick={onToggle} className="court-admin-accordion__head">
      <div className="flex items-center gap-4">
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-[var(--court-steel)]" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[var(--court-steel)]" />
        )}
        <div className="text-left">
          <div className="font-semibold text-lg">{user.display_name}</div>
          <div className="text-sm text-[var(--court-steel)]">@{user.username}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold text-[var(--court-blue)]">{user.total_points.toFixed(1)}</div>
        <div className="text-xs text-[var(--court-steel)]">total points</div>
      </div>
    </button>

    {isExpanded && (
      <div className="court-admin-accordion__body space-y-4">
        {user.categories.map((category) => {
          const catKey = `${user.user_id}-${category.category_name}`;
          return (
            <AuditCategoryAccordion
              key={category.category_name}
              category={category}
              isExpanded={expandedCategories.has(catKey)}
              onToggle={() => onToggleCategory(user.user_id, category.category_name)}
              bulkGradeMode={bulkGradeMode}
              selectedAnswers={selectedAnswers}
              onToggleAnswerSelection={onToggleAnswerSelection}
              onGradeAnswer={onGradeAnswer}
            />
          );
        })}
      </div>
    )}
  </div>
);

export default AuditUserRow;
