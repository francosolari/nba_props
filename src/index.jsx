// src/index.js

import React from 'react';
import ReactDOM from 'react-dom';
import './styles.css';  // Ensure Tailwind CSS is included if not via CDN
import './styles/utilities.css';  // Import accessibility utilities
import PredictionBoard from './components/PredictionBoard';
import Leaderboard from './components/Leaderboard';
import NBAStandings from './components/NBAStandings';
import whatIfStandings from "./components/whatIfStandings";
import DisplayPredictions from "./components/DisplayPredictions.jsx";
import EditablePredictionBoard from "./components/EditablePredictionBoard";
import QuestionForm from "./components/QuestionForm";
import UserPredictionModal from "./components/UserPredictionModal.jsx";
import PredictionsTable from './components/archive/PredictionsTable';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import ReadOnlyStandingsList from "./components/ReadOnlyStandingsList";

console.log("React bundle loaded and running!");

// Function to mount a React component to a specified root element
const mountComponent = (component, rootId, componentName) => {
  const rootElement = document.getElementById(rootId);
  if (rootElement) {
    const seasonSlug = rootElement.getAttribute('data-season-slug');
    console.log(`Mounting ${componentName} to #${rootId} with seasonSlug:`, seasonSlug);
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(component, { seasonSlug }));
  } else {
    console.warn(`Root element #${rootId} not found. Skipping mounting ${componentName}.`);
  }
};

// Mount PredictionBoard Component
mountComponent(PredictionBoard, 'prediction-root', "PredictionBoard");

// Mount Leaderboard Component
mountComponent(Leaderboard, 'leaderboard-root',"LeaderBoard");

// Mount NBAStandings Component
mountComponent(NBAStandings, 'nba-standings-root', "NBA Standings");

mountComponent(whatIfStandings, 'what-if-standings-root', "What-If Standings");

mountComponent(DisplayPredictions, 'display-predictions-root', "Display-Predictions");

mountComponent(EditablePredictionBoard,
    'display-editable-predictions-root', "Editable-Predictions");

mountComponent(QuestionForm,
    'display-qform-predictions-root', "Question-Form");
mountComponent(UserPredictionModal,
    'display-user-predictions-root', "User-Predictions");
// Mounting predictions table
// mountComponent(PredictionsTable, 'predictions-table-root', 'PredictionsTable');

mountComponent(LeaderboardPage, 'leaderboard-page-root', 'LeaderboardPage');