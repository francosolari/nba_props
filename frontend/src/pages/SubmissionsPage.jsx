// File: frontend/src/pages/SubmissionsPage.jsx
/**
 * SubmissionsPage - Light mode interface for submitting predictions
 * Features: deadline enforcement, auto-save, progress tracking, grouped sections
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  useQuestions,
  useUserAnswers,
  useSubmitAnswers,
  useSubmissionStatus,
  useUserContext,
} from '../hooks/useSubmissions';
import SelectComponent from '../components/SelectComponent';
import EditablePredictionBoard from '../components/EditablePredictionBoard';

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
    title: 'In-Season Tournament',
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

const SubmissionsPage = ({ seasonSlug }) => {
  const [activeSeasonSlug, setActiveSeasonSlug] = useState(seasonSlug || null);
  const [seasonLoading, setSeasonLoading] = useState(!seasonSlug);
  const [answers, setAnswers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [playerOptions, setPlayerOptions] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [loadingAuxData, setLoadingAuxData] = useState(false);

  const effectiveSeasonSlug = seasonSlug || activeSeasonSlug;
  const { data: userContext, isLoading: userContextLoading } = useUserContext();
  const username = userContext?.username || null;

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
        if (!cancelled && data?.slug) {
          setActiveSeasonSlug(data.slug);
        }
      } catch (error) {
        console.error('Failed to fetch latest season slug', error);
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
  const { data: questionsData, isLoading: questionsLoading } = useQuestions(effectiveSeasonSlug);
  const { data: userAnswersData } = useUserAnswers(effectiveSeasonSlug);
  const { data: statusData } = useSubmissionStatus(effectiveSeasonSlug);
  const submitMutation = useSubmitAnswers(effectiveSeasonSlug);

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

  const handleSubmit = async () => {
    if (!effectiveSeasonSlug) {
      alert('Season is not ready yet. Please try again shortly.');
      return;
    }

    const answersArray = Object.entries(answers).map(([question_id, answer]) => ({
      question_id: parseInt(question_id, 10),
      answer: String(answer),
    }));

    try {
      await submitMutation.mutateAsync(answersArray);
      setHasChanges(false);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      alert('Answers submitted successfully!');
    } catch (error) {
      alert(`Error: ${error.response?.data?.message || 'Failed to submit'}`);
    }
  };

  const submissionStatus = useMemo(() => {
    return statusData || questionsData?.submission_status || null;
  }, [statusData, questionsData]);

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

  if (seasonLoading || !effectiveSeasonSlug) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600 text-2xl">Loading season...</div>
      </div>
    );
  }

  if (questionsLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600 text-2xl">Loading questions...</div>
      </div>
    );
  }

  const completedCount = Object.values(answers).filter(
    (value) => value !== undefined && value !== null && value !== '',
  ).length;
  const progress = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;
  const isReadOnly = !submissionStatus?.is_open;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Submit Your Predictions</h1>
          <p className="text-slate-500">{effectiveSeasonSlug} Season</p>
        </div>

        {/* Deadline Banner */}
        {submissionStatus && (
          <div
            className={`p-4 rounded-lg border mb-6 ${
              submissionStatus.is_open ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}
          >
            <p className={`font-semibold ${submissionStatus.is_open ? 'text-emerald-800' : 'text-rose-800'}`}>
              {submissionStatus.message}
            </p>
            {submissionStatus.days_until_close !== null &&
              submissionStatus.days_until_close !== undefined && (
                <p
                  className={`text-sm mt-1 ${
                    submissionStatus.is_open ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {submissionStatus.days_until_close} day(s) remaining
                </p>
              )}
            {submissionStatus.days_until_open !== null &&
              submissionStatus.days_until_open !== undefined &&
              !submissionStatus.is_open && (
                <p className="text-sm mt-1 text-rose-700">
                  Opens in {submissionStatus.days_until_open} day(s)
                </p>
              )}
          </div>
        )}

        {/* Regular Season Standings */}
        <section className="mb-10">
          <header className="mb-4">
            <h2 className="text-2xl font-semibold text-slate-900">Regular Season Standings</h2>
            <p className="text-sm text-slate-500 mt-1">
              Drag and drop teams in each conference to set your projected final standings.
            </p>
          </header>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            {userContextLoading ? (
              <div className="p-6 text-center text-sm text-slate-500">Loading standings...</div>
            ) : userContext ? (
              <EditablePredictionBoard
                seasonSlug={effectiveSeasonSlug}
                canEdit={!isReadOnly}
                username={username}
              />
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">
                Sign in to manage your regular season standings predictions.
              </div>
            )}
          </div>
        </section>

        {/* Progress Bar */}
        {!isReadOnly && questions.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Progress</span>
              <span>
                {completedCount} / {questions.length}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-10">
          {groupedQuestions.map((group) => (
            <section key={group.type}>
              <header className="mb-4">
                <h2 className="text-2xl font-semibold text-slate-900">{group.title}</h2>
                {group.description && <p className="text-sm text-slate-500 mt-1">{group.description}</p>}
              </header>
              <div className="space-y-6">
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
            </section>
          ))}
        </div>

        {/* Submit Button */}
        {!isReadOnly && (
          <div className="mt-8 text-center">
            <button
              onClick={handleSubmit}
              disabled={
                submitMutation.isPending || !effectiveSeasonSlug || Object.keys(answers).length === 0
              }
              className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Predictions'}
            </button>
            {hasChanges && <p className="text-amber-500 text-sm mt-2">You have unsaved changes</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// Question Card Component
const QuestionCard = ({
  question,
  answer,
  onChange,
  isReadOnly,
  playerOptions,
  teamOptions,
  loadingAuxData,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">
        <h3 className="text-slate-900 font-semibold text-lg mb-2">{question.text}</h3>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full">{question.point_value} pts</span>
          <span className="capitalize">{question.question_type.replace('_', ' ')}</span>
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
        <SelectComponent
          options={playerOptions}
          value={selectedPlayer}
          onChange={(option) => onChange(option ? option.value : '')}
          placeholder={loadingAuxData ? 'Loading players...' : 'Select a player'}
          isDisabled={isReadOnly || loadingAuxData || playerOptions.length === 0}
        />
      );
    }

    case 'prop': {
      if (question.outcome_type === 'over_under') {
        return (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onChange('over')}
              disabled={isReadOnly}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors border ${
                answer === 'over'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Over {question.line}
            </button>
            <button
              type="button"
              onClick={() => onChange('under')}
              disabled={isReadOnly}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors border ${
                answer === 'under'
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Under {question.line}
            </button>
          </div>
        );
      }

      return (
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => onChange('yes')}
            disabled={isReadOnly}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors border ${
              answer === 'yes'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange('no')}
            disabled={isReadOnly}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors border ${
              answer === 'no'
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            No
          </button>
        </div>
      );
    }

    case 'head_to_head':
      return (
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => onChange(String(question.team1_id))}
            disabled={isReadOnly}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors border ${
              String(answer) === String(question.team1_id)
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {question.team1_name}
          </button>
          <button
            type="button"
            onClick={() => onChange(String(question.team2_id))}
            disabled={isReadOnly}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors border ${
              String(answer) === String(question.team2_id)
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {question.team2_name}
          </button>
        </div>
      );

    case 'player_stat':
      return (
        <div className="space-y-3">
          {(question.current_leaders || question.top_performers) && (
            <div className="text-sm text-slate-600 bg-slate-100 rounded-md p-3 space-y-2">
              {question.current_leaders && (
                <div>
                  <p className="font-semibold text-slate-700">Current Leaders</p>
                  <pre className="whitespace-pre-wrap text-xs text-slate-600">
                    {JSON.stringify(question.current_leaders, null, 2)}
                  </pre>
                </div>
              )}
              {question.top_performers && (
                <div>
                  <p className="font-semibold text-slate-700">Top Performers</p>
                  <pre className="whitespace-pre-wrap text-xs text-slate-600">
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
            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
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
          className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      );
  }
};

export default SubmissionsPage;
