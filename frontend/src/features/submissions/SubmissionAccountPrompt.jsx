import React from 'react';

const SubmissionAccountPrompt = ({ action, onDismiss }) => {
  const returnPath = `${window.location.pathname}${window.location.search}`;
  const next = encodeURIComponent(returnPath);
  const isTriggered = Boolean(action);

  return (
    <aside className={`submission-account-note${isTriggered ? ' is-prompted' : ''}`} aria-live="polite">
      <div>
        <strong>{isTriggered ? 'Keep your entry with an account' : 'No account needed to start'}</strong>
        <p>{isTriggered
          ? `Your picks are saved on this device. ${action === 'submit' ? 'Create an account or log in to submit them.' : 'Create an account or log in to keep them across devices.'}`
          : 'Start making picks now. This device keeps your draft until you are ready to save or submit.'}</p>
      </div>
      {isTriggered && (
        <div className="submission-account-note__actions">
          <a href={`/accounts/signup/?next=${next}`}>Create account</a>
          <a href={`/accounts/login/?next=${next}`}>Log in</a>
          <button type="button" onClick={onDismiss}>Keep picking</button>
        </div>
      )}
    </aside>
  );
};

export default SubmissionAccountPrompt;
