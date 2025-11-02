// src/components/ProgressBar.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * ProgressBar Component
 * 
 * Displays a progress bar with customizable appearance.
 * 
 * @param {Object} props
 * @param {number} props.value - Current progress value
 * @param {number} props.max - Maximum value (100% progress)
 * @param {string} props.size - Size variant ('sm', 'lg')
 * @param {string} props.color - Color of the progress bar
 * @param {string} props.bgColor - Background color of the track
 * @param {boolean} props.showValue - Whether to display the numerical value
 * @param {string} props.valueFormat - Format for the displayed value ('percent', 'fraction', 'raw')
 * @param {string} props.className - Additional CSS classes
 */
const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  size = 'sm', 
  color = 'bg-blue-500', 
  bgColor = 'bg-gray-200',
  showValue = false, 
  valueFormat = 'percent',
  className = '',
}) => {
  // Ensure value is not negative and doesn't exceed max
  const normalizedValue = Math.max(0, Math.min(value, max));
  
  // Calculate percentage for width
  const percentage = max > 0 ? (normalizedValue / max) * 100 : 0;
  
  // Size variant styles
  const sizeClasses = {
    sm: 'h-2 text-xs',
    md: 'h-3 text-sm',
    lg: 'h-4 text-sm',
  };
  
  // Format the displayed value based on valueFormat
  const getFormattedValue = () => {
    switch (valueFormat) {
      case 'percent':
        return `${Math.round(percentage)}%`;
      case 'fraction':
        return `${normalizedValue}/${max}`;
      case 'raw':
      default:
        return `${normalizedValue}`;
    }
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${sizeClasses[size] || sizeClasses.sm} ${bgColor} rounded-full overflow-hidden`}>
        <div 
          className={`${color} h-full rounded-full transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={normalizedValue}
          aria-valuemin="0"
          aria-valuemax={max}
        ></div>
      </div>
      {showValue && (
        <div className={`text-right mt-1 ${sizeClasses[size].split(' ')[1]}`}>
          {getFormattedValue()}
        </div>
      )}
    </div>
  );
};

ProgressBar.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  size: PropTypes.oneOf(['sm', 'lg']),
  color: PropTypes.string,
  bgColor: PropTypes.string,
  showValue: PropTypes.bool,
  valueFormat: PropTypes.oneOf(['percent', 'fraction', 'raw']),
  className: PropTypes.string,
};

export default ProgressBar;
