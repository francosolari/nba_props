import React from 'react';
import { screen } from '@testing-library/react';
import axios from 'axios';
import { renderWithProviders } from '../../test-utils';
import HomePage from '../HomePage';
import { useLeaderboard, useUserSubmissions } from '../../hooks';

jest.mock('axios');
jest.mock('../../hooks', () => ({
  useLeaderboard: jest.fn(),
  useUserSubmissions: jest.fn(),
}));

const leaderboard = [
  { rank: 1, user: { id: 2, username: 'leader', display_name: 'Leader', total_points: 184, categories: {} } },
  {
    rank: 3,
    user: {
      id: 101,
      username: 'jordan-qa',
      display_name: 'Jordan',
      total_points: 168,
      categories: {
        'Regular Season Standings': { points: 72, max_points: 120 },
        'Player Awards': { points: 48, max_points: 80 },
        'Props & Yes/No': { points: 48, max_points: 75 },
      },
    },
  },
];

function addHomeRoot(overrides = {}) {
  const root = document.createElement('div');
  root.id = 'home-root';
  Object.assign(root.dataset, {
    isAuthenticated: 'false',
    userId: '',
    username: '',
    displayName: '',
    seasonSlug: '2026-27',
    hasSubmission: 'false',
    submissionOpen: 'true',
    submissionEnd: '2026-10-20T19:00:00-04:00',
    submitUrl: '/submit/2026-27/',
    signupUrl: '/accounts/signup/',
    loginUrl: '/accounts/login/',
    leaderboardUrl: '/leaderboard/2026-27/',
    ...overrides,
  });
  document.body.appendChild(root);
}

describe('HomePage', () => {
  beforeEach(() => {
    document.querySelectorAll('#home-root').forEach((element) => element.remove());
    axios.get.mockResolvedValue({ data: {} });
    useLeaderboard.mockReturnValue({ data: leaderboard, isLoading: false });
    useUserSubmissions.mockReturnValue({
      submissionData: { standings: { east: [], west: [] }, sections: [] },
      isLoading: false,
    });
  });

  test('explains the game and leads guests to start an entry', () => {
    addHomeRoot();
    renderWithProviders(<HomePage seasonSlug="2026-27" />);

    expect(screen.getByRole('heading', { name: 'Call the season before it happens.' })).toBeInTheDocument();
    expect(screen.getByText('Rank all 30 teams')).toBeInTheDocument();
    expect(screen.getByText('Call awards and props')).toBeInTheDocument();
    expect(screen.getByText('Earn points all season')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Start your entry/i })[0]).toHaveAttribute('href', '/submit/2026-27/');
  });

  test('puts a signed-in player’s rank, score, and next action first', () => {
    addHomeRoot({
      isAuthenticated: 'true',
      userId: '101',
      username: 'jordan-qa',
      displayName: 'Jordan',
      hasSubmission: 'true',
    });
    renderWithProviders(<HomePage seasonSlug="2026-27" />);

    expect(screen.getByRole('heading', { name: 'Your season. Every call accounted for.' })).toBeInTheDocument();
    expect(screen.getAllByText('#3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('168').length).toBeGreaterThan(0);
    expect(screen.getByText('Entry saved')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Review or edit picks/i })[0]).toHaveAttribute('href', '/submit/2026-27/');
  });
});
