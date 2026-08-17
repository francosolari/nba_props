// File: frontend/src/hooks/admin/useGradingQuestionEditor.js
/**
 * Owns the single in-progress "edit correct answer" form for the grading
 * question queue: only one question can be edited at a time, so this state
 * is lifted rather than duplicated per row.
 */

import { useState } from 'react';
import { useUpdateQuestionMutation } from './useAdminGrading';

const buildScoringRows = (answerPointValues = {}) => (
  Object.entries(answerPointValues || {}).map(([answer, points]) => ({
    answer,
    points: String(points),
  }))
);

const scoringRowsToMap = (rows) => {
  const map = {};
  rows.forEach((row) => {
    const answer = String(row.answer || '').trim();
    if (!answer) return;
    const points = Number(row.points);
    if (Number.isNaN(points)) return;
    map[answer] = points;
  });
  return map;
};

export const useGradingQuestionEditor = ({ playerOptions, playerNameById, toast }) => {
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editedAnswer, setEditedAnswer] = useState('');
  const [editedAnswerPlayerId, setEditedAnswerPlayerId] = useState(null);
  const [editedRunnerUpPlayerId, setEditedRunnerUpPlayerId] = useState(null);
  const [editedRunnerUpPoints, setEditedRunnerUpPoints] = useState('');
  const [editedScoringRows, setEditedScoringRows] = useState([]);

  const resetEditor = () => {
    setEditingQuestion(null);
    setEditedAnswer('');
    setEditedAnswerPlayerId(null);
    setEditedRunnerUpPlayerId(null);
    setEditedRunnerUpPoints('');
    setEditedScoringRows([]);
  };

  const updateQuestionMutation = useUpdateQuestionMutation(resetEditor);

  const handleUpdateQuestion = async (payload) => {
    try {
      await updateQuestionMutation.mutateAsync(payload);
      toast.success('Question updated successfully!\n\nRun grading to apply this answer to all user submissions.');
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error(`Failed to update question: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question.question_id);
    setEditedAnswer(question.correct_answer || '');
    const correctOption = question.correct_answer_player_id
      ? playerOptions.find((option) => String(option.value) === String(question.correct_answer_player_id))
      : playerOptions.find((option) => option.label === question.correct_answer);
    setEditedAnswerPlayerId(correctOption?.value || null);
    const scoringRows = buildScoringRows(question.answer_point_values);
    setEditedScoringRows(scoringRows);
    const runnerUpEntry = scoringRows.find((row) => (
      question.choices || []
    ).includes(row.answer) && row.answer !== question.correct_answer);
    const runnerUpOption = question.runner_up_player_id
      ? playerOptions.find((option) => String(option.value) === String(question.runner_up_player_id))
      : runnerUpEntry
        ? playerOptions.find((option) => option.label === runnerUpEntry.answer)
        : null;
    setEditedRunnerUpPlayerId(runnerUpOption?.value || null);
    setEditedRunnerUpPoints(
      runnerUpEntry?.points || (question.question_type === 'SuperlativeQuestion' ? String((Number(question.point_value) || 0) / 2) : ''),
    );
  };

  const handleSaveQuestion = async (question) => {
    const isPlayerQuestion = question.input_type === 'player_search';
    const correctAnswer = isPlayerQuestion && editedAnswerPlayerId
      ? playerNameById.get(String(editedAnswerPlayerId))
      : editedAnswer;
    const answerPointValues = scoringRowsToMap(editedScoringRows);
    const runnerUpPoints = editedRunnerUpPoints === '' ? undefined : Number(editedRunnerUpPoints);

    if (!String(correctAnswer || '').trim()) {
      toast.warning('Please enter a correct answer');
      return;
    }
    await handleUpdateQuestion({
      questionId: question.question_id,
      correctAnswer,
      answerPointValues,
      correctAnswerPlayerId: isPlayerQuestion && editedAnswerPlayerId ? Number(editedAnswerPlayerId) : undefined,
      runnerUpPlayerId: question.question_type === 'SuperlativeQuestion' && editedRunnerUpPlayerId
        ? Number(editedRunnerUpPlayerId)
        : undefined,
      runnerUpPoints: question.question_type === 'SuperlativeQuestion' && editedRunnerUpPlayerId && !Number.isNaN(runnerUpPoints)
        ? runnerUpPoints
        : undefined,
    });
  };

  const addScoringRow = (answer = '', points = '') => {
    setEditedScoringRows((prev) => [...prev, { answer, points: String(points) }]);
  };

  const updateScoringRow = (index, updates) => {
    setEditedScoringRows((prev) => prev.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...updates } : row
    )));
  };

  const removeScoringRow = (index) => {
    setEditedScoringRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleRunnerUpSelect = (option, question) => {
    const playerId = option ? option.value : null;
    const playerName = option ? option.label : '';
    const defaultPoints = editedRunnerUpPoints || String((Number(question.point_value) || 0) / 2);

    setEditedRunnerUpPlayerId(playerId);
    if (!playerName) return;
    setEditedRunnerUpPoints(defaultPoints);
    setEditedScoringRows((prev) => {
      const withoutExistingRunnerUp = prev.filter((row) => row.answer !== playerName);
      return [...withoutExistingRunnerUp, { answer: playerName, points: defaultPoints }];
    });
  };

  const handleRunnerUpPointsChange = (nextPoints) => {
    setEditedRunnerUpPoints(nextPoints);
    const runnerUpName = editedRunnerUpPlayerId
      ? playerNameById.get(String(editedRunnerUpPlayerId))
      : '';
    if (runnerUpName) {
      setEditedScoringRows((prev) => prev.map((row) => (
        row.answer === runnerUpName ? { ...row, points: nextPoints } : row
      )));
    }
  };

  return {
    editingQuestion,
    editedAnswer,
    setEditedAnswer,
    editedAnswerPlayerId,
    setEditedAnswerPlayerId,
    editedRunnerUpPlayerId,
    editedRunnerUpPoints,
    onRunnerUpPointsChange: handleRunnerUpPointsChange,
    editedScoringRows,
    updateQuestionMutation,
    handleEditQuestion,
    handleSaveQuestion,
    handleCancelEdit: resetEditor,
    addScoringRow,
    updateScoringRow,
    removeScoringRow,
    handleRunnerUpSelect,
  };
};
