import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useLeaderboard } from '../../hooks';
import LeaderboardDetailPage from '../LeaderboardDetailPage';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  useLeaderboard: jest.fn(),
}));

jest.mock('../../features/leaderboard/components/LeaderboardHeader', () => ({
  LeaderboardHeader: () => <div data-testid="leaderboard-header" />,
}));

jest.mock('../../features/leaderboard/components/LeaderboardControls', () => ({
  LeaderboardControls: ({ loggedInUserId, isPinMePinned }) => (
    <div
      data-testid="leaderboard-controls"
      data-logged-in-user-id={loggedInUserId || ''}
      data-pin-me-pinned={String(isPinMePinned)}
    />
  ),
}));

jest.mock('../../features/leaderboard/components/LeaderboardShowcase', () => ({
  LeaderboardShowcase: () => <div data-testid="leaderboard-showcase" />,
}));

jest.mock('../../features/leaderboard/components/LeaderboardTableDesktop', () => ({
  LeaderboardTableDesktop: () => <div data-testid="leaderboard-table-desktop" />,
}));

jest.mock('../../features/leaderboard/components/LeaderboardTableMobile', () => ({
  LeaderboardTableMobile: () => <div data-testid="leaderboard-table-mobile" />,
}));

jest.mock('../../features/leaderboard/components/LeaderboardPodium', () => ({
  LeaderboardPodium: () => <div data-testid="leaderboard-podium" />,
}));

jest.mock('../../features/leaderboard/components/SimulationModal', () => ({
  SimulationModal: () => <div data-testid="simulation-modal" />,
}));

jest.mock('../../features/leaderboard/components/PlayerSelectionModal', () => ({
  PlayerSelectionModal: () => <div data-testid="player-selection-modal" />,
}));

jest.mock('../../components/TeamLogo', () => ({
  __esModule: true,
  default: () => null,
  resolveTeamLogoSlug: (team) => String(team || '').toLowerCase(),
}));

const mockUseQuery = useQuery;
const mockUseLeaderboard = useLeaderboard;

const mockLeaderboardData = [
  {
    rank: 1,
    user: {
      id: 11,
      username: 'franco',
      display_name: 'Franco',
      total_points: 100,
      categories: {
        'Regular Season Standings': {
          points: 10,
          predictions: [
            {
              team: 'Lakers',
              conference: 'West',
              actual_position: 1,
              predicted_position: 1,
              points: 3,
            },
          ],
        },
        'Player Awards': { points: 40, predictions: [] },
        'Props & Yes/No': { points: 50, predictions: [] },
      },
    },
  },
  {
    rank: 2,
    user: {
      id: 22,
      username: 'player2',
      display_name: 'Player 2',
      total_points: 90,
      categories: {
        'Regular Season Standings': { points: 15, predictions: [] },
        'Player Awards': { points: 35, predictions: [] },
        'Props & Yes/No': { points: 40, predictions: [] },
      },
    },
  },
];

describe('LeaderboardDetailPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="leaderboard-detail-root" data-initial-section="standings" data-logged-in-username="franco"></div>';
    window.history.replaceState({}, '', '/leaderboard-detail');

    mockUseQuery.mockReturnValue({ data: [] });
    mockUseLeaderboard.mockReturnValue({
      data: mockLeaderboardData,
      isLoading: false,
      error: null,
    });
  });

  test('pins the logged-in user by default', async () => {
    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-controls')).toHaveAttribute('data-pin-me-pinned', 'true');
    });
    expect(screen.getByTestId('leaderboard-controls')).toHaveAttribute('data-logged-in-user-id', '11');
  });

  test('renders loading state correctly', () => {
    mockUseLeaderboard.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    expect(screen.getByText(/Loading Rankings/i)).toBeInTheDocument();
  });

  test('renders error state with error message', () => {
    const errorMessage = 'Failed to load leaderboard data';
    mockUseLeaderboard.mockReturnValue({
      data: null,
      isLoading: false,
      error: errorMessage,
    });

    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('renders leaderboard data successfully', async () => {
    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-header')).toBeInTheDocument();
    });

    expect(screen.getByTestId('leaderboard-controls')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-table-desktop')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-table-mobile')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-podium')).toBeInTheDocument();
  });

  test('renders all main components when data is loaded', async () => {
    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-header')).toBeInTheDocument();
    });

    expect(screen.getByTestId('leaderboard-controls')).toBeInTheDocument();
    expect(screen.getByTestId('simulation-modal')).toBeInTheDocument();
    expect(screen.getByTestId('player-selection-modal')).toBeInTheDocument();
  });

  test('renders compare mode by default', async () => {
    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-table-desktop')).toBeInTheDocument();
    });

    expect(screen.getByTestId('leaderboard-table-mobile')).toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-showcase')).not.toBeInTheDocument();
  });

  test('handles empty leaderboard data', () => {
    mockUseLeaderboard.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    expect(screen.getByTestId('leaderboard-header')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-controls')).toBeInTheDocument();
  });
});
