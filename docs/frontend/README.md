# Frontend Documentation

This document provides a comprehensive overview of the frontend for the NBA Predictions Game project.

## 1. Project Structure

The frontend is a React application with the following structure:

- `src/`: The main React source code directory.
- `components/`: Reusable React components.
- `hooks/`: Custom React hooks.
- `pages/`: Top-level page components.
- `utils/`: Utility functions.

### 1.1. `src/components/`

This directory contains reusable React components that are used throughout the application. For a detailed description of the components, see the [Components Documentation](./components.md).

### 1.2. `src/hooks/`

This directory contains custom React hooks that are used to share logic between components.

### 1.3. `src/pages/`

This directory contains the top-level page components for the application.

### 1.4. `src/utils/`

This directory contains utility functions that are used throughout the application.

## 2. State Management

The frontend uses Redux for state management and React Query for data fetching.

### 2.1. Redux

Redux is used to manage the global state of the application, such as the currently logged-in user.

### 2.2. React Query

React Query is used to fetch data from the backend API. It provides a number of features that make it easy to work with asynchronous data, such as caching, optimistic updates, and automatic refetching.

## 3. Styling

The frontend is styled with Tailwind CSS. Tailwind is a utility-first CSS framework that makes it easy to build custom designs without writing a lot of custom CSS.
## Leaderboard Detail View

The detailed leaderboard page lives at `/page-detail/<season_slug>/` and provides:

- Tabs for Regular Season Standings, Player Awards, and Props & Yes/No
- Column sorting (standings points, total points, name) and player search
- Pin/unpin player columns, remove players, and add players to compare
- Compact per-column totals stacked in the header (category + total)
- Regular Season What‑If simulation:
  - Toggle in the top bar, Reset to actual
  - Inline drag of team rows per conference to simulate standings
  - Live recomputation of standings category points and overall totals
  - Floating Top‑3 summary that reflects current or simulated ranks

Notes:
- West/East groups are visually separated with subtle NBA red/blue header strips.
- Only team-name sticky cells are shaded; the data cells remain neutral for readability.

## Upcoming Games Simulator (Planned)

- Component: `frontend/src/components/UpcomingGamesSimulator.jsx`
- Purpose: Show next 7 days of games (via backend `nba_api` endpoint), let users pick winners, and apply a What‑If simulation that recalculates standings/point deltas.
- Integration sketch:
  - Backend: add `/api/v2/schedule/week` returning `{ id, date, homeTeam, awayTeam, startTime }[]` from `nba_api`, cached hourly.
  - Frontend: fetch into state, render `<UpcomingGamesSimulator games={...} onSimulate={applyScheduleWhatIf} />`.
  - Simulation: translate picks into updated “actual” standings then reuse existing What‑If pipeline to recompute category/total points.

## Team Logos and Slugs

- Static logos served from `/static/img/teams/<team-slug>.svg`.
- Slug rule: lowercase, remove punctuation, spaces → hyphens (e.g., `los-angeles-lakers.svg`).
- Fallback: `frontend/static/img/teams/unknown.svg` used if a team logo is missing.
