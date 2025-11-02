// src/components/Loader.js

import React from 'react';

/**
 * Loader Component
 * A simple spinner loader using Tailwind CSS utility classes.
 *
 * Props:
 * - size (string): Optional. Determines the size of the loader. Defaults to '8'.
 * - color (string): Optional. Tailwind color class for the spinner border. Defaults to 'gray-200'.
 * - label (string): Optional. Accessible label for the loader. Defaults to 'Loading...'.
 *
 * Usage:
 * <Loader size="12" color="blue-500" label="Loading NBA Standings..." />
 */
const Loader = ({ size = '8', color = 'gray-200', label = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div
        className={`animate-spin rounded-full h-${size} w-${size} border-t-2 border-b-2 border-${color}`}
        role="status"
        aria-label={label}
      ></div>
      <span className="mt-2 text-sm text-gray-600">{label}</span>
    </div>
  );
};

export default Loader;