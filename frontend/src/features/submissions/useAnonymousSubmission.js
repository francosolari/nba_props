import { useCallback } from 'react';

const useAnonymousSubmission = ({
  isAuthenticated,
  seasonSlug,
  standingsBoardRef,
  setFeedback,
  setAccountPromptAction,
  setHasChanges,
}) => {
  const requestAccount = useCallback(
    (action = 'save') => setAccountPromptAction(action),
    [setAccountPromptAction],
  );

  const saveAnonymousDraft = useCallback(async (action) => {
    if (isAuthenticated) return false;
    const standingsResult = standingsBoardRef.current
      ? await standingsBoardRef.current.saveStandings({
        slugOverride: seasonSlug,
        silent: true,
        force: true,
      })
      : { success: true };

    if (!standingsResult?.success) {
      setFeedback({
        type: 'error',
        message: 'We could not save this device draft. Please try again before leaving the page.',
      });
      return true;
    }

    requestAccount(action);
    setHasChanges(false);
    setFeedback({
      type: 'success',
      message: action === 'submit'
        ? 'Draft saved on this device. Create an account or log in to submit it.'
        : 'Draft saved on this device. Create an account to keep it across devices.',
    });
    return true;
  }, [isAuthenticated, requestAccount, seasonSlug, setFeedback, setHasChanges, standingsBoardRef]);

  return { requestAccount, saveAnonymousDraft };
};

export default useAnonymousSubmission;
