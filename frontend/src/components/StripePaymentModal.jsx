// File: frontend/src/components/StripePaymentModal.jsx
/**
 * StripePaymentModal - Payment confirmation modal for Stripe Checkout
 * Replaces the legacy Venmo payment flow
 *
 * Features:
 * - Clean, modern payment prompt UI
 * - "Pay & Submit" button that redirects to Stripe Checkout
 * - "Not now" option to save as draft
 * - Clear messaging about payment requirement
 * - Apple Pay support (handled by Stripe)
 */

import React, { useState } from 'react';
import axios from 'axios';

const StripePaymentModal = ({ seasonSlug, onClose, onPaymentInitiated }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handlePayAndSubmit = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await axios.post('/api/v2/payments/create-checkout-session', {
        season_slug: seasonSlug,
      });

      const { checkout_url } = response.data;

      // Notify parent component that payment was initiated
      if (onPaymentInitiated) {
        onPaymentInitiated();
      }

      // Redirect to Stripe Checkout
      window.location.href = checkout_url;
    } catch (err) {
      console.error('Error creating checkout session:', err);

      let errorMessage = 'Failed to create payment session. Please try again.';

      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.status === 400) {
        errorMessage = 'You may have already initiated a payment. Please check your payment status.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Please log in to continue with payment.';
      }

      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-200 dark:border-slate-700">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Close payment prompt"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Required</h2>
        </div>

        {/* Body */}
        <div className="mb-8 space-y-3">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            To finalize your submission, you'll need to complete the <span className="font-semibold text-slate-900 dark:text-white">$25.00 entry fee</span>.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Your predictions have been saved as a draft. After payment, you can still edit until the deadline.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handlePayAndSubmit}
            disabled={isProcessing}
            className="w-full inline-flex items-center justify-center rounded-full bg-sky-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:bg-sky-600 dark:hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pay & Submit
              </>
            )}
          </button>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-6 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Not now - Save as Draft
          </button>
        </div>

        {/* Footer note */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-2 text-left">
            <svg className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>Secure payment powered by Stripe</p>
              <p>Apple Pay and credit cards accepted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripePaymentModal;
