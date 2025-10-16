// File: frontend/src/pages/SubmissionsPage.jsx
/**
 * SubmissionsPage - Light mode interface for submitting predictions
 * Features: deadline enforcement, auto-save, progress tracking, grouped sections
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  useQuestions,
  useUserAnswers,
  useSubmitAnswers,
  useSubmissionStatus,
  useEntryFeeStatus,
  useUpdateEntryFeeStatus,
  useUserContext,
} from '../hooks/useSubmissions';
import SelectComponent from '../components/SelectComponent';
import EditablePredictionBoard from '../components/EditablePredictionBoard';
import '../styles/SubmissionsPage.css';

const QUESTION_GROUP_META = {
  superlative: {
    title: 'Awards & Superlatives',
    description: 'Pick the season award winners and standout performers.',
  },
  prop: {
    title: 'Prop Bets',
    description: 'Forecast over/under lines and yes/no season outcomes.',
  },
  player_stat: {
    title: 'Player Stat Challenges',
    description: 'Predict statistical totals for standout player performances.',
  },
  head_to_head: {
    title: 'Head-to-Head Matchups',
    description: 'Choose the winner in marquee matchups.',
  },
  ist: {
    title: 'In Season Tournament: NBA Cup',
    description: 'Make your picks for the NBA In-Season Tournament.',
  },
  nba_finals: {
    title: 'NBA Finals Predictions',
    description: 'Project the teams and outcomes of the Finals.',
  },
  other: {
    title: 'Additional Predictions',
    description: 'Questions that do not fit other categories.',
  },
};

const QUESTION_GROUP_ORDER = [
  'superlative',
  'prop',
  'player_stat',
  'head_to_head',
  'ist',
  'nba_finals',
  'other',
];

const FALLBACK_LATEST_SEASON = '2025-26';

const UNKNOWN_TEAM_LOGO = '/static/img/teams/unknown.svg';
const TEAM_LOGO_SLUG_OVERRIDES = {
  'los-angeles-clippers': 'la-clippers',
};

const toTeamSlug = (teamName) => {
  if (!teamName) return null;
  const baseSlug = teamName
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return TEAM_LOGO_SLUG_OVERRIDES[baseSlug] || baseSlug;
};

const getTeamLogoSrc = (teamName) => {
  const slug = toTeamSlug(teamName);
  if (!slug) return UNKNOWN_TEAM_LOGO;
  // Provide a couple of fallbacks that match existing asset naming patterns.
  const candidates = [
    `/static/img/teams/${slug}.png`,
    `/static/img/teams/${slug}.svg`,
    `/static/img/teams/${slug}-logo.png`,
    `/static/img/teams/${slug}-logo-alt.png`,
  ];
  return candidates[0] || UNKNOWN_TEAM_LOGO;
};

const extractGroupMeta = (istGroup) => {
  if (!istGroup) {
    return { conference: '', label: '', short: '' };
  }
  const match = istGroup.match(/(East|West)\s+Group\s+([A-Z])/i);
  if (match) {
    const conference = match[1];
    const groupLetter = match[2];
    return {
      conference,
      label: `${conference} Group ${groupLetter.toUpperCase()}`,
      short: groupLetter.toUpperCase(),
    };
  }
  const cleaned = istGroup.trim();
  return { conference: cleaned.split(' ')[0] || '', label: cleaned, short: cleaned };
};

const resolveConferenceKey = (value) => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes('west')) return 'West';
  if (lower.includes('east')) return 'East';
  return null;
};

const buildRecordSummary = (team) => {
  const parts = [];
  if (typeof team.wins === 'number' && typeof team.losses === 'number') {
    parts.push(`${team.wins}-${team.losses}`);
  }
  if (typeof team.pointDifferential === 'number') {
    const diff = team.pointDifferential;
    parts.push(`PD ${diff > 0 ? '+' : diff < 0 ? '' : ''}${diff}`);
  }
  return parts.join(' | ');
};

const CONFERENCE_THEME = {
  east: {
    selectedBg: 'bg-[var(--nba-blue-50)]',
    selectedBorder: 'border-[var(--nba-blue-400)]',
    selectedText: 'text-[var(--nba-blue-700)]',
    ring: 'ring-[var(--nba-blue-200)]',
    hoverBorder: 'hover:border-[var(--nba-blue-400)]',
    hoverBg: 'hover:bg-[var(--nba-blue-50)]',
    pillBg: 'bg-[var(--nba-blue-100)]',
    pillText: 'text-[var(--nba-blue-700)]',
  },
  west: {
    selectedBg: 'bg-[var(--nba-red-50)]',
    selectedBorder: 'border-[var(--nba-red-400)]',
    selectedText: 'text-[var(--nba-red-700)]',
    ring: 'ring-[var(--nba-red-200)]',
    hoverBorder: 'hover:border-[var(--nba-red-400)]',
    hoverBg: 'hover:bg-[var(--nba-red-50)]',
    pillBg: 'bg-[var(--nba-red-100)]',
    pillText: 'text-[var(--nba-red-700)]',
  },
  default: {
    selectedBg: 'bg-slate-100',
    selectedBorder: 'border-slate-300',
    selectedText: 'text-slate-800',
    ring: 'ring-slate-200',
    hoverBorder: 'hover:border-slate-300',
    hoverBg: 'hover:bg-slate-100',
    pillBg: 'bg-slate-100',
    pillText: 'text-slate-600',
  },
};

const getConferenceTheme = (conferenceLabel) => {
  const key = conferenceLabel?.toLowerCase();
  if (!key) return CONFERENCE_THEME.default;
  if (key === 'east' || key.startsWith('east')) return CONFERENCE_THEME.east;
  if (key === 'west' || key.startsWith('west')) return CONFERENCE_THEME.west;
  return CONFERENCE_THEME.default;
};

const matchQuestionByKeywords = (questionsList, keywords) => {
  if (!Array.isArray(questionsList) || questionsList.length === 0) return null;
  return (
    questionsList.find((question) => {
      const text = (question.text || '').toLowerCase();
      return keywords.every((keyword) => text.includes(keyword.toLowerCase()));
    }) || null
  );
};

const getAxiosErrorMessage = (error, fallbackMessage = 'Something went wrong. Please try again.') => {
  if (axios && typeof axios.isAxiosError === 'function' && axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'We could not reach the server. Check your connection and try again.';
    }
    return (
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      fallbackMessage
    );
  }
  return error?.message || fallbackMessage;
};

const PaymentPromptModal = ({ details, onMarkPaid, onClose }) => {
  if (!details) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label="Close payment prompt"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Complete Your Submission</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Your predictions are in! The final step is to pay the ${details.amount_due || '25.00'} entry fee.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={details.venmo_web_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-700"
          >
            Pay with Venmo (@{details.venmo_username})
          </a>
          <button
            onClick={onMarkPaid}
            className="w-full inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-6 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-600"
          >
            I've Already Paid
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          You can also close this and pay later. We'll remind you.
        </p>
      </div>
    </div>
  );
};

const SubmissionsPage = ({ seasonSlug }) => {
  const [activeSeasonSlug, setActiveSeasonSlug] = useState(seasonSlug || null);
  const [seasonLoading, setSeasonLoading] = useState(!seasonSlug);
  const [answers, setAnswers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [playerOptions, setPlayerOptions] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [loadingAuxData, setLoadingAuxData] = useState(false);
  const [istStandings, setIstStandings] = useState(null);
  const [loadingIstStandings, setLoadingIstStandings] = useState(false);
  const [istStandingsError, setIstStandingsError] = useState(null);
  const standingsBoardRef = useRef(null);
  const progressSentinelRef = useRef(null);
  const [latestSeasonSlug, setLatestSeasonSlug] = useState(FALLBACK_LATEST_SEASON);
  const [feedback, setFeedback] = useState(null);
  const [isProgressSticky, setIsProgressSticky] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetailsForModal, setPaymentDetailsForModal] = useState(null);

  const effectiveSeasonSlug = seasonSlug || activeSeasonSlug;
  const { data: userContext, isLoading: userContextLoading } = useUserContext();
  const username = userContext?.username || null;
  const entryFeeEnabled = !!effectiveSeasonSlug && !!userContext?.is_authenticated;

  // Discover the latest season when no slug provided
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

  const storageKey = useMemo(() => {
    return effectiveSeasonSlug ? `submissions_${effectiveSeasonSlug}` : null;
  }, [effectiveSeasonSlug]);

  // Fetch data
  const {
    data: questionsData,
    isLoading: questionsLoading,
    isError: questionsError,
    error: questionsErrorObj,
    refetch: refetchQuestions,
  } = useQuestions(effectiveSeasonSlug);
  const { data: userAnswersData } = useUserAnswers(effectiveSeasonSlug);
  const { data: statusData } = useSubmissionStatus(effectiveSeasonSlug);
  const submitMutation = useSubmitAnswers();
  const {
    data: entryFeeData,
    isLoading: entryFeeLoadingRaw,
    isError: entryFeeError,
    error: entryFeeErrorObj,
    refetch: refetchEntryFee,
  } = useEntryFeeStatus(effectiveSeasonSlug, { enabled: entryFeeEnabled });
  const updateEntryFeeMutation = useUpdateEntryFeeStatus();
  const entryFeeLoading = entryFeeEnabled ? entryFeeLoadingRaw : false;

  // Reset answers when season changes
  useEffect(() => {
    if (!effectiveSeasonSlug) return;
    setAnswers({});
    setHasChanges(false);
  }, [effectiveSeasonSlug]);

  // Load cached answers from localStorage on season changes
  useEffect(() => {
    if (!storageKey) return;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          setAnswers(parsed);
          setHasChanges(true);
        }
      } catch (err) {
        console.warn('Failed to parse cached submissions', err);
      }
    }
  }, [storageKey]);

  // Load existing answers from server
  useEffect(() => {
    if (userAnswersData?.answers) {
      const existingAnswers = {};
      userAnswersData.answers.forEach((ans) => {
        existingAnswers[ans.question_id] = ans.answer;
      });
      setAnswers(existingAnswers);
      setHasChanges(false);
    }
  }, [userAnswersData]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!storageKey) return;
    if (hasChanges && Object.keys(answers).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, storageKey, hasChanges]);

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setHasChanges(true);
  }, []);

  // Fetch auxiliary reference data when needed
  useEffect(() => {
    const questions = questionsData?.questions || [];
    const needsPlayers = questions.some((q) => q.question_type === 'superlative');
    const needsTeams = questions.some((q) => ['head_to_head', 'ist', 'nba_finals'].includes(q.question_type));

    if (!needsPlayers && !needsTeams) {
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      setLoadingAuxData(true);
      try {
        const requests = [];
        if (needsPlayers && playerOptions.length === 0) {
          requests.push(
            axios.get('/api/v2/players/').then(
              (res) =>
                res.data?.players?.map((player) => ({
                  value: player.id,
                  label: player.name,
                })) || [],
            ),
          );
        } else {
          requests.push(Promise.resolve(playerOptions));
        }

        if (needsTeams && teamOptions.length === 0) {
          requests.push(
            axios.get('/api/v2/teams/').then(
              (res) =>
                res.data?.teams?.map((team) => ({
                  value: team.id,
                  label: team.name,
                  conference: team.conference || null,
                })) || [],
            ),
          );
        } else {
          requests.push(Promise.resolve(teamOptions));
        }

        const [players, teams] = await Promise.all(requests);
        if (!cancelled) {
          if (needsPlayers && players.length) {
            setPlayerOptions(players);
          }
          if (needsTeams && teams.length) {
            setTeamOptions(teams);
          }
        }
      } catch (error) {
        console.error('Failed to fetch reference data', error);
      } finally {
        if (!cancelled) {
          setLoadingAuxData(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [questionsData, playerOptions.length, teamOptions.length]);

  // Fetch IST standings to power the NBA Cup picker
  useEffect(() => {
    if (!effectiveSeasonSlug) {
      setIstStandings(null);
      setIstStandingsError(null);
      return;
    }

    const questions = questionsData?.questions || [];
    const hasIstQuestions = questions.some((q) => q.question_type === 'ist');
    if (!hasIstQuestions) {
      setIstStandings(null);
      setIstStandingsError(null);
      return;
    }

    let cancelled = false;
    const fetchIstStandings = async () => {
      setLoadingIstStandings(true);
      setIstStandingsError(null);
      try {
        const { data } = await axios.get(`/api/v2/standings/ist/${effectiveSeasonSlug}`);
        if (!cancelled) {
          setIstStandings(data);
        }
      } catch (error) {
        if (!cancelled) {
          setIstStandings(null);
          setIstStandingsError(
            getAxiosErrorMessage(error, 'Unable to load NBA Cup group standings right now.'),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingIstStandings(false);
        }
      }
    };

    fetchIstStandings();

    return () => {
      cancelled = true;
    };
  }, [effectiveSeasonSlug, questionsData]);

  const entryFeeStatus = entryFeeEnabled && entryFeeData ? entryFeeData : null;
  const entryFeePaidAtDisplay = useMemo(() => {
    if (!entryFeeStatus?.paid_at) return null;
    try {
      return new Date(entryFeeStatus.paid_at).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (_) {
      return entryFeeStatus.paid_at;
    }
  }, [entryFeeStatus]);
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

  const handleSubmit = async (action = 'submit') => {
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

    const answersArray = Object.entries(answers).map(([question_id, answer]) => ({
      question_id: parseInt(question_id, 10),
      answer: String(answer),
    }));

    try {
      await submitMutation.mutateAsync({ seasonSlug: slugToUse, answers: answersArray });
      if (!effectiveSeasonSlug) {
        setActiveSeasonSlug(slugToUse);
      }
      setHasChanges(false);
      localStorage.removeItem(`submissions_${slugToUse}`);

      let latestEntryFee = entryFeeEnabled ? entryFeeStatus : null;
      if (
        entryFeeEnabled &&
        (!latestEntryFee || latestEntryFee.season_slug !== slugToUse)
      ) {
        try {
          const { data } = await axios.get(`/api/v2/submissions/entry-fee/${slugToUse}`);
          latestEntryFee = data;
        } catch (_) {
          latestEntryFee = entryFeeStatus;
        }
      }

      const needsVenmoRedirect =
        entryFeeEnabled && action === 'submit' && latestEntryFee && latestEntryFee.is_paid === false;
      const successMessage =
        action === 'save'
          ? 'Progress saved. You can return and finish any time before the deadline.'
          : needsVenmoRedirect
            ? `Predictions submitted! Next, finish by paying $${latestEntryFee?.amount_due || '25.00'} on Venmo.`
            : 'Predictions submitted successfully!';

      setFeedback({
        type: 'success',
        message: successMessage,
      });

      if (needsVenmoRedirect && latestEntryFee?.venmo_web_url) {
        setPaymentDetailsForModal(latestEntryFee);
        setShowPaymentModal(true);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getAxiosErrorMessage(error, 'Failed to submit your predictions. Please try again.'),
      });
    }
  };

  const handleOpenVenmo = useCallback(() => {
    if (!entryFeeEnabled || !entryFeeStatus?.venmo_web_url) {
      return;
    }
    window.location.assign(entryFeeStatus.venmo_web_url);
  }, [entryFeeEnabled, entryFeeStatus]);

  const handleMarkEntryFeePaid = useCallback(async () => {
    if (!entryFeeEnabled || !effectiveSeasonSlug) return;
    try {
      await updateEntryFeeMutation.mutateAsync({ seasonSlug: effectiveSeasonSlug, isPaid: true });
      setFeedback({
        type: 'success',
        message: 'Thanks! We marked your entry fee as paid.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getAxiosErrorMessage(error, 'Unable to update entry fee status. Please try again.'),
      });
    }
  }, [entryFeeEnabled, effectiveSeasonSlug, updateEntryFeeMutation]);

  const handleMarkEntryFeeUnpaid = useCallback(async () => {
    if (!entryFeeEnabled || !effectiveSeasonSlug) return;
    try {
      await updateEntryFeeMutation.mutateAsync({ seasonSlug: effectiveSeasonSlug, isPaid: false });
      setFeedback({
        type: 'success',
        message: 'Entry fee status reset. We will keep reminding you until it is marked as paid.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getAxiosErrorMessage(error, 'Unable to update entry fee status. Please try again.'),
      });
    }
  }, [entryFeeEnabled, effectiveSeasonSlug, updateEntryFeeMutation]);

  const submissionStatus = useMemo(() => {
    return statusData || questionsData?.submission_status || null;
  }, [statusData, questionsData]);

  const displaySeasonSlug = useMemo(() => {
    if (effectiveSeasonSlug && effectiveSeasonSlug !== 'current') {
      return effectiveSeasonSlug;
    }
    return latestSeasonSlug;
  }, [effectiveSeasonSlug, latestSeasonSlug]);

  const questions = questionsData?.questions || [];
  const groupedQuestions = useMemo(() => {
    if (!questions.length) {
      return [];
    }

    const grouped = questions.reduce((acc, question) => {
      const typeKey = QUESTION_GROUP_META[question.question_type] ? question.question_type : 'other';
      if (!acc[typeKey]) {
        acc[typeKey] = [];
      }
      acc[typeKey].push(question);
      return acc;
    }, {});

    return QUESTION_GROUP_ORDER.filter((type) => grouped[type]?.length).map((type) => {
      const meta = QUESTION_GROUP_META[type] || QUESTION_GROUP_META.other;
      return {
        type,
        title: meta.title,
        description: meta.description,
        questions: grouped[type],
      };
    });
  }, [questions]);

  const completedCount = Object.values(answers).filter(
    (value) => value !== undefined && value !== null && value !== '',
  ).length;
  const progress = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;
  const isReadOnly = !submissionStatus?.is_open;

  useEffect(() => {
    const sentinel = progressSentinelRef.current;
    if (!sentinel || isReadOnly || questions.length === 0) {
      setIsProgressSticky(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsProgressSticky(!entry.isIntersecting);
      },
      { threshold: 1.0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [questions.length, isReadOnly]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 py-8 md:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <span className="inline-flex items-center justify-center md:justify-start gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-sky-600 dark:text-sky-400">
              {displaySeasonSlug} Season
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
              Submit Your Predictions
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
              Lock in your regular season standings and answer every question before the window closes.
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center md:justify-end gap-2 text-sm">
            <a
              href="#standings"
              className="px-3 py-2 rounded-full border border-sky-200/80 dark:border-sky-700 bg-white/60 dark:bg-slate-800/60 text-sky-600 dark:text-sky-400 font-semibold shadow-sm hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
            >
              Standings
            </a>
            <a
              href="#questions"
              className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Questions
            </a>
            <a
              href="#submit"
              className="px-3 py-2 rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              Submit
            </a>
          </nav>
        </div>

        {feedback && (
          <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
            <div
              className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
                feedback.type === 'error'
                  ? 'border-rose-200 dark:border-rose-700 bg-rose-50/95 dark:bg-rose-900/95 text-rose-700 dark:text-rose-300'
                  : 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/95 dark:bg-emerald-900/95 text-emerald-700 dark:text-emerald-300'
              }`}
              role={feedback.type === 'error' ? 'alert' : 'status'}
            >
              <span>{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {entryFeeEnabled && entryFeeError && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-4 py-4 text-sm text-amber-800 dark:text-amber-300 shadow-sm">
            <div className="space-y-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Entry fee status unavailable</p>
              <p>{entryFeeErrorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => refetchEntryFee()}
              className="inline-flex items-center justify-center rounded-full border border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-slate-600"
            >
              Retry
            </button>
          </div>
        )}

        {entryFeeEnabled && !entryFeeError && !entryFeeLoading && entryFeeStatus && (
          entryFeeStatus.is_paid ? (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">Entry fee recorded</span>
                {entryFeePaidAtDisplay && (
                  <span className="text-emerald-700/80 dark:text-emerald-400/80">Marked on {entryFeePaidAtDisplay}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleMarkEntryFeeUnpaid}
                disabled={updateEntryFeeMutation.isPending}
                className="inline-flex items-center rounded-full border border-emerald-300 dark:border-emerald-600 bg-white dark:bg-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark unpaid
              </button>
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-4 py-4 text-sm text-amber-800 dark:text-amber-300 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">Entry fee reminder</p>
                  <p>
                    Send ${entryFeeStatus.amount_due} via Venmo to @{entryFeeStatus.venmo_username}. Add "
                    {entryFeeStatus.payment_note}
                    " so we can match it quickly.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleOpenVenmo}
                    className="inline-flex items-center justify-center rounded-full border border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-slate-600"
                  >
                    Pay with Venmo
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkEntryFeePaid}
                    disabled={updateEntryFeeMutation.isPending}
                    className="inline-flex items-center justify-center rounded-full bg-amber-500 dark:bg-amber-600 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-amber-600 dark:hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    I've paid
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                We'll keep this reminder visible until you mark the entry fee as paid.
              </p>
            </div>
          )
        )}

        {/* Deadline Banner */}
        {submissionStatus && (
          <div
            className={`p-4 rounded-lg border mb-6 ${
              submissionStatus.is_open ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700' : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700'
            }`}
          >
            <p className={`font-semibold ${submissionStatus.is_open ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
              {submissionStatus.message}
            </p>
            {submissionStatus.days_until_close !== null &&
              submissionStatus.days_until_close !== undefined && (
                <p
                  className={`text-sm mt-1 ${
                    submissionStatus.is_open ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {submissionStatus.days_until_close} day(s) remaining
                </p>
              )}
            {submissionStatus.days_until_open !== null &&
              submissionStatus.days_until_open !== undefined &&
              !submissionStatus.is_open && (
                <p className="text-sm mt-1 text-rose-700 dark:text-rose-400">
                  Opens in {submissionStatus.days_until_open} day(s)
                </p>
              )}
          </div>
        )}

        {/* Regular Season Standings */}
        <section id="standings" className="mb-10">
          <header className="mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">Regular Season Standings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Drag and drop teams in each conference to set your projected final standings.
            </p>
          </header>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            {userContextLoading ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading standings...</div>
            ) : userContext ? (
              <EditablePredictionBoard
                ref={standingsBoardRef}
                seasonSlug={effectiveSeasonSlug}
                canEdit={!isReadOnly}
                username={username}
              />
            ) : (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Sign in to manage your regular season standings predictions.
              </div>
            )}
          </div>
        </section>

        {/* Progress Bar */}
        {!isReadOnly && questions.length > 0 && (
          <>
            <div ref={progressSentinelRef} aria-hidden="true" className="h-1" />
            <div
              className={`mb-6 ${
                isProgressSticky
                  ? 'sticky top-4 z-30 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 px-4 py-3 shadow-md'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>Progress</span>
                <span>
                  {completedCount} / {questions.length}
                </span>
              </div>
              <div className="mt-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 h-2">
                <div
                  className="bg-sky-500 dark:bg-sky-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                You can save progress and finish later—unanswered questions are totally fine.
              </p>
            </div>
          </>
        )}

        {/* Questions */}
        <div id="questions" className="space-y-10">
          {groupedQuestions.map((group) => (
            <section key={group.type}>
              <header className="mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{group.title}</h2>
                {group.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{group.description}</p>}
              </header>
              {group.type === 'ist' ? (
                <InSeasonTournamentSection
                  questions={group.questions}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                  isReadOnly={isReadOnly}
                  teamOptions={teamOptions}
                  loadingAuxData={loadingAuxData}
                  istStandings={istStandings}
                  loadingIstStandings={loadingIstStandings}
                  istStandingsError={istStandingsError}
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {group.questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      answer={answers[question.id]}
                      onChange={(value) => handleAnswerChange(question.id, value)}
                      isReadOnly={isReadOnly}
                      playerOptions={playerOptions}
                      teamOptions={teamOptions}
                      loadingAuxData={loadingAuxData}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Submit Button */}
        {!isReadOnly && (
          <div id="submit" className="mt-10 flex flex-col items-center gap-3">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => handleSubmit('save')}
                disabled={submitMutation.isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitMutation.isPending ? 'Saving…' : 'Save Progress'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('submit')}
                disabled={
                  submitMutation.isPending || !effectiveSeasonSlug || Object.keys(answers).length === 0
                }
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:shadow-none"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Predictions'}
              </button>
            </div>
            {hasChanges && <p className="text-amber-500 dark:text-amber-400 text-sm mt-1">You have unsaved changes</p>}
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              You can leave answers blank and return anytime—saving uses the same secure submit flow.
            </p>
          </div>
        )}

        {showPaymentModal && (
          <PaymentPromptModal
            details={paymentDetailsForModal}
            onClose={() => setShowPaymentModal(false)}
            onMarkPaid={async () => {
              await handleMarkEntryFeePaid();
              setShowPaymentModal(false);
            }}
          />
        )}
        </div>
      </div>
    </>
  );
};

// Question Card Component
const InSeasonTournamentSection = ({
  questions,
  answers,
  onAnswerChange,
  isReadOnly,
  teamOptions,
  loadingAuxData,
  istStandings,
  loadingIstStandings,
  istStandingsError,
}) => {
  const groupWinnerQuestions = useMemo(
    () => questions.filter((q) => q.prediction_type === 'group_winner'),
    [questions],
  );
  const wildcardQuestions = useMemo(
    () => questions.filter((q) => q.prediction_type === 'wildcard'),
    [questions],
  );
  const conferenceWinnerQuestions = useMemo(
    () => questions.filter((q) => q.prediction_type === 'conference_winner'),
    [questions],
  );
  const tiebreakerQuestions = useMemo(
    () => questions.filter((q) => q.prediction_type === 'tiebreaker'),
    [questions],
  );

  const groupsByConference = useMemo(() => {
    const base = { East: [], West: [] };
    groupWinnerQuestions.forEach((question) => {
      const key = (question.ist_group || '').toLowerCase().includes('west') ? 'West' : 'East';
      base[key].push(question);
    });
    return {
      East: base.East.slice().sort((a, b) => (a.ist_group || a.text).localeCompare(b.ist_group || b.text)),
      West: base.West.slice().sort((a, b) => (a.ist_group || a.text).localeCompare(b.ist_group || b.text)),
    };
  }, [groupWinnerQuestions]);

  const orderedGroupQuestions = useMemo(
    () => [...groupsByConference.East, ...groupsByConference.West],
    [groupsByConference],
  );

  const normalizeTeam = (team) => ({
    id: team?.team_id ?? team?.value ?? team?.id,
    name: team?.team_name ?? team?.label ?? team?.name ?? 'Unknown team',
    wins: typeof team?.wins === 'number' ? team.wins : null,
    losses: typeof team?.losses === 'number' ? team.losses : null,
    pointDifferential:
      typeof team?.point_differential === 'number'
        ? team.point_differential
        : typeof team?.pointDifferential === 'number'
          ? team.pointDifferential
          : null,
  });

  const conferenceTeamMap = useMemo(() => {
    const result = { East: [], West: [] };

    if (istStandings) {
      Object.entries(istStandings).forEach(([conferenceLabel, groups]) => {
        const key = resolveConferenceKey(conferenceLabel) || 'East';
        const unique = new Map();
        Object.values(groups || {}).forEach((teams) => {
          (teams || []).forEach((team) => {
            if (!unique.has(team.team_id)) {
              unique.set(team.team_id, normalizeTeam(team));
            }
          });
        });
        result[key] = Array.from(unique.values());
      });
    }

    if (!result.East.length || !result.West.length) {
      teamOptions.forEach((team) => {
        if (!team?.conference) return;
        const key = resolveConferenceKey(team.conference) || 'East';
        if (!result[key].some((entry) => String(entry.id) === String(team.value))) {
          result[key].push(
            normalizeTeam({
              team_id: team.value,
              team_name: team.label,
            }),
          );
        }
      });
    }

    result.East.sort((a, b) => a.name.localeCompare(b.name));
    result.West.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [istStandings, teamOptions]);

  const buildGroupTeams = (question) => {
    const confKey = resolveConferenceKey(question?.ist_group || question?.text);
    const standingsTeams = confKey ? istStandings?.[confKey]?.[question.ist_group] : null;
    if (standingsTeams && standingsTeams.length) {
      return standingsTeams.map(normalizeTeam);
    }
    if (confKey && conferenceTeamMap[confKey]?.length) {
      return conferenceTeamMap[confKey].map((team) => ({ ...team }));
    }
    return teamOptions.map((team) => normalizeTeam(team));
  };

  const buildConferenceTeams = (question, overrideConferenceKey = null) => {
    const resolvedKey =
      resolveConferenceKey(overrideConferenceKey) ||
      resolveConferenceKey(question?.ist_group || question?.text);
    if (resolvedKey && conferenceTeamMap[resolvedKey]?.length) {
      return conferenceTeamMap[resolvedKey].map((team) => ({ ...team }));
    }
    const fallback = teamOptions
      .filter((team) => resolveConferenceKey(team.conference) === resolvedKey || !resolvedKey)
      .map((team) => normalizeTeam(team));
    return fallback.length ? fallback : teamOptions.map((team) => normalizeTeam(team));
  };

  const finalBracketData = useMemo(() => {
    const east =
      matchQuestionByKeywords(conferenceWinnerQuestions, ['east', 'winner']) ||
      conferenceWinnerQuestions.find((q) =>
        (q.ist_group || '').toLowerCase().includes('east'),
      ) ||
      null;
    const west =
      matchQuestionByKeywords(conferenceWinnerQuestions, ['west', 'winner']) ||
      conferenceWinnerQuestions.find((q) =>
        (q.ist_group || '').toLowerCase().includes('west'),
      ) ||
      null;
    const champion =
      matchQuestionByKeywords(conferenceWinnerQuestions, ['champion']) ||
      conferenceWinnerQuestions.find((q) => {
        const label = (q.ist_group || q.text || '').toLowerCase();
        return !label.includes('east') && !label.includes('west');
      }) ||
      null;
    return { east, west, champion };
  }, [conferenceWinnerQuestions]);

  const { eastScoreQuestion, westScoreQuestion, additionalTiebreakers } = useMemo(() => {
    const eastScore =
      matchQuestionByKeywords(tiebreakerQuestions, ['east', 'point']) ||
      tiebreakerQuestions.find((question) => (question.text || '').toLowerCase().includes('east'));
    const westScore =
      matchQuestionByKeywords(tiebreakerQuestions, ['west', 'point']) ||
      tiebreakerQuestions.find((question) => (question.text || '').toLowerCase().includes('west'));
    const usedIds = new Set(
      [eastScore?.id, westScore?.id].filter((value) => typeof value !== 'undefined' && value !== null),
    );
    const extras = tiebreakerQuestions.filter((question) => !usedIds.has(question.id));
    return {
      eastScoreQuestion: eastScore || null,
      westScoreQuestion: westScore || null,
      additionalTiebreakers: extras,
    };
  }, [tiebreakerQuestions]);

  const eastTeams = useMemo(() => {
    if (!finalBracketData.east) return [];
    return buildConferenceTeams(finalBracketData.east, 'East').map((team) => ({
      value: team.id,
      label: team.name,
    }));
  }, [finalBracketData.east, conferenceTeamMap, teamOptions]);

  const westTeams = useMemo(() => {
    if (!finalBracketData.west) return [];
    return buildConferenceTeams(finalBracketData.west, 'West').map((team) => ({
      value: team.id,
      label: team.name,
    }));
  }, [finalBracketData.west, conferenceTeamMap, teamOptions]);

  const championOptions = useMemo(
    () =>
      teamOptions.map((team) => ({
        value: team.value,
        label: team.label,
      })),
    [teamOptions],
  );

  const getSelectedOption = (options, answer) =>
    options.find((option) => String(option.value) === String(answer)) || null;

  const eastSelected = finalBracketData.east
    ? getSelectedOption(eastTeams, answers[finalBracketData.east.id])
    : null;
  const westSelected = finalBracketData.west
    ? getSelectedOption(westTeams, answers[finalBracketData.west.id])
    : null;
  const championSelected = finalBracketData.champion
    ? getSelectedOption(championOptions, answers[finalBracketData.champion.id])
    : null;

  const eastScoreValue =
    typeof eastScoreQuestion?.id === 'number' || typeof eastScoreQuestion?.id === 'string'
      ? answers[eastScoreQuestion.id] ?? ''
      : '';
  const westScoreValue =
    typeof westScoreQuestion?.id === 'number' || typeof westScoreQuestion?.id === 'string'
      ? answers[westScoreQuestion.id] ?? ''
      : '';
  const championValue =
    typeof finalBracketData.champion?.id !== 'undefined'
      ? answers[finalBracketData.champion?.id] ?? ''
      : '';

  useEffect(() => {
    const championQuestionId = finalBracketData.champion?.id;
    if (!championQuestionId) return;
    if (!eastScoreQuestion || !westScoreQuestion) return;
    if (!eastSelected?.value || !westSelected?.value) return;
    if (isReadOnly) return;

    const eastScoreNum = Number(eastScoreValue);
    const westScoreNum = Number(westScoreValue);
    if (!Number.isFinite(eastScoreNum) || !Number.isFinite(westScoreNum)) return;
    if (eastScoreNum === westScoreNum) return;

    const inferredWinner = eastScoreNum > westScoreNum ? eastSelected.value : westSelected.value;
    if (!inferredWinner) return;
    if (String(championValue) === String(inferredWinner)) return;

    onAnswerChange(championQuestionId, inferredWinner);
  }, [
    championValue,
    eastScoreValue,
    westScoreValue,
    eastSelected?.value,
    westSelected?.value,
    finalBracketData.champion,
    eastScoreQuestion,
    westScoreQuestion,
    isReadOnly,
    onAnswerChange,
  ]);

  const renderTeamBubbleButton = (question, team) => {
    const teamId = team.id;
    const isSelected = String(answers[question.id]) === String(teamId);
    const recordSummary = buildRecordSummary(team);
    const logoSrc = getTeamLogoSrc(team.name);
    const groupMeta = extractGroupMeta(question.ist_group);
    const theme = getConferenceTheme(groupMeta.conference);

    return (
      <button
        key={teamId}
        type="button"
        onClick={() => !isReadOnly && onAnswerChange(question.id, teamId)}
        disabled={isReadOnly}
        className={`flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-3xl border px-4 py-5 text-center text-sm font-semibold transition ${
          isSelected
            ? `${theme.selectedBorder} ${theme.selectedBg} ${theme.selectedText} shadow-sm ring-2 ${theme.ring}`
            : `border-slate-200 bg-white/90 text-slate-700 ${theme.hoverBorder} ${theme.hoverBg}`
        } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-pressed={isSelected}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-inner">
          <img
            src={logoSrc}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = UNKNOWN_TEAM_LOGO;
            }}
            alt={`${team.name} logo`}
            className="h-10 w-10 object-contain"
          />
        </div>
        <span className="text-xs font-semibold text-inherit">{team.name}</span>
        {recordSummary && <span className="text-[11px] font-medium text-slate-500">{recordSummary}</span>}
      </button>
    );
  };

  const renderGroupBubble = (question) => {
    const teams = buildGroupTeams(question);
    const groupMeta = extractGroupMeta(question.ist_group);
    const conferenceLower = groupMeta.conference?.toLowerCase() || '';
    const badgeBgClass =
      conferenceLower === 'east'
        ? 'bg-[var(--nba-blue-500)]'
        : conferenceLower === 'west'
          ? 'bg-[var(--nba-red-500)]'
          : 'bg-slate-400';

    return (
      <div
        key={question.id}
        className="flex h-full flex-col rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-white via-slate-50/60 to-white/90 dark:from-slate-800 dark:via-slate-800/60 dark:to-slate-800/90 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${badgeBgClass} text-base font-bold text-white shadow-sm`}
            >
              {groupMeta.short || '?'}
            </div>
            <div className="flex flex-col">
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  conferenceLower === 'east'
                    ? 'text-[var(--nba-blue-600)] dark:text-[var(--nba-blue-400)]'
                    : conferenceLower === 'west'
                      ? 'text-[var(--nba-red-600)] dark:text-[var(--nba-red-400)]'
                      : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {groupMeta.conference || 'Group'}
              </span>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{question.text}</h4>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/50 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
            {question.point_value} pts
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {teams.map((team) => renderTeamBubbleButton(question, team))}
          {teams.length === 0 && (
            <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">
              Team list unavailable right now. Try again shortly.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderWildcardRow = (question, team) => {
    const teamId = team.id;
    const isSelected = String(answers[question.id]) === String(teamId);
    const recordSummary = buildRecordSummary(team);
    const logoSrc = getTeamLogoSrc(team.name);
    const conferenceMeta = extractGroupMeta(question.ist_group);
    const theme = getConferenceTheme(conferenceMeta.conference);

    return (
      <button
        key={teamId}
        type="button"
        onClick={() => !isReadOnly && onAnswerChange(question.id, teamId)}
        disabled={isReadOnly}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition ${
          isSelected
            ? `${theme.selectedBorder} ${theme.selectedBg} ${theme.selectedText} shadow-sm`
            : `border-slate-200 bg-white/95 text-slate-700 ${theme.hoverBorder} ${theme.hoverBg}`
        } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-pressed={isSelected}
      >
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-inner">
            <img
              src={logoSrc}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = UNKNOWN_TEAM_LOGO;
              }}
              alt={`${team.name} logo`}
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-semibold text-inherit">{team.name}</span>
            {recordSummary && <span className="text-xs text-slate-500">{recordSummary}</span>}
          </div>
        </div>
        <span
          className={`ml-3 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isSelected ? `bg-white ${theme.selectedText}` : 'bg-white/0 text-transparent'
          }`}
        >
          ✓
        </span>
      </button>
    );
  };

  const renderWildcardCompactCard = (question) => {
    const teams = buildConferenceTeams(question);
    const conferenceLabel = extractGroupMeta(question.ist_group).conference || question.ist_group || '';
    const theme = getConferenceTheme(conferenceLabel);

    return (
      <div
        key={question.id}
        className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            {conferenceLabel && (
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  conferenceLabel ? theme.selectedText : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {conferenceLabel} Wildcard
              </span>
            )}
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{question.text}</h4>
          </div>
          <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/50 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
            {question.point_value} pts
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {teams.map((team) => renderWildcardRow(question, team))}
          {teams.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Team data unavailable for this conference.</p>
          )}
        </div>
      </div>
    );
  };

  // Legacy card layout retained for future progress views
  const renderTeamOptionButton = (question, team, variant = 'sky') => {
    const teamId = team.id;
    const isSelected = String(answers[question.id]) === String(teamId);
    const variantStyles =
      variant === 'emerald'
        ? {
            selected: 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-200 text-emerald-900',
            idle:
              'border-slate-200 bg-white/85 hover:border-emerald-400 hover:bg-emerald-50/70 text-slate-700',
            badge: 'text-emerald-600',
          }
        : {
            selected: 'border-sky-500 bg-sky-50/90 ring-2 ring-sky-200 text-sky-900',
            idle: 'border-slate-200 bg-white/85 hover:border-sky-400 hover:bg-sky-50/70 text-slate-700',
            badge: 'text-sky-600',
          };

    const recordSummary = buildRecordSummary(team);
    const logoSrc = getTeamLogoSrc(team.name);

    return (
      <button
        key={teamId}
        type="button"
        onClick={() => !isReadOnly && onAnswerChange(question.id, teamId)}
        disabled={isReadOnly}
        className={`flex min-h-[104px] items-center justify-between rounded-2xl border px-4 py-4 text-left shadow-sm transition ${
          isSelected ? variantStyles.selected : variantStyles.idle
        } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-pressed={isSelected}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-inner">
            <img
              src={logoSrc}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = UNKNOWN_TEAM_LOGO;
              }}
              alt={`${team.name} logo`}
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">{team.name}</span>
            {recordSummary && <span className="text-xs text-slate-500">{recordSummary}</span>}
          </div>
        </div>
        {isSelected && (
          <span
            className={`ml-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold ${variantStyles.badge}`}
          >
            ✓
          </span>
        )}
      </button>
    );
  };

  const renderGroupCard = (question) => {
    const teams = buildGroupTeams(question);
    const groupMeta = extractGroupMeta(question.ist_group);

    return (
      <div
        key={question.id}
        className="flex h-full flex-col rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-slate-50/70 to-white/90 p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {groupMeta.label || question.ist_group || 'Group'}
            </span>
            <h4 className="text-base font-semibold text-slate-900">{question.text}</h4>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {question.point_value} pts
          </span>
        </div>
        <div className="mt-5 grid gap-3">
          {teams.map((team) => renderTeamOptionButton(question, team, 'sky'))}
          {teams.length === 0 && (
            <p className="text-sm text-slate-500">Team list unavailable right now. Try again shortly.</p>
          )}
        </div>
      </div>
    );
  };

  const renderWildcardCard = (question) => {
    const teams = buildConferenceTeams(question);
    const conferenceLabel = extractGroupMeta(question.ist_group).conference || question.ist_group || '';

    return (
      <div
        key={question.id}
        className="flex h-full flex-col rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-emerald-50/40 to-white p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {conferenceLabel && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                {conferenceLabel} Wildcard
              </span>
            )}
            <h4 className="text-base font-semibold text-slate-900">{question.text}</h4>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            {question.point_value} pts
          </span>
        </div>
        <div className="mt-5 grid gap-3">
          {teams.map((team) => renderTeamOptionButton(question, team, 'emerald'))}
          {teams.length === 0 && (
            <p className="text-sm text-slate-500">Team data unavailable for this conference.</p>
          )}
        </div>
      </div>
    );
  };

  const legacyIstLayouts = useMemo(
    () => ({
      renderGroupCard,
      renderWildcardCard,
      renderTeamOptionButton,
    }),
    [answers, isReadOnly],
  );
  void legacyIstLayouts;

const renderFinalistColumn = (
  label,
  question,
  selectedOption,
  options,
  scoreQuestion,
  scoreValue,
  sideKey,
) => {
  if (!question) {
    return (
      <div className="flex h-full flex-col rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="text-sm text-slate-500 dark:text-slate-400">No {label.toLowerCase()} question configured.</p>
      </div>
      );
    }

  const selectedTeamName = selectedOption?.label || `Select the ${label}`;
  const logoSrc = selectedOption ? getTeamLogoSrc(selectedOption.label) : UNKNOWN_TEAM_LOGO;

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
        <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
          {question.point_value} pts
        </span>
        </div>
        <div className="mt-3">
          <SelectComponent
            options={options}
            value={selectedOption}
            onChange={(option) => onAnswerChange(question.id, option ? option.value : '')}
            placeholder={loadingAuxData ? 'Loading teams…' : `Select ${label.toLowerCase()}`}
            isDisabled={isReadOnly || loadingAuxData || options.length === 0}
            mode="light"
          />
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-600 shadow-inner">
              <img
                src={logoSrc}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = UNKNOWN_TEAM_LOGO;
                }}
                alt={`${selectedTeamName} logo`}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{selectedTeamName}</span>
            </div>
          </div>
          {scoreQuestion && (
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {`${sideKey} Points Scored`}
              </label>
              <input
                type="number"
                min="0"
                value={scoreValue ?? ''}
                onChange={(event) => onAnswerChange(scoreQuestion.id, event.target.value)}
                disabled={isReadOnly}
                placeholder="Enter points"
                className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChampionColumn = () => {
    if (!finalBracketData.champion) {
      return (
        <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/90 px-6 py-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">No NBA Cup champion question configured.</p>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-between rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-sky-50/60 to-white px-6 py-8 text-center shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">NBA Cup Champion</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            {finalBracketData.champion.point_value} pts
          </span>
        </div>
        <div className="w-full">
          <SelectComponent
            options={championOptions}
            value={championSelected}
            onChange={(option) =>
              onAnswerChange(finalBracketData.champion.id, option ? option.value : '')
            }
            placeholder={loadingAuxData ? 'Loading teams…' : 'Select the champion'}
            isDisabled={isReadOnly || loadingAuxData || championOptions.length === 0}
            mode="light"
          />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Winner auto-updates when one finalist has a higher score. Ties leave your selection unchanged.
        </p>
      </div>
    );
  };

  const renderFinalsBracket = () => {
    if (
      !finalBracketData.east &&
      !finalBracketData.west &&
      !finalBracketData.champion &&
      !tiebreakerQuestions.length
    ) {
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
          {renderFinalistColumn(
            'East Finalist',
            finalBracketData.east,
            eastSelected,
            eastTeams,
            eastScoreQuestion,
            eastScoreValue,
            'East',
          )}
          {renderChampionColumn()}
          {renderFinalistColumn(
            'West Finalist',
            finalBracketData.west,
            westSelected,
            westTeams,
            westScoreQuestion,
            westScoreValue,
            'West',
          )}
        </div>

        {additionalTiebreakers.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {additionalTiebreakers.map((question) => (
              <div
                key={question.id}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-base font-semibold text-slate-900">{question.text}</h4>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {question.point_value} pts
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={answers[question.id] ?? ''}
                  onChange={(event) => onAnswerChange(question.id, event.target.value)}
                  disabled={isReadOnly}
                  placeholder="Enter your tiebreaker"
                  className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/30 px-4 py-4 text-sm text-amber-800 dark:text-amber-300 shadow-sm">
        <p className="font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          The following DOES NOT count towards your final point total
        </p>
        <p className="mt-1">
          The winner of the NBA Cup prediction receives a supplementary pool of $50 following the Championship Game.
        </p>
      </div>

      {loadingIstStandings && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
          Loading NBA Cup groups…
        </div>
      )}

      {istStandingsError && !loadingIstStandings && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 shadow-sm">
          {istStandingsError}
        </div>
      )}

      {groupWinnerQuestions.length > 0 && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {orderedGroupQuestions.map((question) => renderGroupBubble(question))}
          </div>
        </div>
      )}

      {wildcardQuestions.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Wildcards</h3>
          <div className="grid gap-5 md:grid-cols-2">
            {wildcardQuestions.map((question) => renderWildcardCompactCard(question))}
          </div>
        </div>
      )}

      {(conferenceWinnerQuestions.length > 0 || tiebreakerQuestions.length > 0) && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">NBA Cup Finals</h3>
          {renderFinalsBracket()}
        </div>
      )}
    </div>
  );
};


const QuestionCard = ({
  question,
  answer,
  onChange,
  isReadOnly,
  playerOptions,
  teamOptions,
  loadingAuxData,
}) => {
  const questionTextRef = useRef(null);

  useEffect(() => {
    const resizeText = () => {
      const element = questionTextRef.current;
      if (!element) return;

      let fontSize = 18; // Starting font size in px
      element.style.fontSize = `${fontSize}px`;

      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      const maxHeight = lineHeight * 2;

      while (element.scrollHeight > maxHeight && fontSize > 10) {
        fontSize -= 1;
        element.style.fontSize = `${fontSize}px`;
      }
    };

    resizeText();
    window.addEventListener('resize', resizeText);
    return () => window.removeEventListener('resize', resizeText);
  }, [question.text]);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-all">
      <div className="mb-4">
        <h3 ref={questionTextRef} className="text-slate-900 dark:text-white font-semibold text-lg mb-2">
          {question.text}
        </h3>
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-full">{question.point_value} pts</span>
          <span className="capitalize">
          {question.question_type === 'head_to_head' ? 'Head to Head' : question.question_type.replace(/_/g, ' ')}
        </span>
        </div>
      </div>

      <QuestionInput
        question={question}
        answer={answer}
        onChange={onChange}
        isReadOnly={isReadOnly}
        playerOptions={playerOptions}
        teamOptions={teamOptions}
        loadingAuxData={loadingAuxData}
      />
    </div>
  );
};

// Question Input Component (handles different question types)
const QuestionInput = ({
  question,
  answer,
  onChange,
  isReadOnly,
  playerOptions,
  teamOptions,
  loadingAuxData,
}) => {
  switch (question.question_type) {
    case 'superlative': {
      const selectedPlayer =
        playerOptions.find((option) => String(option.value) === String(answer)) || null;

      return (
        <div className="space-y-2">
          <SelectComponent
            options={playerOptions}
            value={selectedPlayer}
            onChange={(option) => onChange(option ? option.value : '')}
            placeholder={loadingAuxData ? 'Loading players...' : 'Select a player'}
            isDisabled={isReadOnly || loadingAuxData || playerOptions.length === 0}
            mode="light"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">Runner-up selections earn half points.</p>
        </div>
      );
    }


    case 'prop': {
      if (question.outcome_type === 'over_under') {
        const numericLine = Number(question.line);
        const hasNumericLine = Number.isFinite(numericLine);
        const formattedLine = hasNumericLine
          ? (Math.abs(numericLine) % 1 === 0 ? numericLine.toFixed(0) : numericLine.toFixed(1))
          : question.line ?? '—';
        const scaleStateClass =
          answer === 'over'
            ? ' overunder-scale--over'
            : answer === 'under'
            ? ' overunder-scale--under'
            : '';
        const disabledClass = isReadOnly ? ' overunder-scale--disabled' : '';

        return (
          <div
            className={`overunder-scale${scaleStateClass}${disabledClass}`}
            role="group"
            aria-label={`Choose over or under for line ${formattedLine}`}
          >
            <span className="overunder-indicator" aria-hidden="true" />
            <button
              type="button"
              className={`overunder-choice overunder-choice--under ${
                answer === 'under' ? 'is-selected' : ''
              } ${isReadOnly ? 'is-disabled' : ''}`}
              onClick={() => onChange('under')}
              disabled={isReadOnly}
              aria-pressed={answer === 'under'}
              aria-label={`Under ${formattedLine}`}
            >
              <span className="overunder-choice-label">Under</span>
            </button>
            <div className="overunder-divider">
              <span className="overunder-divider-label">Line</span>
              <span className="overunder-divider-value">{formattedLine}</span>
            </div>
            <button
              type="button"
              className={`overunder-choice overunder-choice--over ${
                answer === 'over' ? 'is-selected' : ''
              } ${isReadOnly ? 'is-disabled' : ''}`}
              onClick={() => onChange('over')}
              disabled={isReadOnly}
              aria-pressed={answer === 'over'}
              aria-label={`Over ${formattedLine}`}
            >
              <span className="overunder-choice-label">Over</span>
            </button>
          </div>
        );
      } else { // 'yes_no'
        const scaleStateClass =
          answer === 'yes'
            ? ' yesno-scale--yes'
            : answer === 'no'
            ? ' yesno-scale--no'
            : '';
        const disabledClass = isReadOnly ? ' yesno-scale--disabled' : '';

        return (
          <div
            className={`yesno-scale${scaleStateClass}${disabledClass}`}
            role="group"
            aria-label="Choose yes or no"
          >
            <span className="yesno-indicator" aria-hidden="true" />
            <button
              type="button"
              className={`yesno-choice yesno-choice--yes ${answer === 'yes' ? 'is-selected' : ''}`}
              onClick={() => onChange('yes')}
              disabled={isReadOnly}
              aria-pressed={answer === 'yes'}
            >
              Yes
            </button>
            <button
              type="button"
              className={`yesno-choice yesno-choice--no ${answer === 'no' ? 'is-selected' : ''}`}
              onClick={() => onChange('no')}
              disabled={isReadOnly}
              aria-pressed={answer === 'no'}
            >
              No
            </button>
          </div>
        );
      }
    }

    case 'head_to_head': {
      const team1Selected = String(answer) === String(question.team1_id);
      const team2Selected = String(answer) === String(question.team2_id);
      const scaleStateClass = team1Selected
        ? ' head-to-head-scale--team1'
        : team2Selected
        ? ' head-to-head-scale--team2'
        : '';
      const disabledClass = isReadOnly ? ' head-to-head-scale--disabled' : '';

      return (
        <div
          className={`head-to-head-scale${scaleStateClass}${disabledClass}`}
          role="group"
          aria-label="Choose team"
        >
          <span className="head-to-head-indicator" aria-hidden="true" />
          <button
            type="button"
            className={`head-to-head-choice head-to-head-choice--team1 ${team1Selected ? 'is-selected' : ''} ${isReadOnly ? 'is-disabled' : ''}`}
            onClick={() => onChange(String(question.team1_id))}
            disabled={isReadOnly}
            aria-pressed={team1Selected}
            aria-label={question.team1_name}
          >
            {question.team1_logo && (
              <img
                src={question.team1_logo}
                alt={`${question.team1_name} logo`}
                className="head-to-head-logo"
              />
            )}
            <span className="head-to-head-name">{question.team1_name}</span>
          </button>
          <button
            type="button"
            className={`head-to-head-choice head-to-head-choice--team2 ${team2Selected ? 'is-selected' : ''} ${isReadOnly ? 'is-disabled' : ''}`}
            onClick={() => onChange(String(question.team2_id))}
            disabled={isReadOnly}
            aria-pressed={team2Selected}
            aria-label={question.team2_name}
          >
            {question.team2_logo && (
              <img
                src={question.team2_logo}
                alt={`${question.team2_name} logo`}
                className="head-to-head-logo"
              />
            )}
            <span className="head-to-head-name">{question.team2_name}</span>
          </button>
        </div>
      );
    }

    case 'player_stat':
      return (
        <div className="space-y-3">
          {(question.current_leaders || question.top_performers) && (
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-md p-3 space-y-2">
              {question.current_leaders && (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Current Leaders</p>
                  <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                    {JSON.stringify(question.current_leaders, null, 2)}
                  </pre>
                </div>
              )}
              {question.top_performers && (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Top Performers</p>
                  <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                    {JSON.stringify(question.top_performers, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <input
            type="number"
            value={answer ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Enter your prediction"
            step="0.1"
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      );

    case 'ist': {
      if (question.prediction_type === 'tiebreaker') {
        return (
          <input
            type="number"
            value={answer ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Enter tiebreaker points"
            min="0"
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        );
      }

      const isEastGroup =
        typeof question.ist_group === 'string' && question.ist_group.toLowerCase().includes('east');
      const filteredTeams =
        teamOptions.filter((team) =>
          question.prediction_type === 'group_winner'
            ? isEastGroup
              ? team.conference === 'Eastern'
              : team.conference === 'Western'
            : true,
        ) || [];
      const selectedTeam =
        filteredTeams.find((option) => String(option.value) === String(answer)) || null;

      return (
        <SelectComponent
          options={filteredTeams}
          value={selectedTeam}
          onChange={(option) => onChange(option ? option.value : '')}
          placeholder={
            loadingAuxData ? 'Loading teams...' : filteredTeams.length ? 'Select a team' : 'No teams available'
          }
          isDisabled={isReadOnly || loadingAuxData || filteredTeams.length === 0}
          mode="light"
        />
      );
    }

    case 'nba_finals': {
      const selectedTeam =
        teamOptions.find((option) => String(option.value) === String(answer)) || null;

      return (
        <SelectComponent
          options={teamOptions}
          value={selectedTeam}
          onChange={(option) => onChange(option ? option.value : '')}
          placeholder={loadingAuxData ? 'Loading teams...' : 'Select a team'}
          isDisabled={isReadOnly || loadingAuxData || teamOptions.length === 0}
          mode="light"
        />
      );
    }

    default:
      return (
        <input
          type="text"
          value={answer ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={isReadOnly}
          placeholder="Enter your answer..."
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      );
  }
};

export default SubmissionsPage;
