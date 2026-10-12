import React from 'react';
import EditablePredictionBoard from '../../components/EditablePredictionBoard';
import InSeasonTournamentSection from './InSeasonTournamentSection';
import NBAFinalsSection from './NBAFinalsSection';
import QuestionCard from './QuestionCard';
import SubmissionProgressTracker from './SubmissionProgressTracker';
import useStuckLedger from './useStuckLedger';
import { isAnswered } from './submissionProgress';

// The mobile bottom navigation is 74px and the ledger sticks 6px into it.
const ACTIONS_STICKY_OFFSET = 68;

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
  isAuthenticated,
}) => {
  const hasValidationError = validationAttempted && missingCount > 0;
  // On a phone the pinned ledger docks to one row: what's left, Save, Submit.
  // The notes come back in full at rest; the guest caveat also leads the page
  // and Save asks guests for an account anyway. A validation error stays
  // written out while pinned, since it's the reason the reader is here.
  const [sentinelRef, ledgerRef, spacerRef, isStuck] = useStuckLedger('bottom', ACTIONS_STICKY_OFFSET);

  return (
  <>
  <div
    id="submit"
    ref={ledgerRef}
    className={`submission-actions mt-10${hasValidationError ? ' has-validation-error' : ''}${hasChanges ? ' has-changes' : ''}${isStuck ? ' is-stuck' : ''}`}
  >
    <div className="submission-actions__status" id="submission-requirements">
      <div><span>Entry status</span><strong>{missingCount === 0 ? 'All questions answered' : `${missingCount} ${missingCount === 1 ? 'question' : 'questions'} left`}</strong></div>
      <p className="submission-actions__note" aria-live="assertive">{!isAuthenticated
        ? 'Your draft stays on this device. Create an account when you save or submit.'
        : hasValidationError
        ? 'Final submission needs every question. Save this draft now or finish the remaining picks.'
        : 'Save a draft anytime. Final submission requires every question.'}</p>
    </div>
    <div className="submission-actions__buttons">
      <span className="submission-actions__count" aria-hidden="true">{missingCount === 0 ? 'All in' : `${missingCount} left`}</span>
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="submission-actions__save"
        aria-label={hasChanges && !isPending ? 'Save for later (unsaved changes)' : undefined}
      >
        {isPending ? 'Saving…' : 'Save for later'}
        <span className="submission-actions__dot" aria-hidden="true" />
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
  <div ref={sentinelRef} className="submission-ledger-mark" aria-hidden="true" />
  <div ref={spacerRef} className="submission-ledger-spacer" aria-hidden="true" />
  </>
  );
};

const SubmissionForm = ({
  standingsBoardRef,
  userContextLoading,
  isAuthenticated,
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
  onAuthenticationRequired,
}) => {
  const sharedProps = { isReadOnly, playerOptions, teamOptions, loadingAuxData, istStandings, loadingIstStandings, istStandingsError };
  return (
    <>
      <section id="standings" className="mb-10">
        <header className="mb-4"><h2 className="text-xl sm:text-2xl font-semibold">Regular Season Standings</h2><p className="text-sm text-slate-500 mt-1">Drag and drop teams in each conference to set your projected final standings.</p></header>
        <div className="submission-standings-frame">
          {userContextLoading ? <div className="p-6 text-center text-sm">Loading standings...</div> : (
            <EditablePredictionBoard
              ref={standingsBoardRef}
              seasonSlug={seasonSlug}
              canEdit={!isReadOnly}
              username={username}
              localOnly={!isAuthenticated}
              draftStorageKey={`submission_standings_${seasonSlug}`}
              onLocalSave={onAuthenticationRequired}
            />
          )}
        </div>
      </section>
      {!isReadOnly && questions.length > 0 && (
        <SubmissionProgressTracker activeGroup={activeGroup} groups={groupedQuestions} answers={answers} completedCount={completedCount} totalCount={questions.length} progress={progress} />
      )}
      <div id="questions" className="space-y-10">
        {groupedQuestions.map((group) => <QuestionGroup key={group.type} group={group} answers={answers} onAnswerChange={handleAnswerChange} sharedProps={sharedProps} />)}
      </div>
      {!isReadOnly && <SubmissionActions validationAttempted={validationAttempted} missingCount={missingCount} hasChanges={hasChanges} isPending={submitPending} seasonSlug={seasonSlug} onSave={onSave} onSubmit={onSubmit} isAuthenticated={isAuthenticated} />}
    </>
  );
};

export default SubmissionForm;
