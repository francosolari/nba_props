// File: frontend/src/hooks/useSubmissions.js
/**
 * React hooks for question submissions and answer management.
 * Handles API calls for questions, answers, and submission status.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getCSRFToken } from '../utils/csrf';

/**
 * Fetch questions for a specific season
 */
export const useQuestions = (seasonSlug) => {
  return useQuery({
    queryKey: ['questions', seasonSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v2/submissions/questions/${seasonSlug}`);
      return data;
    },
    enabled: !!seasonSlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Fetch user's answers for a specific season
 */
export const useUserAnswers = (seasonSlug) => {
  return useQuery({
    queryKey: ['userAnswers', seasonSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v2/submissions/answers/${seasonSlug}`);
      return data;
    },
    enabled: !!seasonSlug,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get submission window status
 */
export const useSubmissionStatus = (seasonSlug) => {
  return useQuery({
    queryKey: ['submissionStatus', seasonSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v2/submissions/submission-status/${seasonSlug}`);
      return data;
    },
    enabled: !!seasonSlug,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

/**
 * Submit answers mutation
 */
export const useSubmitAnswers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ seasonSlug, answers }) => {
      if (!seasonSlug) {
        throw new Error('seasonSlug is required to submit answers');
      }
      const { data } = await axios.post(
        `/api/v2/submissions/answers/${seasonSlug}`,
        { answers },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        }
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      if (variables?.seasonSlug) {
        queryClient.invalidateQueries(['userAnswers', variables.seasonSlug]);
      }
    },
  });
};

/**
 * Get user context (including admin status)
 */
export const useUserContext = () => {
  return useQuery({
    queryKey: ['userContext'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v2/user/context');
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Get all available seasons
 */
export const useSeasons = () => {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v2/seasons/');
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
