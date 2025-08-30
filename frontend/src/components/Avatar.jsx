// src/components/Avatar.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Avatar Component
 * 
 * Displays a user avatar with an image if provided, or falls back to initials.
 * 
 * @param {Object} props
 * @param {string} props.src - Source URL for the avatar image
 * @param {string} props.name - User's name (used to generate initials if no image)
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.size - Size of the avatar ('xs', 'sm', 'md', 'lg', 'xl')
 * @param {string} props.bgColor - Background color for the initials fallback
 * @param {string} props.textColor - Text color for the initials
 * @param {string} props.className - Additional CSS classes
 */
const Avatar = ({ 
  src, 
  name, 
  alt, 
  size = 'md', 
  bgColor = 'bg-gray-200',
  textColor = 'text-gray-700',
  className = '',
}) => {
  // Size mapping
  const sizeClasses = {
    'xs': 'w-6 h-6 text-xs',
    'sm': 'w-8 h-8 text-sm',
    'md': 'w-10 h-10 text-md',
    'lg': 'w-12 h-12 text-lg',
    'xl': 'w-16 h-16 text-xl',
  };
  
  // Generate initials from name
  const initials = useMemo(() => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, [name]);

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <div 
      className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center ${className}`}
    >
      {src ? (
        <img 
          src={src} 
          alt={alt || name || 'Avatar'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentNode.classList.add(bgColor, textColor);
            e.target.parentNode.setAttribute('data-initials', initials);
          }}
        />
      ) : (
        <div className={`${bgColor} ${textColor} w-full h-full flex items-center justify-center font-medium`}>
          {initials}
        </div>
      )}
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  name: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  bgColor: PropTypes.string,
  textColor: PropTypes.string,
  className: PropTypes.string,
};

export default Avatar;
