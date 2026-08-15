import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  useQuestions,
  useUserAnswers,
  useSubmitAnswers,
  useSubmissionStatus,
  useEntryFeeStatus,
  useUserContext,
  usePaymentStatus,
  usePaymentRedirectHandler,
} from '../hooks';
import StripePaymentModal from '../components/StripePaymentModal';
import SubmissionForm from '../features/submissions/SubmissionForm';
import SubmissionPageStatus from '../features/submissions/SubmissionPageStatus';
import { getQuestionGroupType, isAnswered } from '../features/submissions/submissionProgress';
import { getAxiosErrorMessage } from '../features/submissions/submissionErrors';
import useSubmissionOptions from '../features/submissions/useSubmissionOptions';
import useSubmissionProgress from '../features/submissions/useSubmissionProgress';
import useAnonymousSubmission from '../features/submissions/useAnonymousSubmission';
import '../styles/SubmissionsPage.css';

const FALLBACK_LATEST_SEASON = '2025-26';

const SubmissionsPage = ({ seasonSlug }) => {
  const [activeSeasonSlug, setActiveSeasonSlug] = useState(seasonSlug || null);
  const [seasonLoading, setSeasonLoading] = useState(!seasonSlug);
  const [latestSeasonSlug, setLatestSeasonSlug] = useState(FALLBACK_LATEST_SEASON);
  const [feedback, setFeedback] = useState(null);
  const [accountPromptAction, setAccountPromptAction] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const standingsBoardRef = useRef(null);

  const effectiveSeasonSlug = seasonSlug || activeSeasonSlug;
  const { data: userContext, isLoading: userContextLoading } = useUserContext();
  const username = userContext?.username || null;
  const isAuthenticated = !!userContext?.is_authenticated;
  const entryFeeEnabled = !!effectiveSeasonSlug && isAuthenticated;

  const {
    data: paymentStatus,
    isLoading: paymentStatusLoading,
    refetch: refetchPaymentStatus,
  } = usePaymentStatus(effectiveSeasonSlug, { enabled: entryFeeEnabled });

  const {
    isVerifying,
    verificationSuccess,
    paymentData,
    clearUrlParams,
  } = usePaymentRedirectHandler(effectiveSeasonSlug);

  useEffect(() => {
    if (verificationSuccess && paymentData?.is_paid) {
      setFeedback({
        type: 'success',
        message: 'Payment confirmed. Your submission is now valid, and you can still edit until the deadline.',
      });
      clearUrlParams();
      refetchPaymentStatus();
    }
  }, [verificationSuccess, paymentData, clearUrlParams, refetchPaymentStatus]);

  useEffect(() => {
    if (seasonSlug || activeSeasonSlug) {
      setSeasonLoading(false);
      return;
    }

    let cancelled = false;

    const fetchLatestSeason = async () => {
      setSeasonLoading(true);
      try {
        const { data } = await axios.get('/api/v2/latest-season');
        const resolvedSlug = data?.slug || FALLBACK_LATEST_SEASON;
        if (!cancelled) {
          setLatestSeasonSlug(resolvedSlug);
          if (!seasonSlug) {
            setActiveSeasonSlug(resolvedSlug);
          }
        }
      } catch (error) {
        console.error('Failed to fetch latest season slug', error);
        if (!cancelled) {
          setLatestSeasonSlug(FALLBACK_LATEST_SEASON);
          setActiveSeasonSlug(FALLBACK_LATEST_SEASON);
        }
      } finally {
        if (!cancelled) {
          setSeasonLoading(false);
        }
      }
    };

    fetchLatestSeason();

    return () => {
      cancelled = true;
    };
  }, [seasonSlug, activeSeasonSlug]);

  const {
    data: questionsData,
    dataUpdatedAt: questionsUpdatedAt,
    isLoading: questionsLoading,
    isError: questionsError,
    error: questionsErrorObj,
    refetch: refetchQuestions,
  } = useQuestions(effectiveSeasonSlug);
  const { data: userAnswersData } = useUserAnswers(effectiveSeasonSlug, {
    enabled: !!effectiveSeasonSlug && isAuthenticated,
  });
  const statusHydration = questionsData?.submission_status;
  const { data: statusData } = useSubmissionStatus(effectiveSeasonSlug, {
    enabled: !!effectiveSeasonSlug && !questionsLoading && !questionsError,
    initialData: statusHydration || undefined,
    initialDataUpdatedAt: statusHydration ? questionsUpdatedAt : undefined,
  });
  const submitMutation = useSubmitAnswers();
  const {
    isLoading: entryFeeLoadingRaw,
    isError: entryFeeError,
    error: entryFeeErrorObj,
    refetch: refetchEntryFee,
  } = useEntryFeeStatus(effectiveSeasonSlug, { enabled: entryFeeEnabled });
  const entryFeeLoading = entryFeeEnabled ? entryFeeLoadingRaw : false;
  const questions = questionsData?.questions || [];
  const submissionOptions = useSubmissionOptions({ questions, seasonSlug: effectiveSeasonSlug });
  const submissionProgress = useSubmissionProgress({
    seasonSlug: effectiveSeasonSlug,
    questions,
    userAnswersData,
  });
  const {
    answers,
    hasChanges,
    setHasChanges,
    handleAnswerChange,
    groupedQuestions,
    missingQuestions,
    completedCount,
    progress,
    activeGroup,
    setActiveGroupType,
    validationAttempted,
    setValidationAttempted,
  } = submissionProgress;
  const entryFeeErrorMessage = entryFeeError
    ? getAxiosErrorMessage(
      entryFeeErrorObj,
      'We could not load your entry fee status. Payments will still be tracked once the connection returns.'
    )
    : null;
  const questionsErrorMessage = questionsError
    ? getAxiosErrorMessage(
      questionsErrorObj,
      'We could not load the latest prediction questions. Please try again in a moment.'
    )
    : null;
  const { requestAccount, saveAnonymousDraft } = useAnonymousSubmission({
    isAuthenticated,
    seasonSlug: effectiveSeasonSlug,
    standingsBoardRef,
    setFeedback,
    setAccountPromptAction,
    setHasChanges,
  });

  const handleSubmit = async (action = 'submit') => {
    if (await saveAnonymousDraft(action)) return;

    if (action === 'submit' && missingQuestions.length > 0) {
      const unansweredLabel = missingQuestions.length === 1
        ? '1 unanswered question remains. Complete it before submitting, or save for later.'
        : `${missingQuestions.length} unanswered questions remain. Complete them before submitting, or save for later.`;
      const firstMissingGroup = getQuestionGroupType(missingQuestions[0]);

      setValidationAttempted(true);
      setActiveGroupType(firstMissingGroup);
      setFeedback({ type: 'error', message: unansweredLabel });

      const missingSection = document.getElementById(`question-group-${firstMissingGroup}`);
      if (missingSection && typeof missingSection.scrollIntoView === 'function') {
        missingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    let slugToUse = effectiveSeasonSlug;
    if (!slugToUse || slugToUse === 'current') {
      try {
        const { data } = await axios.get('/api/v2/latest-season');
        const resolvedSlug = data?.slug || FALLBACK_LATEST_SEASON;
        slugToUse = resolvedSlug;
        setLatestSeasonSlug(resolvedSlug);
        setActiveSeasonSlug((prev) => (prev && prev !== 'current' ? prev : resolvedSlug));
      } catch (error) {
        slugToUse = FALLBACK_LATEST_SEASON;
        setLatestSeasonSlug(FALLBACK_LATEST_SEASON);
        setActiveSeasonSlug((prev) => prev || FALLBACK_LATEST_SEASON);
      }
    }

    if (!slugToUse) {
      slugToUse = FALLBACK_LATEST_SEASON;
      setActiveSeasonSlug((prev) => prev || FALLBACK_LATEST_SEASON);
    }

    if (!slugToUse) {
      setFeedback({
        type: 'error',
        message: 'Season is not ready yet. Please try again shortly.',
      });
      return;
    }

    if (standingsBoardRef.current) {
      const standingsResult = await standingsBoardRef.current.saveStandings({
        slugOverride: slugToUse,
        silent: true,
        force: true,
      });

      if (!standingsResult?.success) {
        const rawError = standingsResult?.error;
        const errorMessage = rawError
          ? getAxiosErrorMessage(rawError, 'We could not save your standings predictions. Please try again.')
          : 'We could not save your standings predictions. Please try again.';
        setFeedback({ type: 'error', message: errorMessage });
        return;
      }

      if (standingsResult.slug && standingsResult.slug !== slugToUse) {
        slugToUse = standingsResult.slug;
        if (!effectiveSeasonSlug) {
          setActiveSeasonSlug((prev) => prev || standingsResult.slug);
        }
      }
    }

    const answersArray = questions
      .filter((question) => isAnswered(answers[question.id]))
      .map((question) => ({
        question_id: question.id,
        answer: String(answers[question.id]),
      }));

    try {
      await submitMutation.mutateAsync({ seasonSlug: slugToUse, answers: answersArray });
      if (!effectiveSeasonSlug) {
        setActiveSeasonSlug(slugToUse);
      }
      setHasChanges(false);
      setValidationAttempted(false);
      localStorage.removeItem(`submissions_${slugToUse}`);
      localStorage.removeItem(`submission_standings_${slugToUse}`);

      // Check payment status after submission
      let needsPayment = false;
      if (entryFeeEnabled && action === 'submit') {
        try {
          // Refresh payment status
          await refetchPaymentStatus();
          needsPayment = !paymentStatus?.is_paid;
        } catch (_) {
          // If we can't check payment status, assume payment is needed
          needsPayment = true;
        }
      }

      const successMessage =
        action === 'save'
          ? 'Progress saved. You can return and finish any time before the deadline.'
          : needsPayment
            ? 'Predictions saved as draft. Payment required to finalize your submission.'
            : 'Predictions submitted successfully!';

      setFeedback({
        type: needsPayment ? 'warning' : 'success',
        message: successMessage,
      });

      // Show payment modal if payment is required
      if (needsPayment) {
        setShowPaymentModal(true);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getAxiosErrorMessage(error, 'Failed to submit your predictions. Please try again.'),
      });
    }
  };

  const submissionStatus = statusData || questionsData?.submission_status || null;
  const displaySeasonSlug = effectiveSeasonSlug && effectiveSeasonSlug !== 'current'
    ? effectiveSeasonSlug
    : latestSeasonSlug;
  const isReadOnly = !submissionStatus?.is_open;

  if (seasonLoading || !effectiveSeasonSlug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400 text-2xl">Loading season...</div>
      </div>
    );
  }

  if (questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400 text-2xl">Loading questions...</div>
      </div>
    );
  }

  if (questionsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
            We can't load submissions right now
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">{questionsErrorMessage}</p>
          <button
            type="button"
            onClick={() => refetchQuestions()}
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="court-submissions-page min-h-screen py-8 md:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SubmissionPageStatus
            season={displaySeasonSlug}
            feedback={feedback}
            onDismissFeedback={() => setFeedback(null)}
            entryFeeEnabled={entryFeeEnabled}
            entryFeeError={entryFeeError}
            entryFeeErrorMessage={entryFeeErrorMessage}
            onRetryEntryFee={refetchEntryFee}
            paymentStatusLoading={paymentStatusLoading || entryFeeLoading}
            paymentStatus={paymentStatus}
            onPay={() => setShowPaymentModal(true)}
            isVerifying={isVerifying}
            submissionStatus={submissionStatus}
            isAuthenticated={isAuthenticated}
            accountPromptAction={accountPromptAction}
            onDismissAccountPrompt={() => setAccountPromptAction(null)}
          />
          <SubmissionForm
            standingsBoardRef={standingsBoardRef}
            userContextLoading={userContextLoading}
            isAuthenticated={isAuthenticated}
            username={username}
            seasonSlug={effectiveSeasonSlug}
            isReadOnly={isReadOnly}
            questions={questions}
            groupedQuestions={groupedQuestions}
            activeGroup={activeGroup}
            answers={answers}
            completedCount={completedCount}
            progress={progress}
            handleAnswerChange={handleAnswerChange}
            {...submissionOptions}
            validationAttempted={validationAttempted}
            missingCount={missingQuestions.length}
            hasChanges={hasChanges}
            submitPending={submitMutation.isPending}
            onSave={() => handleSubmit('save')}
            onSubmit={() => handleSubmit('submit')}
            onAuthenticationRequired={requestAccount}
          />
          {showPaymentModal && effectiveSeasonSlug && (
            <StripePaymentModal
              seasonSlug={effectiveSeasonSlug}
              onClose={() => setShowPaymentModal(false)}
              onPaymentInitiated={() => {
                setShowPaymentModal(false);
                setFeedback({ type: 'info', message: 'Redirecting to secure payment...' });
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default SubmissionsPage;
