import React from 'react';
import { render, screen } from '@testing-library/react';
import ISTCenterPage from '../ISTCenterPage';
import useISTData from '../../../hooks/useISTData';

jest.mock('../../../hooks/useISTData');

const createISTData = (overrides = {}) => ({
  standings: { East: {}, West: {} },
  groups: [],
  wildcardRace: { East: [], West: [] },
  userLeaderboard: [],
  stats: { totalUsers: 0, totalPredictions: 0, avgAccuracy: 0 },
  season: null,
  error: null,
  isLoading: false,
  isRefetching: false,
  ...overrides,
});

describe('ISTCenterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton when data is loading', () => {
    useISTData.mockReturnValue(createISTData({ isLoading: true }));

    const { container } = render(<ISTCenterPage />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state when hook returns an error', () => {
    useISTData.mockReturnValue(createISTData({ error: new Error('Failed to fetch IST data') }));

    render(<ISTCenterPage />);

    expect(screen.getByText(/Failed to fetch IST data/)).toBeInTheDocument();
  });

  it('invokes useISTData with the provided season slug', () => {
    useISTData.mockReturnValue(createISTData());

    render(<ISTCenterPage seasonSlug="2024-2025" />);

    expect(useISTData).toHaveBeenCalledWith('2024-2025');
  });

  it('renders hero, conference sections, wildcard, and leaderboard when data is available', () => {
    const mockGroups = [
      {
        conference: 'East',
        name: 'East Group A',
        teams: [
          {
            team_id: 1,
            team_name: 'Boston Celtics',
            group_rank: 1,
            wins: 3,
            losses: 0,
            point_differential: 28,
          },
          {
            team_id: 2,
            team_name: 'Brooklyn Nets',
            group_rank: 2,
            wins: 2,
            losses: 1,
            point_differential: 5,
          },
        ],
      },
      {
        conference: 'West',
        name: 'West Group A',
        teams: [
          {
            team_id: 3,
            team_name: 'Los Angeles Lakers',
            group_rank: 1,
            wins: 3,
            losses: 0,
            point_differential: 30,
          },
        ],
      },
    ];

    const mockWildcards = {
      East: [
        {
          team_id: 10,
          team_name: 'Chicago Bulls',
          ist_group: 'East Group A',
          wins: 2,
          losses: 1,
          point_differential: 8,
          clinch_wildcard: true,
        },
      ],
      West: [
        {
          team_id: 11,
          team_name: 'Phoenix Suns',
          ist_group: 'West Group A',
          wins: 2,
          losses: 1,
          point_differential: 6,
        },
      ],
    };

    const mockLeaderboard = [
      {
        rank: 1,
        total_points: 12.5,
        user: { id: '1', display_name: 'Jane Doe' },
        predictions: [],
      },
    ];

    useISTData.mockReturnValue(createISTData({
      stats: { totalUsers: 240, totalPredictions: 1180, avgAccuracy: 0.75 },
      season: { year: '2024-2025' },
      groups: mockGroups,
      wildcardRace: mockWildcards,
      userLeaderboard: mockLeaderboard,
    }));

    render(<ISTCenterPage />);

    expect(screen.getByText('NBA CUP 2024')).toBeInTheDocument();
    expect(screen.getByText('In-Season Tournament')).toBeInTheDocument();
    expect(screen.getByText('Eastern Conference')).toBeInTheDocument();
    expect(screen.getByText('Western Conference')).toBeInTheDocument();
    expect(screen.getByText('Boston Celtics')).toBeInTheDocument();
    expect(screen.getByText('Los Angeles Lakers')).toBeInTheDocument();
    expect(screen.getByText(/East WILDCARD/i)).toBeInTheDocument();
    expect(screen.getByText(/West WILDCARD/i)).toBeInTheDocument();
    expect(screen.getAllByText('Prediction Leaders').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('1180')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
