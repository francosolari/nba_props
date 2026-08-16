import React from 'react';
import { screen, within } from '@testing-library/react';
import axios from 'axios';
import { renderWithProviders } from '../../test-utils';
import HomePage from '../HomePage';
import { useLeaderboard, usePaymentStatus, useUserSubmissions } from '../../hooks';

jest.mock('axios');
jest.mock('../../hooks', () => ({
  useLeaderboard: jest.fn(),
  usePaymentStatus: jest.fn(),
  useUserSubmissions: jest.fn(),
}));

const player = (rank, id, name, points) => ({
  rank,
  user: { id, username: name.toLowerCase(), display_name: name, total_points: points, categories: {} },
});

const RIVALS = [
  'Leader', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth',
  'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth',
];

// Jordan sits 13th, past the longest preview window, so the row has to be
// pinned back in rather than dropped off the page entirely.
const leaderboard = [
  ...RIVALS.map((name, index) => player(index + 1, index + 2, name, 184 - index * 4)),
  {
    rank: 13,
    user: {
      id: 101,
      username: 'jordan-qa',
      display_name: 'Jordan',
      total_points: 138,
      categories: {
        'Regular Season Standings': { points: 72, max_points: 120 },
        'Player Awards': { points: 48, max_points: 80 },
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
    submissionStart: '2026-08-15T04:01:00-04:00',
    submissionEnd: '2026-10-20T19:00:00-04:00',
    submitUrl: '/submit/2026-27/',
    signupUrl: '/accounts/signup/',
    loginUrl: '/accounts/login/',
    leaderboardUrl: '/leaderboard/2026-27/',
    ...overrides,
  });
  document.body.appendChild(root);
}

/** Picks locked and the window closed: the phase home spends most of the year in. */
function addLockedRoot(overrides = {}) {
  addHomeRoot({
    isAuthenticated: 'true',
    userId: '101',
    username: 'jordan-qa',
    displayName: 'Jordan',
    hasSubmission: 'true',
    submissionOpen: 'false',
    ...overrides,
  });
}

describe('HomePage', () => {
  beforeEach(() => {
    document.querySelectorAll('#home-root').forEach((element) => element.remove());
    axios.get.mockResolvedValue({ data: {} });
    useLeaderboard.mockReturnValue({ data: leaderboard, isLoading: false });
    usePaymentStatus.mockReturnValue({ data: { is_paid: false, paid_at: null } });
    useUserSubmissions.mockReturnValue({
      submissionData: { standings: { east: [], west: [] }, sections: [] },
      isLoading: false,
    });
  });

  test('explains the game and leads guests to start an entry', () => {
    addHomeRoot();
    renderWithProviders(<HomePage seasonSlug="2026-27" />);

    expect(screen.getByRole('heading', { name: /Call the 2026–27 season before it happens\./ })).toBeInTheDocument();
    expect(screen.getByText('Conference standings')).toBeInTheDocument();
    expect(screen.getByText('Props and over/unders')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Start your entry/i })[0]).toHaveAttribute('href', '/submit/2026-27/');
  });

  test('names the outstanding half of an unfinished entry', () => {
    addHomeRoot({
      isAuthenticated: 'true',
      userId: '101',
      username: 'jordan-qa',
      displayName: 'Jordan',
    });
    renderWithProviders(<HomePage seasonSlug="2026-27" />);

    expect(screen.getByRole('heading', { name: 'Your entry isn’t in yet.' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Start your entry/i })[0]).toHaveAttribute('href', '/submit/2026-27/');
  });

  test('leads a locked season with rank and score, not a category breakdown', () => {
    addLockedRoot();
    renderWithProviders(<HomePage seasonSlug="2026-27" />);

    expect(screen.getByRole('heading', { name: /Your 2026–27 season, scored\./ })).toBeInTheDocument();
    expect(screen.getAllByText('#13').length).toBeGreaterThan(0);
    expect(screen.getAllByText('138').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Review your picks/i })[0]).toHaveAttribute('href', '/submit/2026-27/');

    // Category totals live on the leaderboard now, so home no longer repeats them.
    expect(screen.queryByRole('heading', { name: 'Your scorebook' })).not.toBeInTheDocument();
    expect(screen.queryByText('Player Awards')).not.toBeInTheDocument();
  });

  test('pins a mid-pack player’s own row under the leaderboard preview', () => {
    addLockedRoot();
    renderWithProviders(<HomePage seasonSlug="2026-27" />);

    const leaders = screen.getByRole('region', { name: 'Leaderboard' });
    // The window stops at 6th, so 13th can only be here because it was pinned.
    expect(within(leaders).getByText('Sixth')).toBeInTheDocument();
    expect(within(leaders).queryByText('Seventh')).not.toBeInTheDocument();
    expect(within(leaders).getByText('Jordan (You)')).toBeInTheDocument();
  });
});
