// File: frontend/src/pages/SubmissionsPage.jsx
/**
 * SubmissionsPage - Modern interface for submitting predictions
 * Features: deadline enforcement, auto-save, progress tracking, beautiful UI
 */

import React, { useState, useEffect } from 'react';
import { useQuestions, useUserAnswers, useSubmitAnswers, useSubmissionStatus } from '../hooks/useSubmissions';
import SelectComponent from '../components/SelectComponent';

const SubmissionsPage = ({ seasonSlug }) => {
  const [answers, setAnswers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch data
  const { data: questionsData, isLoading: questionsLoading } = useQuestions(seasonSlug);
  const { data: userAnswersData } = useUserAnswers(seasonSlug);
  const { data: statusData } = useSubmissionStatus(seasonSlug);
  const submitMutation = useSubmitAnswers(seasonSlug);

  // Load existing answers
  useEffect(() => {
    if (userAnswersData?.answers) {
      const existingAnswers = {};
      userAnswersData.answers.forEach(ans => {
        existingAnswers[ans.question_id] = ans.answer;
      });
      setAnswers(existingAnswers);
    }
  }, [userAnswersData]);

  // Auto-save to localStorage
  useEffect(() => {
    if (hasChanges && Object.keys(answers).length > 0) {
      localStorage.setItem(`submissions_${seasonSlug}`, JSON.stringify(answers));
    }
  }, [answers, seasonSlug, hasChanges]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setHasChanges(true);
  };

  const handleSubmit = async () => {
    const answersArray = Object.entries(answers).map(([question_id, answer]) => ({
      question_id: parseInt(question_id),
      answer: String(answer),
    }));

    try {
      await submitMutation.mutateAsync(answersArray);
      setHasChanges(false);
      alert('Answers submitted successfully!');
    } catch (error) {
      alert(`Error: ${error.response?.data?.message || 'Failed to submit'}`);
    }
  };

  if (questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading questions...</div>
      </div>
    );
  }

  const isReadOnly = !statusData?.is_open;
  const questions = questionsData?.questions || [];
  const progress = (Object.keys(answers).length / questions.length) * 100;

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
        {statusData && (
          <div className={`p-4 rounded-lg mb-6 ${
            statusData.is_open ? 'bg-green-800/50' : 'bg-red-800/50'
          }`}>
            <p className="text-white font-semibold">{statusData.message}</p>
            {statusData.days_until_close !== null && (
              <p className="text-gray-200 text-sm mt-1">
                {statusData.days_until_close} day(s) remaining
              </p>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {!isReadOnly && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Progress</span>
              <span>{Object.keys(answers).length} / {questions.length}</span>
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
const QuestionCard = ({ question, answer, onChange, isReadOnly }) => {
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
      />
    </div>
  );
};

// Question Input Component (handles different question types)
const QuestionInput = ({ question, answer, onChange, isReadOnly }) => {
  switch (question.question_type) {
    case 'superlative':
      return (
        <div>
          <SelectComponent
            options={[{ value: '', label: 'Select player...' }]}
            value={answer || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Select a player"
          />
        </div>
      );

    case 'prop':
      if (question.outcome_type === 'over_under') {
        return (
          <div className="flex gap-4">
            <button
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
      } else {
        return (
          <div className="flex gap-4">
            <button
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
            onClick={() => onChange(question.team1_id)}
            disabled={isReadOnly}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              answer == question.team1_id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {question.team1_name}
          </button>
          <button
            onClick={() => onChange(question.team2_id)}
            disabled={isReadOnly}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              answer == question.team2_id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {question.team2_name}
          </button>
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={answer || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={isReadOnly}
          placeholder="Enter your answer..."
          className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      );
  }
};

export default SubmissionsPage;
