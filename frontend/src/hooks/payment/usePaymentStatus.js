// File: frontend/src/hooks/usePaymentStatus.js
/**
 * Custom hooks for Stripe payment status management
 * Provides React Query hooks for fetching and monitoring payment status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Fetch payment status for a given season
 * @param {string} seasonSlug - The season slug to check payment for
 * @param {object} options - React Query options (enabled, refetchInterval, etc.)
 * @returns {object} React Query result with payment status data
 */
export const usePaymentStatus = (seasonSlug, options = {}) => {
  return useQuery({
    queryKey: ['paymentStatus', seasonSlug],
    queryFn: async () => {
      if (!seasonSlug) {
        throw new Error('Season slug is required');
      }
      const response = await axios.get(`/api/v2/payments/payment-status/${seasonSlug}`);
      return response.data;
    },
    enabled: !!seasonSlug && (options.enabled !== false),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    ...options,
  });
};

/**
 * Verify payment status after returning from Stripe Checkout
 * @param {string} seasonSlug - The season slug
 * @param {string} sessionId - Stripe checkout session ID from URL params
 * @returns {object} React Query result with verified payment data
 */
export const useVerifyPayment = (seasonSlug, sessionId, options = {}) => {
  return useQuery({
    queryKey: ['verifyPayment', seasonSlug, sessionId],
    queryFn: async () => {
      if (!seasonSlug || !sessionId) {
        throw new Error('Season slug and session ID are required');
      }
      const response = await axios.get(
        `/api/v2/payments/verify-payment/${seasonSlug}?session_id=${sessionId}`
      );
      return response.data;
    },
    enabled: !!seasonSlug && !!sessionId && (options.enabled !== false),
    staleTime: Infinity, // Don't refetch verification results automatically
    retry: 3, // Retry failed verifications (in case webhook hasn't processed yet)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    ...options,
  });
};

/**
 * Fetch enhanced submission status including payment validation
 * @param {string} seasonSlug - The season slug
 * @returns {object} React Query result with submission status including payment info
 */
export const useSubmissionStatusWithPayment = (seasonSlug, options = {}) => {
  return useQuery({
    queryKey: ['submissionStatusWithPayment', seasonSlug],
    queryFn: async () => {
      if (!seasonSlug) {
        throw new Error('Season slug is required');
      }
      const response = await axios.get(`/api/v2/payments/submission-status/${seasonSlug}`);
      return response.data;
    },
    enabled: !!seasonSlug && (options.enabled !== false),
    staleTime: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * Create a Stripe Checkout session
 * @returns {object} Mutation object with mutate function
 */
export const useCreateCheckoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seasonSlug) => {
      const response = await axios.post('/api/v2/payments/create-checkout-session', {
        season_slug: seasonSlug,
      });
      return response.data;
    },
    onSuccess: (data, seasonSlug) => {
      // Invalidate payment status queries after creating checkout session
      queryClient.invalidateQueries(['paymentStatus', seasonSlug]);
      queryClient.invalidateQueries(['submissionStatusWithPayment', seasonSlug]);
    },
  });
};

/**
 * Helper hook to check if user has paid for a season
 * Returns a simplified boolean and loading state
 */
export const useHasPaid = (seasonSlug) => {
  const { data, isLoading, isError } = usePaymentStatus(seasonSlug);

  return {
    hasPaid: data?.is_paid === true,
    paymentStatus: data?.payment_status,
    isLoading,
    isError,
    paidAt: data?.paid_at,
  };
};

/**
 * Hook to handle post-payment redirect flow
 * Automatically verifies payment when session_id is in URL
 */
export const usePaymentRedirectHandler = (seasonSlug) => {
  const queryClient = useQueryClient();

  // Check URL for session_id parameter
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const paymentSuccess = urlParams.get('payment_success') === 'true';

  // Verify payment if we have a session_id
  const {
    data: verificationData,
    isLoading: isVerifying,
    isError: verificationFailed,
    isSuccess: verificationSuccess,
  } = useVerifyPayment(seasonSlug, sessionId, {
    enabled: !!sessionId && !!seasonSlug,
  });

  // Clean up URL parameters after verification
  const clearUrlParams = () => {
    if (sessionId || paymentSuccess) {
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      url.searchParams.delete('payment_success');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Invalidate relevant queries after successful verification
  if (verificationSuccess && verificationData?.is_paid) {
    queryClient.invalidateQueries(['paymentStatus', seasonSlug]);
    queryClient.invalidateQueries(['submissionStatusWithPayment', seasonSlug]);
    queryClient.invalidateQueries(['userAnswers', seasonSlug]);
  }

  return {
    hasRedirectParams: !!sessionId,
    isVerifying,
    verificationFailed,
    verificationSuccess,
    paymentData: verificationData,
    clearUrlParams,
  };
};

export default {
  usePaymentStatus,
  useVerifyPayment,
  useSubmissionStatusWithPayment,
  useCreateCheckoutSession,
  useHasPaid,
  usePaymentRedirectHandler,
};
