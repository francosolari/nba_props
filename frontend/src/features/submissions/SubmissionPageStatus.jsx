import React from 'react';
import SubmissionAccountPrompt from './SubmissionAccountPrompt';

const SubmissionPageHeader = ({ season }) => (
  <div className="flex flex-col gap-6 mb-10">
    <div className="flex flex-col gap-2 text-center md:text-left">
      <span className="inline-flex items-center justify-center md:justify-start gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-sky-600 dark:text-sky-400">
        {season} Season
      </span>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
        Submit Your Predictions
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
        Lock in your regular season standings and answer every question before the window closes.
      </p>
    </div>
  </div>
);

const FeedbackNotice = ({ feedback, onDismiss }) => feedback && (
  <div className="submission-feedback">
    <div
      className={`submission-feedback__sheet is-${feedback.type}`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
    >
      <span>{feedback.message}</span>
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  </div>
);

const PaymentStatus = ({ enabled, loading, paymentStatus, hasSavedDraft, onPay }) => {
  if (!enabled || loading || !paymentStatus) return null;
  if (paymentStatus.is_paid) {
    return (
      <div className="submission-payment is-paid">
        <div className="submission-payment__copy">
          <strong>Payment confirmed</strong>
          {paymentStatus.paid_at && (
            <span className="text-xs">Paid on {new Date(paymentStatus.paid_at).toLocaleDateString()}</span>
          )}
        </div>
        <span className="submission-payment__stamp">Submission valid</span>
      </div>
    );
  }
  if (!hasSavedDraft) return null;
  return (
    <div className="submission-payment is-due">
      <div className="submission-payment__copy">
        <div>
          <strong>Payment required</strong>
          <p>Your predictions remain a draft until the $25.00 entry fee is paid.</p>
          <p className="text-xs">You can still edit paid entries until the deadline.</p>
        </div>
        <button type="button" onClick={onPay}>
          Pay now
        </button>
      </div>
    </div>
  );
};

const SubmissionWindowStatus = ({ status }) => status && (
  <div className={`submission-window is-${status.is_open ? 'open' : 'closed'}`}>
    <p>
      {status.message}
    </p>
    {status.days_until_close !== null && status.days_until_close !== undefined && (
      <p className="text-sm mt-1">{status.days_until_close} day(s) remaining</p>
    )}
    {!status.is_open && status.days_until_open !== null && status.days_until_open !== undefined && (
      <p className="text-sm mt-1">Opens in {status.days_until_open} day(s)</p>
    )}
  </div>
);

const SubmissionPageStatus = ({
  season,
  feedback,
  onDismissFeedback,
  entryFeeEnabled,
  entryFeeError,
  entryFeeErrorMessage,
  onRetryEntryFee,
  paymentStatusLoading,
  paymentStatus,
  hasSavedDraft,
  onPay,
  isVerifying,
  submissionStatus,
  isAuthenticated,
  accountPromptAction,
  onDismissAccountPrompt,
}) => (
  <>
    <SubmissionPageHeader season={season} />
    {!isAuthenticated && (
      <SubmissionAccountPrompt action={accountPromptAction} onDismiss={onDismissAccountPrompt} />
    )}
    <FeedbackNotice feedback={feedback} onDismiss={onDismissFeedback} />
    {entryFeeEnabled && entryFeeError && (
      <div className="submission-entry-error">
        <div><strong>Entry fee status unavailable</strong><p>{entryFeeErrorMessage}</p></div>
        <button type="button" onClick={onRetryEntryFee}>Retry</button>
      </div>
    )}
    <PaymentStatus enabled={entryFeeEnabled} loading={paymentStatusLoading} paymentStatus={paymentStatus} hasSavedDraft={hasSavedDraft} onPay={onPay} />
    {isVerifying && <div className="submission-verifying">Verifying your payment...</div>}
    <SubmissionWindowStatus status={submissionStatus} />
  </>
);

export default SubmissionPageStatus;
