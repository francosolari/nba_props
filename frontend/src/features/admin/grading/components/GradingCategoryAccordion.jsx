// File: frontend/src/features/admin/grading/components/GradingCategoryAccordion.jsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getCategoryIcon } from '../utils';
import GradingQuestionRow from './GradingQuestionRow';

const GradingCategoryAccordion = ({ categoryName, questions, isExpanded, onToggle, editor, playerOptions }) => {
  const answeredCount = questions.filter((q) => q.has_correct_answer).length;

  return (
    <div className="court-admin-accordion">
      <button type="button" onClick={onToggle} className="court-admin-accordion__head">
        <div className="flex items-center gap-4">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-[var(--court-steel)]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[var(--court-steel)]" />
          )}
          {getCategoryIcon(categoryName)}
          <div className="text-left">
            <div className="font-semibold text-lg">{categoryName}</div>
            <div className="text-sm text-[var(--court-steel)]">
              {answeredCount} / {questions.length} answered
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--court-steel)]">{questions.length} questions</div>
        </div>
      </button>

      {isExpanded && (
        <div className="court-admin-accordion__body space-y-3">
          {questions.map((question) => (
            <GradingQuestionRow
              key={question.question_id}
              question={question}
              editor={editor}
              playerOptions={playerOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GradingCategoryAccordion;
