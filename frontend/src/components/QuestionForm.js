// src/components/QuestionForm.js

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { getCSRFToken } from '../utils/csrf';
import SelectComponent from "./SelectComponent";


const QuestionForm = ({ seasonSlug, canEdit = true, submissionEndDate = null }) => {
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [istStandings, setIstStandings] = useState({});
  const [answers, setAnswers] = useState({});
  const [initialAnswers, setInitialAnswers] = useState({});
  const [errors, setErrors] = useState({}); // State for tracking validation errors
  const [loading, setLoading] = useState(true); // State for tracking validation errors
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info');

  const submissionDeadlineText = useMemo(() => {
    if (!submissionEndDate) return null;
    try {
      const date = new Date(submissionEndDate);
      if (Number.isNaN(date.getTime())) return null;
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch (err) {
      console.error('Failed to parse submission end date', err);
      return null;
    }
  }, [submissionEndDate]);

  const hasChanges = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(initialAnswers),
      ...Object.keys(answers),
    ]);

    for (const key of allKeys) {
      const nextValue = answers[key];
      const prevValue = initialAnswers[key];
      if (String(nextValue ?? '') !== String(prevValue ?? '')) {
        return true;
      }
    }
    return false;
  }, [answers, initialAnswers]);

  useEffect(() => {
    if (!seasonSlug) {
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setLoading(true); // Start loading

      try {
        // Fetch all data in parallel
        const [
          questionsResponse,
          playersResponse,
          teamsResponse,
          istResponse,
          answersResponse,
        ] = await Promise.all([
          axios.get(`/api/questions/${seasonSlug}/`),
          axios.get('/api/players/'),
          axios.get('/api/teams/'),
          axios.get(`/api/ist-standings/${seasonSlug}/`),
          axios.get(`/api/v2/submissions/answers/${seasonSlug}`),
        ]);

        if (!isMounted) return;

        const fetchedQuestions = questionsResponse.data?.questions || [];
        const fetchedAnswersList = answersResponse.data?.answers || [];
        const normalizedAnswers = fetchedAnswersList.reduce((acc, item) => {
          if (item?.question_id == null) {
            return acc;
          }
          const value = Object.prototype.hasOwnProperty.call(item, 'answer')
            ? item.answer
            : '';
          acc[item.question_id] = value === null || typeof value === 'undefined'
            ? ''
            : String(value);
          return acc;
        }, {});

        setQuestions(fetchedQuestions);
        setPlayers(playersResponse.data?.players || []);
        setTeams(teamsResponse.data?.teams || []);
        setIstStandings(istResponse.data || {});
        setInitialAnswers(normalizedAnswers);
        setAnswers({ ...normalizedAnswers });
        setErrors({});
        setIsEditing(false);
        setStatusMessage(null);
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching data:', error);
          setStatusType('error');
          setStatusMessage('We could not load the latest questions. Please try refreshing the page.');
        }
      } finally {
        if (isMounted) {
          setLoading(false); // Stop loading when done
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [seasonSlug]);
  // Handle changes in answers and clear errors if any
  const handleChange = useCallback((questionId, value) => {
    if (!isEditing || !canEdit || isSubmitting) {
      return;
    }

    const normalizedValue = value === null || typeof value === 'undefined'
      ? ''
      : String(value);

    setAnswers((prev) => {
      const prevValue = prev[questionId];
      if (String(prevValue ?? '') === normalizedValue) {
        return prev;
      }
      return { ...prev, [questionId]: normalizedValue };
    });

    setErrors((prevErrors) => {
      if (!prevErrors[questionId]) {
        return prevErrors;
      }
      const { [questionId]: _removed, ...rest } = prevErrors;
      return rest;
    });
    setStatusMessage(null);
  }, [canEdit, isEditing, isSubmitting]);

  const handleStartEdit = useCallback(() => {
    if (!canEdit) {
      return;
    }
    setErrors({});
    setIsEditing(true);
    setStatusMessage(null);
  }, [canEdit]);

  const handleCancelEdit = useCallback(() => {
    setAnswers({ ...initialAnswers });
    setErrors({});
    setIsEditing(false);
    setStatusMessage(null);
  }, [initialAnswers]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!isEditing || !canEdit) {
      return;
    }

    setStatusMessage(null);

    // Determine which answers have changed
    const changedEntries = Object.entries(answers).filter(([questionId, answerValue]) => {
      const previousValue = initialAnswers[questionId];
      return String(answerValue ?? '') !== String(previousValue ?? '');
    });

    if (changedEntries.length === 0) {
      setStatusType('info');
      setStatusMessage('No changes detected. Update an answer before submitting.');
      return;
    }

    const questionsMap = new Map(questions.map((question) => [String(question.id), question]));
    const newErrors = {};

    changedEntries.forEach(([questionId, answerValue]) => {
      const question = questionsMap.get(String(questionId));
      if (!question) {
        return;
      }

      const rawValue = answerValue ?? '';
      const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue).trim();
      const isEmpty = value === '';

      const requireNonEmptyTypes = new Set([
        'superlative',
        'head_to_head',
        'prop_over_under',
        'prop_yes_no',
        'player_stat_prediction',
        'nba_finals',
      ]);

      if (question.question_type === 'ist') {
        const predType = question.prediction_type;
        if (predType === 'tiebreaker') {
          const numericValue = Number(value);
          if (isEmpty || !Number.isFinite(numericValue) || numericValue <= 0) {
            newErrors[questionId] = 'Enter a positive number.';
          }
        } else if (isEmpty) {
          newErrors[questionId] = 'Please select a team.';
        }
        return;
      }

      if (question.question_type === 'player_stat_prediction') {
        const numericValue = Number(value);
        if (isEmpty || Number.isNaN(numericValue)) {
          newErrors[questionId] = 'Please enter a numeric value.';
        }
        return;
      }

      if (requireNonEmptyTypes.has(question.question_type) && isEmpty) {
        newErrors[questionId] = 'Please provide an answer.';
        return;
      }

      if (isEmpty && !initialAnswers[questionId]) {
        newErrors[questionId] = 'Please provide an answer.';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorId = Object.keys(newErrors)[0];
      const errorElement = document.getElementById(`question_${firstErrorId}`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setStatusType('error');
      setStatusMessage('Please fix the highlighted answers before submitting.');
      return;
    }

    // Prepare the payload as an array of { question_id, answer } objects
    const payload = {
      answers: changedEntries.map(([question_id, answer]) => ({
        question_id: parseInt(question_id, 10),
        answer: String(answer ?? ''),
      }))
    };

    setIsSubmitting(true);

    try {
      const response = await axios.post(`/api/v2/submissions/answers/${seasonSlug}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken('csrftoken'), // Include CSRF token
        }
      });

      const { status, errors: responseErrors, saved_count: savedCount } = response.data || {};

      if (status === 'success') {
        setErrors({});
        setInitialAnswers((prevInitial) => {
          const updated = { ...prevInitial };
          changedEntries.forEach(([questionId, answerValue]) => {
            updated[questionId] = String(answerValue ?? '');
          });
          return updated;
        });
        setAnswers((prevAnswers) => ({ ...prevAnswers }));
        setIsEditing(false);
        setStatusType('success');
        setStatusMessage('Answers saved successfully.');
      } else if (status === 'partial_success') {
        const failedIds = new Set(Object.keys(responseErrors || {}));
        setErrors(responseErrors || {});
        setInitialAnswers((prevInitial) => {
          const updated = { ...prevInitial };
          changedEntries.forEach(([questionId, answerValue]) => {
            if (!failedIds.has(String(questionId))) {
              updated[questionId] = String(answerValue ?? '');
            }
          });
          return updated;
        });
        setStatusType('warning');
        setStatusMessage(`Saved ${savedCount || 0} answer${savedCount === 1 ? '' : 's'}, but some responses need attention.`);
      } else {
        setErrors(responseErrors || {});
        setStatusType('error');
        setStatusMessage('We could not save your answers. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting answers:', error);
      if (error.response && error.response.data && error.response.data.errors) {
        setErrors(error.response.data.errors);
      }
      setStatusType('error');
      setStatusMessage('Something went wrong while saving. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, canEdit, initialAnswers, isEditing, questions, seasonSlug]);

  const renderInput = (question) => {
    const hasError = !!errors[question.id];
    const currentValue = answers[question.id];
    const valueString = currentValue === null || typeof currentValue === 'undefined'
      ? ''
      : String(currentValue);
    const disabled = !isEditing || !canEdit || isSubmitting;

    switch (question.question_type) {
      case 'superlative': {
        const playerOptions = players
          .map((player) => ({
            value: String(player.id),
            label: player.name,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        return (
          <SelectComponent
            options={playerOptions}
            value={valueString || null}
            onChange={(selectedOption) =>
              handleChange(
                question.id,
                selectedOption ? selectedOption.value : ''
              )}
            placeholder="Select Player"
            hasError={hasError}
            isDisabled={disabled}
          />
        );
      }

      case 'prop_over_under': {
        const checkedValue = valueString;
        return (
          <div className="mt-1 flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="over"
                checked={checkedValue === 'over'}
                onChange={(e) => handleChange(question.id, e.target.value)}
                required
                disabled={disabled}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">Over</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="under"
                checked={checkedValue === 'under'}
                onChange={(e) => handleChange(question.id, e.target.value)}
                disabled={disabled}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">Under</span>
            </label>
          </div>
        );
      }

      case 'prop_yes_no': {
        const checkedValue = valueString;
        return (
          <div className="mt-1 flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="yes"
                checked={checkedValue === 'yes'}
                onChange={(e) => handleChange(question.id, e.target.value)}
                required
                disabled={disabled}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">Yes</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="no"
                checked={checkedValue === 'no'}
                onChange={(e) => handleChange(question.id, e.target.value)}
                disabled={disabled}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">No</span>
            </label>
          </div>
        );
      }

      case 'head_to_head': {
        const checkedValue = valueString;
        return (
          <div className="mt-1 flex flex-col items-center">
            <div className="flex items-center space-x-4">
              {question.team1 && (
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={question.team1}
                    checked={checkedValue === String(question.team1)}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    required
                    disabled={disabled}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">{question.team1}</span>
                </label>
              )}
              {question.team2 && (
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={question.team2}
                    checked={checkedValue === String(question.team2)}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    disabled={disabled}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">{question.team2}</span>
                </label>
              )}
            </div>
          </div>
        );
      }

      case 'player_stat_prediction':
        return (
          <input
            type="number"
            id={`question_${question.id}`}
            min="1"
            value={valueString}
            onChange={(e) => handleChange(question.id, e.target.value)}
            className={`mt-1 block w-full border ${hasError ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
              } rounded-xl shadow-sm px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
            required
            disabled={disabled}
          />
        );

      case 'ist': {
        let teamOptions = [];

        if (question.prediction_type === 'group_winner') {
          const conferenceKey = question.ist_group?.includes('East') ? 'East' : 'West';
          const groupStandings = istStandings?.[conferenceKey]?.[question.ist_group] || [];
          teamOptions = groupStandings.map((standing) => ({
            value: String(standing.team_id),
            label: standing.team_name,
          }));
        } else if (question.prediction_type === 'wildcard' || question.prediction_type === 'conference_winner') {
          // ist_group contains "East" or "West", but teams have "Eastern" or "Western"
          const conferencePrefix = question.ist_group?.toLowerCase() || '';
          const filteredTeams = teams.filter((team) =>
            team.conference?.toLowerCase().startsWith(conferencePrefix)
          );
          teamOptions = filteredTeams.map((team) => ({
            value: String(team.id),
            label: team.name,
          })).sort((a, b) => a.label.localeCompare(b.label));
        }

        if (question.prediction_type === 'tiebreaker') {
          return (
            <>
              <input
                type="number"
                id={`question_${question.id}`}
                min="1"
                value={valueString}
                onChange={(e) => handleChange(question.id, e.target.value)}
                className={`mt-1 block w-full text-sm ${hasError ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                  } rounded-xl shadow-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2 transition-colors`}
                placeholder="Enter the final score"
                required
                disabled={disabled}
              />
              {hasError && (
                <span className="mt-1 text-xs text-red-500">
                  {errors[question.id]}
                </span>
              )}
            </>
          );
        }

        return (
          <SelectComponent
            options={teamOptions}
            value={valueString || null}
            onChange={(selectedOption) =>
              handleChange(
                question.id,
                selectedOption ? selectedOption.value : ''
              )}
            placeholder="Select a team"
            hasError={hasError}
            isDisabled={disabled}
          />
        );
      }

      default:
        return (
          <input
            type="text"
            id={`question_${question.id}`}
            value={valueString}
            onChange={(e) => handleChange(question.id, e.target.value)}
            className={`mt-1 block w-full border ${hasError ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
              } rounded-xl shadow-sm px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
            required
            disabled={disabled}
          />
        );
    }
  };

  // Categorize questions by type
  const superlativeQuestions = questions.filter(q => q.question_type === 'superlative');
  const istTournamentQuestions = questions.filter(q => q.question_type === 'ist');
  const nbaFinalsQuestions = questions.filter(q => q.question_type === 'nba_finals');

  const otherQuestions = questions.filter(q => q.question_type !== 'superlative' && q.question_type !== 'ist'
    && q.question_type != 'nba_finals');  // Further categorize otherQuestions into Player Props and General Props
  // Assuming player-specific questions have 'related_player' field
  const playerName = 'Lebron James Jr'; // Define the player name to filter
  const playerProps = otherQuestions.filter(q =>
    q.related_player === playerName
  );
  const generalProps = otherQuestions.filter(q =>
    !q.related_player || q.related_player !== playerName
  );

  const submitDisabled = !isEditing || !hasChanges || isSubmitting || !canEdit;
  const editDisabled = !canEdit || isEditing || loading || isSubmitting;
  const cancelDisabled = isSubmitting;

  const editButtonClasses = isEditing
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700'
    : editDisabled
      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
      : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-400 dark:hover:bg-slate-100';

  const cancelButtonClasses = cancelDisabled
    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-400 dark:hover:bg-slate-100';

  const submitButtonClasses = submitDisabled
    ? 'bg-blue-100 text-blue-400 border border-blue-200 cursor-not-allowed dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
    : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600';

  const statusClasses = {
    success: 'border-emerald-300 bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/30 dark:border-emerald-400 dark:bg-emerald-500/80',
    error: 'border-rose-300 bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 dark:border-rose-400 dark:bg-rose-500/80',
    warning: 'border-amber-300 bg-amber-500/90 text-white shadow-lg shadow-amber-500/30 dark:border-amber-400 dark:bg-amber-500/80',
    info: 'border-slate-300 bg-slate-600/95 text-white shadow-lg shadow-slate-600/30 dark:border-slate-400 dark:bg-slate-600/90',
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Loading questions…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto p-4">
      {statusMessage && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ring-1 ring-white/30 backdrop-blur status-banner ${statusClasses[statusType] || statusClasses.info}`}
          role={statusType === 'error' ? 'alert' : 'status'}
        >
          <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] uppercase tracking-wider">
            {statusType === 'success' ? 'OK' : statusType === 'error' ? 'ERR' : statusType === 'warning' ? 'FYI' : 'NOTE'}
          </span>
          <span className="leading-5">{statusMessage}</span>
        </div>
      )}
      {submissionDeadlineText && (
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
          Submissions close <span className="font-semibold text-slate-800 dark:text-slate-200">{submissionDeadlineText}</span>. Make sure to submit changes before the deadline.
        </div>
      )}
      {/* Superlative Questions */}
      {superlativeQuestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Superlatives</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {superlativeQuestions.map(question => (
              <div
                key={question.id}
                className="p-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl shadow-sm flex flex-col justify-between min-h-48 transition-all hover:shadow-md"
              >
                <div>
                  <label htmlFor={`question_${question.id}`}
                    className="block text-slate-700 dark:text-slate-300 mb-2 text-sm font-medium">
                    {question.text}
                  </label>
                  {renderInput(question)}
                  {/* Point Value Display */}
                  <span className="mt-2 text-xs italic text-slate-500 dark:text-slate-400 text-center block">
                    {question.point_value} {question.point_value === 1 ? 'point' : 'points'} for correct answer{' '}
                    <br />{question.point_value / 2} {question.point_value / 2 === 1 ? 'point' : 'points'} for runner-up
                  </span>
                  {/* Error Message */}
                  {errors[question.id] && (
                    <span className="mt-1 text-xs text-rose-500 dark:text-rose-400 block">
                      {errors[question.id]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* NBA Finals Section */}
      {nbaFinalsQuestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">NBA Finals Predictions</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
            1 point for correct team, 1 point for correct wins, game score used as tiebreaker.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Eastern Conference Finals */}
            <div className="p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl shadow-sm flex flex-col">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                Eastern Conference Finals
              </h3>
              {/* Team Selection for East */}
              {nbaFinalsQuestions
                .filter(q => q.group_name === 'finals_east' && q.text.toLowerCase().includes('team'))
                .map(question => {
                  // Generate team options for Eastern Conference
                  const teamOptions = teams
                    .filter(team => team.conference === 'East')
                    .map(team => ({ value: String(team.id), label: team.name }));
                  const currentValue = answers[question.id];

                  return (
                    <div key={question.id} className="mb-4">
                      <label
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{question.text}</label>
                      <SelectComponent
                        options={teamOptions}
                        value={currentValue ? String(currentValue) : null}
                        onChange={(selectedOption) =>
                          handleChange(question.id, selectedOption ? selectedOption.value : '')
                        }
                        placeholder="Select East Team"
                        hasError={errors[question.id]}
                        isDisabled={!isEditing || !canEdit || isSubmitting}
                      />
                      {errors[question.id] && (
                        <span className="text-xs text-red-500">{errors[question.id]}</span>
                      )}
                    </div>
                  );
                })}
              {/* Wins Selection for East */}
              {nbaFinalsQuestions
                .filter(q => q.group_name === 'finals_east' && q.text.toLowerCase().includes('wins'))
                .map(question => {
                  // Generate wins options
                  const winsOptions = (question.wins_choices || []).map(wins => ({
                    value: String(wins),
                    label: `${wins} wins`,
                  }));
                  const currentValue = answers[question.id];

                  return (
                    <div key={question.id} className="mb-4">
                      <label
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{question.text}</label>
                      <SelectComponent
                        options={winsOptions}
                        value={currentValue ? String(currentValue) : null}
                        onChange={(selectedOption) =>
                          handleChange(question.id, selectedOption ? selectedOption.value : '')
                        }
                        placeholder="Select Wins"
                        hasError={errors[question.id]}
                        isDisabled={!isEditing || !canEdit || isSubmitting}
                      />
                      {errors[question.id] && (
                        <span className="text-xs text-red-500">{errors[question.id]}</span>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Western Conference Finals */}
            <div className="p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl shadow-sm flex flex-col">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-8 bg-rose-500 rounded-full"></span>
                Western Conference Finals
              </h3>
              {/* Team Selection for West */}
              {nbaFinalsQuestions
                .filter(q => q.group_name === 'finals_west' && q.text.toLowerCase().includes('team'))
                .map(question => {
                  // Generate team options for Western Conference
                  const teamOptions = teams
                    .filter(team => team.conference === 'West')
                    .map(team => ({ value: String(team.id), label: team.name }));
                  const currentValue = answers[question.id];

                  return (
                    <div key={question.id} className="mb-4">
                      <label
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{question.text}</label>
                      <SelectComponent
                        options={teamOptions}
                        value={currentValue ? String(currentValue) : null}
                        onChange={(selectedOption) =>
                          handleChange(question.id, selectedOption ? selectedOption.value : '')
                        }
                        placeholder="Select West Team"
                        hasError={errors[question.id]}
                        isDisabled={!isEditing || !canEdit || isSubmitting}
                      />
                      {errors[question.id] && (
                        <span className="text-xs text-red-500">{errors[question.id]}</span>
                      )}
                    </div>
                  );
                })}
              {/* Wins Selection for West */}
              {nbaFinalsQuestions
                .filter(q => q.group_name === 'finals_west' && q.text.toLowerCase().includes('wins'))
                .map(question => {
                  // Generate wins options
                  const winsOptions = (question.wins_choices || []).map(wins => ({
                    value: String(wins),
                    label: `${wins} wins`,
                  }));
                  const currentValue = answers[question.id];

                  return (
                    <div key={question.id} className="mb-4">
                      <label
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{question.text}</label>
                      <SelectComponent
                        options={winsOptions}
                        value={currentValue ? String(currentValue) : null}
                        onChange={(selectedOption) =>
                          handleChange(question.id, selectedOption ? selectedOption.value : '')
                        }
                        placeholder="Select Wins"
                        hasError={errors[question.id]}
                        isDisabled={!isEditing || !canEdit || isSubmitting}
                      />
                      {errors[question.id] && (
                        <span className="text-xs text-red-500">{errors[question.id]}</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      {/* Other Questions (Props) */}
      {generalProps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Props</h2>
          {/* Adjust the grid to have more columns on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {generalProps.map(question => (
              <div
                key={question.id}
                className="p-3 border border-gray-200 rounded-md
                shadow-sm flex flex-col items-center h-36" // Set fixed height
              >
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <label htmlFor={`question_${question.id}`}
                    className="block text-gray-700 mb-1 text-xs sm:text-sm break-words">
                    {question.text}
                  </label>
                  {/* Display the line for Over/Under questions */}
                  {question.question_type === 'prop_over_under' && (
                    <span className="mt-1 text-xs italic text-gray-500">
                      Line: {question.line}
                    </span>
                  )}
                  {renderInput(question)}
                  {/* Point Value Display */}
                  <span className="mt-1 text-xs italic text-gray-500 text-center">
                    {question.point_value} {question.point_value === 1 ? 'point' : 'points'}
                  </span>
                  {/* Optional: Error Message for Props (if validation is added) */}
                  {errors[question.id] && (
                    <span className="mt-1 text-xxs text-red-500">
                      {errors[question.id]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Player-Specific Props */}
      {playerProps.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">The Baby GOAT: Bronny James</h2>
            {/* Image to the right of the header */}
            <img
              src="https://fanatics.frgimages.com/los-angeles-lakers/bronny-james-los-angeles-lakers-autographed-16-x-20-stylized-photograph-with-lakeshow-inscription-limited-edition-of-12_ss5_p-202035074+u-0yqp2m3rk6yaaa5chlfk+v-wkgdfmzl4pdes9xsfgtq.jpg?_hv=2&w=900" // Replace with your image URL
              alt="Bronny James"
              className="w-16 h-16 rounded-full object-cover"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {playerProps.map(question => (
              <div
                key={question.id}
                className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center h-36" // Set fixed height
              >
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <label htmlFor={`question_${question.id}`}
                    className="block text-gray-700 mb-1 text-xs sm:text-sm break-words">
                    {question.text}
                  </label>
                  {renderInput(question)}
                  {/* Display the line for Over/Under questions */}
                  {question.question_type === 'prop_over_under' && (
                    <span className="mt-1 text-xs italic text-gray-500">
                      Line: {question.line}
                    </span>
                  )}
                  {/* Point Value Display */}
                  <span className="mt-1 text-xs italic text-gray-500 text-center">
                    {question.point_value} {question.point_value === 1 ? 'point' : 'points'}
                  </span>
                  {/* Optional: Error Message for Props */}
                  {errors[question.id] && (
                    <span className="mt-1 text-xs text-red-500">
                      {errors[question.id]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* IST Questions */}
      {istTournamentQuestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">NBA Cup Predictions</h2>
          <body>The following DOES NOT count towards your final point total
            The winner of the NBA Cup prediction receives a supplementary pool of $50 following the Championship
            Game
          </body>
          {/* Group Winners */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Group Winners</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {istTournamentQuestions.filter(q => q.prediction_type === 'group_winner').map(question => (
                <div
                  key={question.id}
                  className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center"
                >
                  <label htmlFor={`question_${question.id}`}
                    className="block text-gray-700 mb-1 text-xs sm:text-sm text-center">
                    {question.text}
                  </label>
                  {renderInput(question)}
                  {errors[question.id] && (
                    <span className="mt-1 text-xs text-red-500">
                      {errors[question.id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wildcards */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Wildcards</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {istTournamentQuestions.filter(q => q.prediction_type === 'wildcard').map(question => (
                <div
                  key={question.id}
                  className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center"
                >
                  <label htmlFor={`question_${question.id}`}
                    className="block text-gray-700 mb-1 text-xs sm:text-sm text-center">
                    {question.text}
                  </label>
                  {renderInput(question)}
                  {errors[question.id] && (
                    <span className="mt-1 text-xs text-red-500">
                      {errors[question.id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Conference Winners */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Conference Winners</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {istTournamentQuestions.filter(q => q.prediction_type === 'conference_winner').map(question => (
                <div
                  key={question.id}
                  className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center"
                >
                  <label htmlFor={`question_${question.id}`}
                    className="block text-gray-700 mb-1 text-xs sm:text-sm text-center">
                    {question.text}
                  </label>
                  {renderInput(question)}
                  {errors[question.id] && (
                    <span className="mt-1 text-xs text-red-500">
                      {errors[question.id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tiebreakers */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Tiebreakers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {istTournamentQuestions.filter(q => q.prediction_type === 'tiebreaker').map(question => (
                <div
                  key={question.id}
                  className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center"
                >
                  <label htmlFor={`question_${question.id}`}
                    className="block text-gray-700 mb-1 text-xs sm:text-sm text-center">
                    {question.text}
                  </label>
                  {renderInput(question)}
                  {errors[question.id] && (
                    <span className="mt-1 text-xs text-red-500">
                      {errors[question.id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleStartEdit}
            className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${editButtonClasses}`}
            disabled={editDisabled}
          >
            {isEditing ? 'Editing Enabled' : 'Edit Answers'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${cancelButtonClasses}`}
              disabled={cancelDisabled}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className={`px-6 py-2.5 rounded-md text-sm font-semibold transition-colors ${submitButtonClasses}`}
            disabled={submitDisabled}
          >
            {isSubmitting ? 'Saving…' : 'Submit Answers'}
          </button>
        </div>
      </div>
      {!isEditing && canEdit && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Click &ldquo;Edit Answers&rdquo; to make changes. Only updated responses will be resubmitted.
        </p>
      )}
    </form>
  );
};

export default QuestionForm;
