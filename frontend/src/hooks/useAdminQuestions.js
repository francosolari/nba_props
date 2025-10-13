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
export const useAdminQuestions = (seasonSlug) => {
  return useQuery({
    queryKey: ['adminQuestions', seasonSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v2/admin/questions/${seasonSlug}`);
      return data;
    },
    enabled: !!seasonSlug,
  });
};

/**
 * Get reference data: awards
 */
export const useAwards = () => {
  return useQuery({
    queryKey: ['awards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v2/admin/reference-data/awards');
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Get reference data: teams
 */
export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v2/admin/reference-data/teams');
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Get reference data: players
 */
export const usePlayers = () => {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v2/admin/reference-data/players');
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Create superlative question
 */
export const useCreateSuperlativeQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionData) => {
      const { data } = await axios.post(
        '/api/v2/admin/questions/superlative',
        questionData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      // Invalidate questions list for this season
      queryClient.invalidateQueries(['adminQuestions', data.question.season_slug]);
      queryClient.invalidateQueries(['questions', data.question.season_slug]);
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
      const { data } = await axios.post(
        '/api/v2/admin/questions/prop',
        questionData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminQuestions', data.question.season_slug]);
      queryClient.invalidateQueries(['questions', data.question.season_slug]);
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
      const { data } = await axios.post(
        '/api/v2/admin/questions/head-to-head',
        questionData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminQuestions', data.question.season_slug]);
      queryClient.invalidateQueries(['questions', data.question.season_slug]);
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
      const { data } = await axios.put(
        `/api/v2/admin/questions/${questionId}`,
        updates,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminQuestions']);
      queryClient.invalidateQueries(['questions']);
    },
  });
};

/**
 * Delete question
 */
export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionId) => {
      const { data } = await axios.delete(
        `/api/v2/admin/questions/${questionId}`,
        {
          headers: {
            'X-CSRFToken': getCSRFToken(),
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminQuestions']);
      queryClient.invalidateQueries(['questions']);
    },
  });
};
