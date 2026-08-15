import React from 'react';

const SubmissionPageHeader = ({ season }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
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
    <nav className="flex flex-wrap items-center justify-center md:justify-end gap-2 text-sm">
      <a href="#standings" className="px-3 py-2 rounded-full border border-sky-200/80 bg-white/60 text-sky-600 font-semibold">Standings</a>
      <a href="#questions" className="px-3 py-2 rounded-full border border-slate-200 bg-white/60 text-slate-600 font-semibold">Questions</a>
      <a href="#submit" className="px-3 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 font-semibold">Submit</a>
    </nav>
  </div>
);

const FeedbackNotice = ({ feedback, onDismiss }) => feedback && (
  <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
    <div
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg ${feedback.type === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
    >
      <span>{feedback.message}</span>
      <button type="button" onClick={onDismiss} className="text-xs font-semibold uppercase tracking-wide">
        Dismiss
      </button>
    </div>
  </div>
);

const PaymentStatus = ({ enabled, loading, paymentStatus, onPay }) => {
  if (!enabled || loading || !paymentStatus) return null;
  if (paymentStatus.is_paid) {
    return (
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">Payment confirmed</span>
          {paymentStatus.paid_at && (
            <span className="text-xs">Paid on {new Date(paymentStatus.paid_at).toLocaleDateString()}</span>
          )}
        </div>
        <span className="text-xs font-medium px-3 py-1 bg-emerald-100 rounded-full">Submission valid</span>
      </div>
    );
  }
  return (
    <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">Payment required</p>
          <p>Your predictions remain a draft until the $25.00 entry fee is paid.</p>
          <p className="text-xs">You can still edit paid entries until the deadline.</p>
        </div>
        <button type="button" onClick={onPay} className="min-h-11 bg-amber-500 px-6 py-2 text-sm font-semibold text-white">
          Pay now
        </button>
      </div>
    </div>
  );
};

const SubmissionWindowStatus = ({ status }) => status && (
  <div className={`p-4 rounded-lg border mb-6 ${status.is_open
    ? 'bg-emerald-50 border-emerald-200'
    : 'bg-rose-50 border-rose-200'}`}
  >
    <p className={`font-semibold ${status.is_open ? 'text-emerald-800' : 'text-rose-800'}`}>
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
  onPay,
  isVerifying,
  submissionStatus,
}) => (
  <>
    <SubmissionPageHeader season={season} />
    <FeedbackNotice feedback={feedback} onDismiss={onDismissFeedback} />
    {entryFeeEnabled && entryFeeError && (
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <div><strong>Entry fee status unavailable</strong><p>{entryFeeErrorMessage}</p></div>
        <button type="button" onClick={onRetryEntryFee} className="min-h-11 border border-amber-300 px-4">Retry</button>
      </div>
    )}
    <PaymentStatus enabled={entryFeeEnabled} loading={paymentStatusLoading} paymentStatus={paymentStatus} onPay={onPay} />
    {isVerifying && <div className="mb-8 border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">Verifying your payment...</div>}
    <SubmissionWindowStatus status={submissionStatus} />
  </>
);

export default SubmissionPageStatus;
