// src/index.jsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import './styles.css';  // Ensure Tailwind CSS is included if not via CDN
import './styles/utilities.css';  // Import accessibility utilities
import SiteLayout from './components/SiteLayout.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import '@fontsource/source-sans-3/latin-700.css';
import './styles/tokens.css';
import './styles/courtside.css';
import './styles/courtside-advanced.css';
import './styles/prop-choice.css';
import './styles/SubmissionsPage.css';

// Create a single QueryClient instance for all mounts
const queryClient = new QueryClient();

function render(rootElement, component) {
  const seasonSlug = rootElement.getAttribute('data-season-slug');
  createRoot(rootElement).render(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(component, { seasonSlug }),
      ),
    ),
  );
}

/**
 * Mount a page only on the page that asks for it.
 *
 * Every template loads the one bundle, so a static import of all twenty roots
 * made each page parse the admin panel, the question wizard, and the drag and
 * drop board before it could render. The import is deferred behind the root
 * element check, which lets webpack put each page in its own chunk and leaves
 * the entry holding only what genuinely runs everywhere: the nav, the theme
 * toggle, and the query client.
 */
const mountLazy = (rootId, load, componentName) => {
  const rootElement = document.getElementById(rootId);
  if (!rootElement) return;
  load()
    .then((module) => render(rootElement, module.default))
    .catch((error) => console.error(`Failed to load ${componentName} for #${rootId}`, error));
};

/** Root element id, loader, name. One entry per mountable page. */
const PAGES = [
  ['prediction-root', () => import(/* webpackChunkName: "prediction-board" */ './components/PredictionBoard'), 'PredictionBoard'],
  ['leaderboard-root', () => import(/* webpackChunkName: "leaderboard-widget" */ './components/Leaderboard'), 'Leaderboard'],
  ['nba-standings-root', () => import(/* webpackChunkName: "nba-standings" */ './components/NBAStandings'), 'NBAStandings'],
  ['what-if-standings-root', () => import(/* webpackChunkName: "what-if-standings" */ './components/whatIfStandings'), 'WhatIfStandings'],
  ['display-predictions-root', () => import(/* webpackChunkName: "display-predictions" */ './components/DisplayPredictions.jsx'), 'DisplayPredictions'],
  ['display-editable-predictions-root', () => import(/* webpackChunkName: "editable-predictions" */ './components/EditablePredictionBoard'), 'EditablePredictionBoard'],
  ['display-qform-predictions-root', () => import(/* webpackChunkName: "question-form" */ './components/QuestionForm'), 'QuestionForm'],
  ['display-user-predictions-root', () => import(/* webpackChunkName: "user-prediction-modal" */ './components/UserPredictionModal.jsx'), 'UserPredictionModal'],
  ['leaderboard-page-root', () => import(/* webpackChunkName: "leaderboard-page" */ './pages/LeaderboardPage.jsx'), 'LeaderboardPage'],
  ['leaderboard-detail-root', () => import(/* webpackChunkName: "leaderboard-detail" */ './pages/LeaderboardDetailPage.jsx'), 'LeaderboardDetailPage'],
  ['home-root', () => import(/* webpackChunkName: "home" */ './pages/HomePage.jsx'), 'HomePage'],
  ['profile-root', () => import(/* webpackChunkName: "profile" */ './pages/ProfilePage.jsx'), 'ProfilePage'],
  ['submissions-root', () => import(/* webpackChunkName: "submissions" */ './pages/SubmissionsPage.jsx'), 'SubmissionsPage'],
  ['admin-panel-root', () => import(/* webpackChunkName: "admin-panel" */ './pages/AdminPanel.jsx'), 'AdminPanel'],
  ['admin-grading-root', () => import(/* webpackChunkName: "admin-grading" */ './pages/AdminGradingPanel.jsx'), 'AdminGradingPanel'],
  ['admin-dashboard-root', () => import(/* webpackChunkName: "admin-dashboard" */ './pages/AdminDashboard.jsx'), 'AdminDashboard'],
  ['ist-center-root', () => import(/* webpackChunkName: "ist-center" */ './pages/ist/ISTCenterPage.jsx'), 'ISTCenterPage'],
];

PAGES.forEach(([rootId, load, componentName]) => mountLazy(rootId, load, componentName));

// The nav is on every page and its absence is visible, so it stays in the entry
// and mounts without waiting on a chunk.
const siteLayoutRoot = document.getElementById('site-layout-root');
if (siteLayoutRoot) render(siteLayoutRoot, SiteLayout);

// Mount the light/dark theme toggle into the persistent topbar
const themeToggleRoot = document.getElementById('theme-toggle-root');
if (themeToggleRoot) {
  createRoot(themeToggleRoot).render(React.createElement(ThemeToggle));
}
