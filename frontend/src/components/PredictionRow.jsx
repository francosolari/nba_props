// src/components/PredictionRow.jsx
import React from 'react';
import PropTypes from 'prop-types';
import CategoryIcon from './CategoryIcon';

/**
 * PredictionRow Component
 * 
 * Displays a prediction with question text, status and points earned.
 * 
 * @param {Object} props
 * @param {string} props.question - The prediction question text
 * @param {string} props.status - Current status ('pending', 'correct', 'incorrect', 'partial')
 * @param {number} props.points - Points earned for this prediction
 * @param {number} props.possiblePoints - Maximum possible points for this prediction
 * @param {string} props.category - Category of the prediction ('Regular', 'Awards', 'Props')
 * @param {boolean} props.compact - Whether to show in compact mode (less details)
 * @param {string} props.answer - User's answer to the prediction question
 * @param {string} props.correctAnswer - The correct answer (if available)
 * @param {string} props.className - Additional CSS classes
 */
const PredictionRow = ({ 
  question,
  status = 'pending',
  points = 0,
  possiblePoints = 3,
  category = 'Regular',
  compact = false,
  answer = '',
  correctAnswer = '',
  className = '',
}) => {
  // Status configuration (colors, icons, labels)
  const statusConfig = {
    pending: {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      icon: '⏳',
      label: 'Pending',
    },
    correct: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      icon: '✅',
      label: 'Correct',
    },
    incorrect: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      icon: '❌',
      label: 'Incorrect',
    },
    partial: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300',
      icon: '⚠️',
      label: 'Partial',
    },
  };
  
  // Get config for current status or default to pending
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <div className={`border rounded-md p-3 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className={`flex items-center justify-between ${compact ? 'text-sm' : 'text-base'}`}>
        {/* Left side: Category icon and question */}
        <div className="flex items-center flex-grow">
          <CategoryIcon 
            category={category} 
            size={compact ? 'sm' : 'md'} 
            className="mr-2 flex-shrink-0"
          />
          <div className={`font-medium ${config.textColor} ${compact ? 'truncate' : ''}`}>
            {question}
          </div>
        </div>
        
        {/* Right side: Status and points */}
        <div className="flex items-center ml-2 flex-shrink-0">
          {!compact && (
            <div className="flex items-center mr-3">
              <span role="img" aria-label={config.label} className="mr-1">
                {config.icon}
              </span>
              <span className={`${config.textColor} text-sm`}>
                {config.label}
              </span>
            </div>
          )}
          
          <div className={`${config.textColor} font-bold ${compact ? 'text-sm' : 'text-base'}`}>
            {points}/{possiblePoints} pts
          </div>
        </div>
      </div>
      
      {/* Show answer details in non-compact mode as a semantic list */}
      {!compact && answer && (
        <div className="mt-2 text-sm">
          <ul className="list-none p-0 m-0">
            <li className="text-gray-600 mb-1">Your answer: <span className="font-medium">{answer}</span></li>
            {correctAnswer && status !== 'pending' && (
              <li className="text-gray-600">
                Correct answer: <span className="font-medium">{correctAnswer}</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

PredictionRow.propTypes = {
  question: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['pending', 'correct', 'incorrect', 'partial']),
  points: PropTypes.number,
  possiblePoints: PropTypes.number,
  category: PropTypes.oneOf(['Regular', 'Awards', 'Props']),
  compact: PropTypes.bool,
  answer: PropTypes.string,
  correctAnswer: PropTypes.string,
  className: PropTypes.string,
};

export default PredictionRow;
