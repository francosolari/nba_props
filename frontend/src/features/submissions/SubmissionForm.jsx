import React from 'react';
import EditablePredictionBoard from '../../components/EditablePredictionBoard';
import InSeasonTournamentSection from './InSeasonTournamentSection';
import NBAFinalsSection from './NBAFinalsSection';
import QuestionCard from './QuestionCard';
import SubmissionProgressTracker from './SubmissionProgressTracker';
import { isAnswered } from './submissionProgress';

const QuestionGroup = ({ group, answers, onAnswerChange, sharedProps }) => {
  const completed = group.questions.filter((question) => isAnswered(answers[question.id])).length;
  return (
    <section id={`question-group-${group.type}`} data-group-type={group.type} className="submission-question-group">
      <header className="mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">{group.title}</h2>
          {group.description && <p className="text-sm text-slate-500 mt-1">{group.description}</p>}
        </div>
        <span className={`submission-section-count${completed === group.questions.length ? ' is-complete' : ''}`}>
          {completed} of {group.questions.length} complete
        </span>
      </header>
      {group.type === 'ist' ? (
        <InSeasonTournamentSection questions={group.questions} answers={answers} onAnswerChange={onAnswerChange} {...sharedProps} />
      ) : group.type === 'nba_finals' ? (
        <NBAFinalsSection questions={group.questions} answers={answers} onAnswerChange={onAnswerChange} {...sharedProps} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {group.questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              answer={answers[question.id]}
              onChange={(value) => onAnswerChange(question.id, value)}
              {...sharedProps}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const SubmissionActions = ({
  validationAttempted,
  missingCount,
  hasChanges,
  isPending,
  seasonSlug,
  onSave,
  onSubmit,
}) => (
  <div id="submit" className={`submission-actions mt-10${validationAttempted && missingCount > 0 ? ' has-validation-error' : ''}`}>
    <div className="submission-actions__status" id="submission-requirements">
      <div><span>Entry status</span><strong>{missingCount === 0 ? 'All questions answered' : `${missingCount} ${missingCount === 1 ? 'question' : 'questions'} left`}</strong></div>
      <p aria-live="assertive">{validationAttempted && missingCount > 0
        ? 'Final submission needs every question. Save this draft now or finish the remaining picks.'
        : 'Save a draft anytime. Final submission requires every question.'}</p>
    </div>
    <div className="submission-actions__buttons">
      <button type="button" onClick={onSave} disabled={isPending} className="submission-actions__save">
        {isPending ? 'Saving…' : 'Save for later'}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending || !seasonSlug}
        aria-describedby="submission-requirements"
        className={`submission-actions__submit${missingCount > 0 ? ' is-incomplete' : ''}`}
      >
        {isPending ? 'Submitting...' : 'Submit Predictions'}
      </button>
    </div>
    {hasChanges && <p className="submission-actions__unsaved">You have unsaved changes</p>}
  </div>
);

const SubmissionForm = ({
  standingsBoardRef,
  userContextLoading,
  userContext,
  username,
  seasonSlug,
  isReadOnly,
  questions,
  groupedQuestions,
  activeGroup,
  answers,
  completedCount,
  progress,
  handleAnswerChange,
  playerOptions,
  teamOptions,
  loadingAuxData,
  istStandings,
  loadingIstStandings,
  istStandingsError,
  validationAttempted,
  missingCount,
  hasChanges,
  submitPending,
  onSave,
  onSubmit,
}) => {
  const sharedProps = { isReadOnly, playerOptions, teamOptions, loadingAuxData, istStandings, loadingIstStandings, istStandingsError };
  return (
    <>
      <section id="standings" className="mb-10">
        <header className="mb-4"><h2 className="text-xl sm:text-2xl font-semibold">Regular Season Standings</h2><p className="text-sm text-slate-500 mt-1">Drag and drop teams in each conference to set your projected final standings.</p></header>
        <div className="bg-white border border-slate-200 rounded-xl">
          {userContextLoading ? <div className="p-6 text-center text-sm">Loading standings...</div> : userContext ? (
            <EditablePredictionBoard ref={standingsBoardRef} seasonSlug={seasonSlug} canEdit={!isReadOnly} username={username} />
          ) : <div className="p-6 text-center text-sm">Sign in to manage your regular season standings predictions.</div>}
        </div>
      </section>
      {!isReadOnly && questions.length > 0 && (
        <SubmissionProgressTracker activeGroup={activeGroup} groups={groupedQuestions} answers={answers} completedCount={completedCount} totalCount={questions.length} progress={progress} />
      )}
      <div id="questions" className="space-y-10">
        {groupedQuestions.map((group) => <QuestionGroup key={group.type} group={group} answers={answers} onAnswerChange={handleAnswerChange} sharedProps={sharedProps} />)}
      </div>
      {!isReadOnly && <SubmissionActions validationAttempted={validationAttempted} missingCount={missingCount} hasChanges={hasChanges} isPending={submitPending} seasonSlug={seasonSlug} onSave={onSave} onSubmit={onSubmit} />}
    </>
  );
};

export default SubmissionForm;
