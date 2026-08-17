import React from 'react';
import QuestionRow from './QuestionRow';

const QuestionList = ({
  questions,
  questionsLoading,
  onReorder,
  onUpdateQuestion,
  onDeleteQuestion,
  classes,
  themeStyles,
  options,
}) => (
  <section id="questions" className={`${themeStyles.glassCard} overflow-hidden`}>
    <div className="flex flex-col gap-4 border-b-2 border-[var(--court-rule)] px-8 py-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className={classes.headingClass}>Existing questions</h2>
        <p className={classes.subheadingClass}>Review, edit, or prune questions for this season.</p>
      </div>
      <button type="button" onClick={onReorder} className={`${classes.accentButtonClass} px-4`}>
        Sync order
      </button>
    </div>
    {questionsLoading ? (
      <div className={`px-8 py-12 text-center ${themeStyles.subtle}`}>Loading questions…</div>
    ) : questions.length === 0 ? (
      <div className={`px-8 py-12 text-center ${themeStyles.subtle}`}>
        No questions added yet for this season.
      </div>
    ) : (
      <div className={`divide-y ${themeStyles.divider}`}>
        {questions.map((question) => (
          <QuestionRow
            key={question.id}
            question={question}
            onUpdate={(updates) => onUpdateQuestion(question, updates)}
            onDelete={() => onDeleteQuestion(question)}
            themeStyles={themeStyles}
            inputClass={classes.inputClass}
            secondaryButtonClass={classes.secondaryButtonClass}
            dangerButtonClass={classes.dangerButtonClass}
            chipClass={classes.chipClass}
            mutedTextClass={classes.mutedTextClass}
            awardOptions={options.awardOptions}
            playerOptions={options.playerOptions}
            teamOptions={options.teamOptions}
          />
        ))}
      </div>
    )}
  </section>
);

export default QuestionList;
