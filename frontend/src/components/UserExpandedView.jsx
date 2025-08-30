// src/components/UserExpandedView.jsx
import React from 'react';
import PropTypes from 'prop-types';
import CategoryIcon from './CategoryIcon';
import ProgressBar from './ProgressBar';

/**
 * Renders the expanded view of a user with a grid of category cards.
 * 
 * @param {Object} props
 * @param {Array} props.categories - Array of category data
 * @param {string} props.className - Additional CSS classes
 */
const UserExpandedView = ({ categories = [], className = '' }) => {
  return (
    <div className={`w-full py-3 ${className}`}>
      {/* Grid layout: 1 column on mobile, 3 columns on lg screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <CategoryCard 
            key={category.id} 
            category={category} 
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Renders a single category card with predictions list
 * 
 * @param {Object} props
 * @param {Object} props.category - Category data with predictions
 */
const CategoryCard = ({ category }) => {
  const { 
    type, 
    icon, 
    title, 
    points = 0, 
    maxPoints = 0, 
    predictions = [] 
  } = category;

  // Calculate completion percentage for the progress bar
  const progressPercentage = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
  
  return (
    <div className="border rounded-md shadow-sm bg-white overflow-hidden">
      {/* Card Header */}
      <div className="p-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <CategoryIcon 
              category={type || 'Regular'} 
              size="md" 
              showLabel={true} 
              className="mr-2"
            />
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>
          <div className="font-bold text-sm">
            {points}/{maxPoints}
          </div>
        </div>
        
        {/* Progress Bar */}
        <ProgressBar 
          value={points} 
          max={maxPoints} 
          size="lg"
          color={progressPercentage > 0 ? "bg-blue-500" : "bg-gray-300"}
          showValue={false}
        />
      </div>
      
      {/* Predictions List with scrollable area */}
      <div className="max-h-72 overflow-y-auto">
        <ul className="divide-y list-none p-0 m-0">
          {predictions.map((prediction) => (
            <li key={prediction.id}>
              <PredictionItem 
                prediction={prediction} 
                isStandings={type === 'Regular' && title.includes('Standings')}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Renders a single prediction item within a category card
 * 
 * @param {Object} props
 * @param {Object} props.prediction - Prediction data
 * @param {boolean} props.isStandings - Whether this is a standings prediction
 */
const PredictionItem = ({ prediction, isStandings = false }) => {
  const { 
    id, 
    question, 
    answer, 
    correct, 
    points = 0, 
    team_name, 
    predicted_position, 
    actual_position 
  } = prediction;
  
  // Determine background color based on prediction status
  let bgColorClass = 'bg-gray-100'; // Default neutral for pending
  
  if (correct === true) {
    bgColorClass = 'bg-green-100';
  } else if (correct === false) {
    bgColorClass = 'bg-red-100';
  }
  
  return (
    <div className={`p-2 text-sm ${bgColorClass}`}>
      {isStandings ? (
        // For Regular Season Standings predictions
        <div className="flex justify-between items-center">
          <div className="font-medium">{team_name}</div>
          <div className="flex items-center">
            <span className="font-semibold mr-1">{predicted_position}</span>
            <span className="text-gray-500">vs</span>
            <span className="font-semibold ml-1">{actual_position || '?'}</span>
          </div>
        </div>
      ) : (
        // For other types of predictions
        <div className="flex justify-between items-center">
          <div className="pr-2">{question}</div>
          <div className="flex items-center flex-shrink-0">
            {correct === true && <span className="mr-1 text-green-600">✓</span>}
            {correct === false && <span className="mr-1 text-red-600">✗</span>}
            {points > 0 && <span className="text-xs font-medium">+{points}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

UserExpandedView.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      type: PropTypes.string,
      icon: PropTypes.string,
      title: PropTypes.string,
      points: PropTypes.number,
      maxPoints: PropTypes.number,
      predictions: PropTypes.array,
    })
  ),
  className: PropTypes.string,
};

export default UserExpandedView;
