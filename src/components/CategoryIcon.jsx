// src/components/CategoryIcon.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * CategoryIcon Component
 * 
 * Maps category types to their corresponding icons/visual representations.
 * Supports "Regular", "Awards", and "Props" category types.
 * 
 * @param {Object} props
 * @param {string} props.category - The category type ('Regular', 'Awards', 'Props')
 * @param {string} props.size - Size of the icon ('sm', 'md', 'lg')
 * @param {boolean} props.showLabel - Whether to display the category label text
 * @param {string} props.className - Additional CSS classes
 */
const CategoryIcon = ({ 
  category, 
  size = 'md', 
  showLabel = false, 
  className = '',
}) => {
  // Size variant classes
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base',
  };
  
  // Icon and color mappings for each category
  const categoryConfig = {
    Regular: {
      icon: '🏀',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      label: 'Regular',
    },
    Awards: {
      icon: '🏆',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      label: 'Awards',
    },
    Props: {
      icon: '📊',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      label: 'Props',
    },
    // Default fallback
    default: {
      icon: '❓',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      label: 'Unknown',
    },
  };
  
  // Get the configuration for the requested category or use default
  const config = categoryConfig[category] || categoryConfig.default;
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Create a CSS class for screen reader only text
  const srOnlyClass = "sr-only";
  
  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className={`${config.bgColor} ${config.textColor} ${sizeClass} flex items-center justify-center rounded-full`}>
        <span role="img" aria-label={config.label}>
          {config.icon}
        </span>
        <span className={srOnlyClass}>{config.label} category</span>
      </div>
      {showLabel && (
        <span className={`ml-1 ${config.textColor} font-medium`}>
          {config.label}
        </span>
      )}
    </div>
  );
};

CategoryIcon.propTypes = {
  category: PropTypes.oneOf(['Regular', 'Awards', 'Props']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showLabel: PropTypes.bool,
  className: PropTypes.string,
};

export default CategoryIcon;
