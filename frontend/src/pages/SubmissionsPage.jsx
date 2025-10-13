// File: frontend/src/pages/SubmissionsPage.jsx
/**
 * SubmissionsPage - Modern interface for submitting predictions
 * Features: deadline enforcement, auto-save, progress tracking, beautiful UI
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useQuestions, useUserAnswers, useSubmitAnswers, useSubmissionStatus } from '../hooks/useSubmissions';
import SelectComponent from '../components/SelectComponent';

const SubmissionsPage = ({ seasonSlug }) => {
  const [answers, setAnswers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [playerOptions, setPlayerOptions] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [loadingAuxData, setLoadingAuxData] = useState(false);

  // Fetch data
  const { data: questionsData, isLoading: questionsLoading } = useQuestions(seasonSlug);
  const { data: userAnswersData } = useUserAnswers(seasonSlug);
  const { data: statusData } = useSubmissionStatus(seasonSlug);
  const submitMutation = useSubmitAnswers(seasonSlug);

  // Load cached answers from localStorage on mount
  useEffect(() => {
    if (!seasonSlug) return;
    const cached = localStorage.getItem(`submissions_${seasonSlug}`);
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
  }, [seasonSlug]);

  // Load existing answers
  useEffect(() => {
    if (userAnswersData?.answers) {
      const existingAnswers = {};
      userAnswersData.answers.forEach(ans => {
        existingAnswers[ans.question_id] = ans.answer;
      });
      setAnswers(existingAnswers);
      setHasChanges(false);
    }
  }, [userAnswersData]);

  // Auto-save to localStorage
  useEffect(() => {
    if (hasChanges && Object.keys(answers).length > 0) {
      localStorage.setItem(`submissions_${seasonSlug}`, JSON.stringify(answers));
    }
  }, [answers, seasonSlug, hasChanges]);

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
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
            axios.get('/api/v2/players/').then((res) =>
              res.data?.players?.map((player) => ({
                value: player.id,
                label: player.name,
              })) || []
            )
          );
        } else {
          requests.push(Promise.resolve(playerOptions));
        }

        if (needsTeams && teamOptions.length === 0) {
          requests.push(
            axios.get('/api/v2/teams/').then((res) =>
              res.data?.teams?.map((team) => ({
                value: team.id,
                label: team.name,
                conference: team.conference || null,
              })) || []
            )
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
    const answersArray = Object.entries(answers).map(([question_id, answer]) => ({
      question_id: parseInt(question_id),
      answer: String(answer),
    }));

    try {
      await submitMutation.mutateAsync(answersArray);
      setHasChanges(false);
      localStorage.removeItem(`submissions_${seasonSlug}`);
      alert('Answers submitted successfully!');
    } catch (error) {
      alert(`Error: ${error.response?.data?.message || 'Failed to submit'}`);
    }
  };

  const submissionStatus = useMemo(() => {
    return statusData || questionsData?.submission_status || null;
  }, [statusData, questionsData]);

  if (questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading questions...</div>
      </div>
    );
  }

  const questions = questionsData?.questions || [];
  const completedCount = Object.values(answers).filter((value) => value !== undefined && value !== null && value !== '').length;
  const progress = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;
  const isReadOnly = !submissionStatus?.is_open;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Submit Your Predictions
          </h1>
          <p className="text-gray-300">{seasonSlug} Season</p>
        </div>

        {/* Deadline Banner */}
        {submissionStatus && (
          <div className={`p-4 rounded-lg mb-6 ${
            submissionStatus.is_open ? 'bg-green-800/50' : 'bg-red-800/50'
          }`}>
            <p className="text-white font-semibold">{submissionStatus.message}</p>
            {submissionStatus.days_until_close !== null && submissionStatus.days_until_close !== undefined && (
              <p className="text-gray-200 text-sm mt-1">
                {submissionStatus.days_until_close} day(s) remaining
              </p>
            )}
            {submissionStatus.days_until_open !== null && submissionStatus.days_until_open !== undefined && !submissionStatus.is_open && (
              <p className="text-gray-200 text-sm mt-1">
                Opens in {submissionStatus.days_until_open} day(s)
              </p>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {!isReadOnly && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Progress</span>
              <span>{completedCount} / {questions.length}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question) => (
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

        {/* Submit Button */}
        {!isReadOnly && (
          <div className="mt-8 text-center">
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || Object.keys(answers).length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Predictions'}
            </button>
            {hasChanges && (
              <p className="text-yellow-400 text-sm mt-2">You have unsaved changes</p>
            )}
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
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-white font-semibold text-lg mb-2">{question.text}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="bg-blue-900/50 px-3 py-1 rounded-full">
            {question.point_value} pts
          </span>
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
const QuestionInput = ({ question, answer, onChange, isReadOnly, playerOptions, teamOptions, loadingAuxData }) => {
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
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                answer === 'over'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Over {question.line}
            </button>
            <button
              type="button"
              onClick={() => onChange('under')}
              disabled={isReadOnly}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                answer === 'under'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              answer === 'yes'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange('no')}
            disabled={isReadOnly}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              answer === 'no'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              String(answer) === String(question.team1_id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {question.team1_name}
          </button>
          <button
            type="button"
            onClick={() => onChange(String(question.team2_id))}
            disabled={isReadOnly}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              String(answer) === String(question.team2_id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {question.team2_name}
          </button>
        </div>
      );

    case 'player_stat':
      return (
        <div className="space-y-3">
          {(question.current_leaders || question.top_performers) && (
            <div className="text-sm text-gray-400 bg-gray-900/50 rounded-md p-3 space-y-2">
              {question.current_leaders && (
                <div>
                  <p className="font-semibold text-gray-300">Current Leaders</p>
                  <pre className="whitespace-pre-wrap text-xs text-gray-400">
                    {JSON.stringify(question.current_leaders, null, 2)}
                  </pre>
                </div>
              )}
              {question.top_performers && (
                <div>
                  <p className="font-semibold text-gray-300">Top Performers</p>
                  <pre className="whitespace-pre-wrap text-xs text-gray-400">
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
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            : true
        ) || [];
      const selectedTeam =
        filteredTeams.find((option) => String(option.value) === String(answer)) || null;

      return (
        <SelectComponent
          options={filteredTeams}
          value={selectedTeam}
          onChange={(option) => onChange(option ? option.value : '')}
          placeholder={
            loadingAuxData
              ? 'Loading teams...'
              : filteredTeams.length
                ? 'Select a team'
                : 'No teams available'
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
          className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      );
  }

};

export default SubmissionsPage;
