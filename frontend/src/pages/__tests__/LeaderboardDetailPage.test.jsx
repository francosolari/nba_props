import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
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

let desktopProps = null;
jest.mock('../../features/leaderboard/components/LeaderboardTableDesktop', () => ({
  LeaderboardTableDesktop: (props) => {
    desktopProps = props;
    return <div data-testid="leaderboard-table-desktop" />;
  },
}));

jest.mock('../../features/leaderboard/components/LeaderboardTableMobile', () => ({
  LeaderboardTableMobile: () => <div data-testid="leaderboard-table-mobile" />,
}));

jest.mock('../../features/leaderboard/components/LeaderboardPodium', () => ({
  LeaderboardPodium: ({ loggedInUserId, isPinMePinned }) => (
    <div
      data-testid="leaderboard-podium"
      data-logged-in-user-id={loggedInUserId || ''}
      data-pin-me-pinned={String(isPinMePinned)}
    />
  ),
}));

jest.mock('../../features/leaderboard/components/SimulationModal', () => ({
  SimulationModal: () => <div data-testid="simulation-modal" />,
}));

let rosterProps = null;
jest.mock('../../features/leaderboard/components/PlayerSelectionModal', () => ({
  PlayerSelectionModal: (props) => {
    rosterProps = props;
    return <div data-testid="player-selection-modal" />;
  },
}));

jest.mock('../../components/TeamLogo', () => ({
  __esModule: true,
  default: () => null,
  resolveTeamLogoSlug: (team) => String(team || '').toLowerCase(),
}));

const mockUseQuery = useQuery;
const mockUseLeaderboard = useLeaderboard;

describe('LeaderboardDetailPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="leaderboard-detail-root" data-initial-section="standings" data-logged-in-username="franco"></div>';
    window.history.replaceState({}, '', '/leaderboard-detail');

    mockUseQuery.mockReturnValue({ data: [] });
    mockUseLeaderboard.mockReturnValue({
      season: { submissions_open: false, submission_end_date: '2025-10-01T00:00:00Z' },
      data: [
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
            id: 12,
            username: 'rival',
            display_name: 'Rival',
            total_points: 80,
            categories: {
              'Regular Season Standings': {
                points: 5,
                predictions: [
                  {
                    team: 'Lakers',
                    conference: 'West',
                    actual_position: 1,
                    predicted_position: 2,
                    points: 1,
                  },
                ],
              },
              'Player Awards': { points: 35, predictions: [] },
              'Props & Yes/No': { points: 40, predictions: [] },
            },
          },
        },
      ],
      isLoading: false,
      error: null,
    });
  });

  test('pins the logged-in user by default', async () => {
    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-podium')).toHaveAttribute('data-pin-me-pinned', 'true');
    });
    expect(screen.getByTestId('leaderboard-podium')).toHaveAttribute('data-logged-in-user-id', '11');
  });

  describe('removing a participant from the column head', () => {
    const idsOnBoard = () => desktopProps.displayedUsers.map((e) => String(e.user.id));

    test('drops that player out of the comparison', async () => {
      render(<LeaderboardDetailPage seasonSlug="2024-25" />);
      await waitFor(() => expect(idsOnBoard()).toContain('11'));

      await act(async () => desktopProps.removeUser(11));
      expect(idsOnBoard()).not.toContain('11');
      // The rest of the comparison is left alone.
      expect(idsOnBoard()).toContain('12');
    });

    test('while everyone is shown it narrows to everyone-but-them, rather than doing nothing', async () => {
      render(<LeaderboardDetailPage seasonSlug="2024-25" />);
      await waitFor(() => expect(rosterProps).not.toBeNull());

      // Switch the board to showing the whole field.
      await act(async () => rosterProps.setShowAll(true));
      await waitFor(() => expect(rosterProps.showAll).toBe(true));

      await act(async () => desktopProps.removeUser(11));

      await waitFor(() => expect(rosterProps.showAll).toBe(false));
      expect(idsOnBoard()).not.toContain('11');
      expect(idsOnBoard()).toContain('12');
    });
  });

  describe('sealed entries', () => {
    test('the board is withheld while the submission window is open', async () => {
      mockUseLeaderboard.mockReturnValue({
        season: { submissions_open: true, submission_end_date: '2025-10-01T00:00:00Z' },
        data: [],
        isLoading: false,
        error: null,
      });

      render(<LeaderboardDetailPage seasonSlug="2024-25" />);

      expect(await screen.findByText(/advanced board locked/i)).toBeInTheDocument();
      expect(screen.getByText(/sealed while predictions are open/i)).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table-desktop')).not.toBeInTheDocument();
    });

    test('the board opens once the window has closed', async () => {
      render(<LeaderboardDetailPage seasonSlug="2024-25" />);

      expect(await screen.findByTestId('leaderboard-table-desktop')).toBeInTheDocument();
      expect(screen.queryByText(/advanced board locked/i)).not.toBeInTheDocument();
    });
  });

  test('opens on the whole field rather than a preselected few', async () => {
    render(<LeaderboardDetailPage seasonSlug="2024-25" />);

    await waitFor(() => expect(rosterProps).not.toBeNull());
    expect(rosterProps.showAll).toBe(true);
    expect(desktopProps.displayedUsers.map((e) => String(e.user.id)).sort()).toEqual(['11', '12']);
  });
});
