// File: frontend/src/hooks/admin/useAdminGrading.js
/**
 * React hooks for the admin grading panel: question grading queue, results
 * audit, and the reference data/mutations both tabs share.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';

export const useGradingQuestions = (selectedSeason, enabled) => useQuery({
  queryKey: ['grading-questions', selectedSeason],
  queryFn: async () => {
    const res = await axios.get(`/api/v2/admin/grading/questions/${selectedSeason}`);
    return res.data;
  },
  staleTime: 30000,
  enabled,
});

export const useGradingAudit = (selectedSeason, enabled) => useQuery({
  queryKey: ['grading-audit', selectedSeason],
  queryFn: async () => {
    const res = await axios.get(`/api/v2/admin/grading/audit/${selectedSeason}`);
    return res.data;
  },
  staleTime: 30000,
  enabled,
});

export const useGradingSeasons = () => useQuery({
  queryKey: ['seasons', 'all'],
  queryFn: async () => {
    const res = await axios.get('/api/v2/seasons/user-participated');
    return res.data;
  },
});

export const useGradingPlayers = (enabled) => {
  const { data: playersData } = useQuery({
    queryKey: ['players', 'grading'],
    queryFn: async () => {
      const res = await axios.get('/api/v2/players/');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    enabled,
  });

  const playerOptions = useMemo(
    () => (playersData?.players || [])
      .map((player) => ({ value: player.id, label: player.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [playersData],
  );
  const playerNameById = useMemo(
    () => new Map((playersData?.players || []).map((player) => [String(player.id), player.name])),
    [playersData],
  );

  return { playerOptions, playerNameById };
};

export const useUpdateQuestionMutation = (onUpdated) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questionId,
      correctAnswer,
      isFinalized,
      answerPointValues,
      correctAnswerPlayerId,
      runnerUpPlayerId,
      runnerUpPoints,
    }) => {
      const res = await axios.post('/api/v2/admin/grading/update-question', {
        question_id: questionId,
        correct_answer: correctAnswer,
        is_finalized: isFinalized,
        answer_point_values: answerPointValues,
        correct_answer_player_id: correctAnswerPlayerId,
        runner_up_player_id: runnerUpPlayerId,
        runner_up_points: runnerUpPoints,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken('csrftoken'),
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grading-questions']);
      queryClient.invalidateQueries(['grading-audit']);
      onUpdated?.();
    },
  });
};

export const useManualGradeMutation = (onGraded) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ answerId, isCorrect, pointsOverride, correctAnswer }) => {
      const res = await axios.post('/api/v2/admin/grading/grade-manual', {
        answer_id: answerId,
        is_correct: isCorrect,
        points_override: pointsOverride,
        correct_answer: correctAnswer,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken('csrftoken'),
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grading-audit']);
      onGraded?.();
    },
  });
};

export const useRunGradingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ command, seasonSlug }) => {
      const res = await axios.post('/api/v2/admin/grading/run-grading-command', {
        command,
        season_slug: seasonSlug,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken('csrftoken'),
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grading-audit']);
      queryClient.invalidateQueries(['grading-questions']);
    },
  });
};
