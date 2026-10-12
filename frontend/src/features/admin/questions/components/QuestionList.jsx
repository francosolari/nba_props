import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import QuestionRow from './QuestionRow';
import { QUESTION_TYPES, filterQuestions } from '../questionTypes';

const QuestionList = ({
  questions,
  questionsLoading,
  onReorder,
  onUpdateQuestion,
  onDeleteQuestion,
  classes,
  themeStyles,
  options,
}) => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const counts = useMemo(() => {
    const byType = {};
    questions.forEach((question) => {
      byType[question.question_type] = (byType[question.question_type] || 0) + 1;
    });
    return byType;
  }, [questions]);

  const visible = useMemo(() => filterQuestions(questions, { type, query }), [questions, type, query]);
  const presentTypes = QUESTION_TYPES.filter((option) => counts[option.value]);
  const isFiltered = type !== 'all' || query.trim() !== '';

  return (
    <section id="questions" className="court-admin-list" aria-labelledby="question-list-title">
      <header className="court-admin-list__head">
        <h2 id="question-list-title">
          Questions
          <span>{isFiltered ? `${visible.length} of ${questions.length}` : questions.length}</span>
        </h2>
        <button type="button" onClick={onReorder} className="court-admin-chip-btn" title="Save the order shown below">
          Save order
        </button>
      </header>

      <div className="court-admin-list__tools">
        <label className="court-admin-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search questions</span>
          <input
            id="admin-question-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search text or #id"
            className="court-admin-input"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X aria-hidden="true" />
            </button>
          )}
        </label>
        {presentTypes.length > 1 && (
          <div className="court-admin-filter" role="radiogroup" aria-label="Filter by type">
            {[{ value: 'all', label: 'All' }, ...presentTypes].map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={type === option.value}
                onClick={() => setType(option.value)}
                className={type === option.value ? 'is-active' : ''}
              >
                {option.label}
                <span>{option.value === 'all' ? questions.length : counts[option.value]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {questionsLoading ? (
        <div className="court-admin-list__empty" aria-busy="true">Loading questions…</div>
      ) : questions.length === 0 ? (
        <div className="court-admin-list__empty">
          No questions for this season yet. Create the first one with the form, or use Batch create to draft a whole slate.
        </div>
      ) : visible.length === 0 ? (
        <div className="court-admin-list__empty">
          Nothing matches.{' '}
          <button
            type="button"
            className="court-admin-link"
            onClick={() => {
              setQuery('');
              setType('all');
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ol className="court-admin-list__rows">
          {visible.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              onUpdate={(updates) => onUpdateQuestion(question, updates)}
              onDelete={() => onDeleteQuestion(question)}
              themeStyles={themeStyles}
              inputClass={classes.inputClass}
              primaryButtonClass={classes.primaryButtonClass}
              secondaryButtonClass={classes.secondaryButtonClass}
              awardOptions={options.awardOptions}
              playerOptions={options.playerOptions}
              teamOptions={options.teamOptions}
            />
          ))}
        </ol>
      )}
    </section>
  );
};

export default QuestionList;
