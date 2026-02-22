import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLeaderboard, useUserSubmissions } from '../../hooks';
import HomePage from '../HomePage';

jest.mock('@tanstack/react-query');
jest.mock('axios');
jest.mock('../../hooks');

const mockUseQuery = useQuery;
const mockUseLeaderboard = useLeaderboard;
const mockUseUserSubmissions = useUserSubmissions;

const mockLeaderboardData = [
  {
    rank: 1,
    user: {
      id: 1,
      username: 'testuser',
      display_name: 'Test User',
      total_points: 100,
      categories: {
        'Regular Season Standings': { points: 30, max_points: 50, predictions: [] },
        'Player Awards': { points: 40, max_points: 60, predictions: [] },
        'Props & Yes/No': { points: 30, max_points: 50, predictions: [] },
      },
    },
  },
  {
    rank: 2,
    user: {
      id: 2,
      username: 'player2',
      display_name: 'Player 2',
      total_points: 90,
      categories: {
        'Regular Season Standings': { points: 25, max_points: 50, predictions: [] },
        'Player Awards': { points: 35, max_points: 60, predictions: [] },
        'Props & Yes/No': { points: 30, max_points: 50, predictions: [] },
      },
    },
  },
];

describe('HomePage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="home-root" data-season-slug="2024-25" data-is-authenticated="true" data-user-id="1" data-username="testuser" data-display-name="Test User" data-has-submission="true" data-submission-open="true" data-submit-url="/submit" data-leaderboard-url="/leaderboard" data-profile-url="/profile"></div>';

    mockUseLeaderboard.mockReturnValue({
      data: mockLeaderboardData,
      isLoading: false,
      error: null,
    });

    mockUseUserSubmissions.mockReturnValue({
      submissionData: {
        standings: {
          east: [{ team_name: 'Celtics', predicted_position: 1 }],
          west: [{ team_name: 'Lakers', predicted_position: 1 }],
        },
        sections: [
          { label: 'Props & Totals', total: 7, completed: 3 },
          { label: 'Superlatives', total: 4, completed: 2 },
        ],
      },
      isLoading: false,
    });

    mockUseQuery.mockReturnValue({
      data: {
        mini_standings: {
          eastern: [
            { team: 'Celtics', position: 1, wins: 50, losses: 20 },
          ],
          western: [
            { team: 'Lakers', position: 1, wins: 48, losses: 22 },
          ],
        },
      },
      isLoading: false,
    });

    axios.get.mockResolvedValue({
      data: {
        mini_standings: {
          eastern: [],
          western: [],
        },
      },
    });
  });

  test('renders without crashing', () => {
    const { container } = render(<HomePage seasonSlug="2024-25" />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  test('displays loading state initially when data is loading', () => {
    mockUseLeaderboard.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(<HomePage seasonSlug="2024-25" />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  test('handles unauthenticated state', () => {
    document.body.innerHTML = '<div id="home-root" data-season-slug="2024-25" data-is-authenticated="false" data-login-url="/login" data-signup-url="/signup"></div>';

    render(<HomePage seasonSlug="2024-25" />);

    expect(screen.getByText(/Make your NBA predictions/i)).toBeInTheDocument();
    expect(screen.getByText(/Log in to start/i)).toBeInTheDocument();
    expect(screen.getByText(/Create account/i)).toBeInTheDocument();
  });

  test('renders authenticated user welcome message', async () => {
    render(<HomePage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Test User/i)).toBeInTheDocument();
    });
  });

  test('displays user stats when authenticated and has submission', async () => {
    render(<HomePage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByText(/Season snapshot/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Rank/i).length).toBeGreaterThan(0);
  });

  test('renders leaderboard preview section', async () => {
    render(<HomePage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard snapshot/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Test User/i).length).toBeGreaterThan(0);
  });

  test('displays submission preview card', () => {
    render(<HomePage seasonSlug="2024-25" />);

    expect(screen.getByText(/Props Prediction board/i)).toBeInTheDocument();
    expect(screen.getByText(/Submission saved/i)).toBeInTheDocument();
  });

  test('shows correct CTA for authenticated user with submission', () => {
    render(<HomePage seasonSlug="2024-25" />);

    expect(screen.getByText(/Edit submission/i)).toBeInTheDocument();
  });

  test('shows correct CTA for authenticated user without submission', () => {
    document.body.innerHTML = '<div id="home-root" data-season-slug="2024-25" data-is-authenticated="true" data-user-id="1" data-username="testuser" data-display-name="Test User" data-has-submission="false" data-submission-open="true" data-submit-url="/submit" data-leaderboard-url="/leaderboard"></div>';

    mockUseLeaderboard.mockReturnValue({
      data: mockLeaderboardData,
      isLoading: false,
      error: null,
    });

    render(<HomePage seasonSlug="2024-25" />);

    expect(screen.getByText(/Create submission/i)).toBeInTheDocument();
  });

  test('handles empty leaderboard data gracefully', () => {
    mockUseLeaderboard.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<HomePage seasonSlug="2024-25" />);

    expect(screen.getByText(/Leaderboard coming soon/i)).toBeInTheDocument();
  });

  test('renders hero section with correct variant for guest', () => {
    document.body.innerHTML = '<div id="home-root" data-season-slug="2024-25" data-is-authenticated="false"></div>';

    render(<HomePage seasonSlug="2024-25" />);

    expect(screen.getByText(/Make your NBA predictions/i)).toBeInTheDocument();
  });

  test('renders hero section with correct variant for incomplete submission', () => {
    document.body.innerHTML = '<div id="home-root" data-season-slug="2024-25" data-is-authenticated="true" data-user-id="1" data-has-submission="false" data-submission-open="true"></div>';

    mockUseLeaderboard.mockReturnValue({
      data: mockLeaderboardData,
      isLoading: false,
      error: null,
    });

    render(<HomePage seasonSlug="2024-25" />);

    expect(screen.getByText(/Pick up your predictions right where you left off/i)).toBeInTheDocument();
  });

  test('displays deadline information when available', () => {
    document.body.innerHTML = '<div id="home-root" data-season-slug="2024-25" data-is-authenticated="true" data-user-id="1" data-submission-open="true" data-submission-end="2024-10-22T18:00:00Z"></div>';

    mockUseLeaderboard.mockReturnValue({
      data: mockLeaderboardData,
      isLoading: false,
      error: null,
    });

    render(<HomePage seasonSlug="2024-25" />);

    expect(screen.getByText(/Submission Period/i)).toBeInTheDocument();
  });
});
