import React from 'react';
import { isAnswered } from './submissionProgress';

const SubmissionProgressTracker = ({
  activeGroup,
  groups,
  answers,
  completedCount,
  totalCount,
  progress,
}) => {
  const sectionCompleted = activeGroup?.questions.filter(
    (question) => isAnswered(answers[question.id]),
  ).length || 0;
  const sectionTotal = activeGroup?.questions.length || 0;
  const sectionProgress = sectionTotal > 0
    ? Math.round((sectionCompleted / sectionTotal) * 100)
    : 0;
  const missingCount = Math.max(totalCount - completedCount, 0);
  const isComplete = totalCount > 0 && missingCount === 0;

  return (
    <aside
      className={`submission-progress${isComplete ? ' is-complete' : ''}`}
      data-testid="submission-progress"
      aria-label="Prediction completion"
    >
      {activeGroup && (
        <div className="submission-progress__section" data-testid="section-progress">
          <div className="submission-progress__label-row">
            <span className="submission-progress__label">Current section</span>
            <strong>{sectionCompleted} of {sectionTotal}</strong>
          </div>
          <p>{activeGroup.title}</p>
          <div
            className="submission-progress__track"
            role="progressbar"
            aria-label={`${activeGroup.title} completion`}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={sectionProgress}
          >
            <span style={{ width: `${sectionProgress}%` }} />
          </div>
        </div>
      )}
      <div className="submission-progress__overall" data-testid="overall-progress">
        <div className="submission-progress__label-row">
          <span className="submission-progress__label">Overall entry</span>
          <strong>{completedCount} of {totalCount} answered</strong>
        </div>
        <div className="submission-progress__overall-row">
          <div
            className="submission-progress__track"
            role="progressbar"
            aria-label="Overall entry completion"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="submission-progress__status">
            {isComplete ? 'Ready to submit' : `${missingCount} left`}
          </span>
        </div>
      </div>
      <nav className="submission-progress__jumps" aria-label="Jump to prediction section">
        {groups.map((group) => {
          const completed = group.questions.filter(
            (question) => isAnswered(answers[question.id]),
          ).length;
          const remaining = group.questions.length - completed;
          const isActive = group.type === activeGroup?.type;
          return (
            <a
              key={group.type}
              href={`#question-group-${group.type}`}
              className={`${isActive ? 'is-active' : ''}${remaining === 0 ? ' is-complete' : ''}`}
              aria-current={isActive ? 'location' : undefined}
            >
              <span>{group.shortTitle || group.title}</span>
              <small>{remaining === 0 ? 'Done' : `${remaining} left`}</small>
            </a>
          );
        })}
      </nav>
    </aside>
  );
};

export default SubmissionProgressTracker;
