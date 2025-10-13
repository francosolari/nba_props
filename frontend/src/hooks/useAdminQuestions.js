// File: frontend/src/hooks/useAdminQuestions.js
/**
 * React hooks for admin question management.
 * Handles CRUD operations for questions and reference data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getCSRFToken } from '../utils/csrf';

/**
 * Fetch questions for admin view
 */
export const useAdminQuestions = (seasonSlug) =>
  useQuery({
    queryKey: ['adminQuestions', seasonSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v2/admin/questions/${seasonSlug}`);
      return data;
    },
    enabled: !!seasonSlug,
  });

/**
 * Get reference data: awards
 */
export const useAwards = () =>
  useQuery({
    queryKey: ['admin', 'awards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v2/admin/reference-data/awards');
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

/**
 * Get reference data: teams
 */
export const useTeams = () =>
  useQuery({
    queryKey: ['admin', 'teams'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v2/teams/');
      return data?.teams ?? [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

/**
 * Get reference data: players
 */
export const usePlayers = () =>
  useQuery({
    queryKey: ['admin', 'players'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v2/players/');
      return data?.players ?? [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

/**
 * Create superlative question
 */
const invalidateForSeason = (queryClient, seasonSlug) => {
  if (!seasonSlug) {
    queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
    queryClient.invalidateQueries({ queryKey: ['questions'] });
    return;
  }
  queryClient.invalidateQueries({ queryKey: ['adminQuestions', seasonSlug] });
  queryClient.invalidateQueries({ queryKey: ['questions', seasonSlug] });
};

export const useCreateSuperlativeQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionData) => {
      const { data } = await axios.post('/api/v2/admin/questions/superlative', questionData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: (data) => {
      invalidateForSeason(queryClient, data?.question?.season_slug);
    },
  });
};

/**
 * Create prop question
 */
export const useCreatePropQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionData) => {
      const { data } = await axios.post('/api/v2/admin/questions/prop', questionData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: (data) => {
      invalidateForSeason(queryClient, data?.question?.season_slug);
    },
  });
};

/**
 * Create head-to-head question
 */
export const useCreateHeadToHeadQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionData) => {
      const { data } = await axios.post('/api/v2/admin/questions/head-to-head', questionData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: (data) => {
      invalidateForSeason(queryClient, data?.question?.season_slug);
    },
  });
};

export const useCreatePlayerStatQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionData) => {
      const { data } = await axios.post('/api/v2/admin/questions/player-stat', questionData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: (data) => {
      invalidateForSeason(queryClient, data?.question?.season_slug);
    },
  });
};

export const useCreateISTQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionData) => {
      const { data } = await axios.post('/api/v2/admin/questions/ist', questionData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: (data) => {
      invalidateForSeason(queryClient, data?.question?.season_slug);
    },
  });
};

export const useCreateNBAFinalsQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionData) => {
      const { data } = await axios.post('/api/v2/admin/questions/nba-finals', questionData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: (data) => {
      invalidateForSeason(queryClient, data?.question?.season_slug);
    },
  });
};

/**
 * Update question
 */
export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, updates }) => {
      const { data } = await axios.put(`/api/v2/admin/questions/${questionId}`, updates, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: (data, variables) => {
      const seasonSlug = variables?.seasonSlug ?? data?.question?.season_slug;
      invalidateForSeason(queryClient, seasonSlug);
    },
  });
};

/**
 * Delete question
 */
export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId }) => {
      const { data } = await axios.delete(`/api/v2/admin/questions/${questionId}`, {
        headers: {
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      invalidateForSeason(queryClient, variables?.seasonSlug);
    },
  });
};

export const useReorderQuestions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ seasonSlug, questionIds }) => {
      const { data } = await axios.post(
        '/api/v2/admin/questions/reorder',
        { question_ids: questionIds },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      invalidateForSeason(queryClient, variables?.seasonSlug);
    },
  });
};

export const useCreateSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seasonData) => {
      const { data } = await axios.post('/api/v2/seasons/', seasonData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });
};
