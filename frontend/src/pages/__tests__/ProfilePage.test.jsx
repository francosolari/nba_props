import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useLeaderboard, useProfileData, useProfileAnswers, useProfileStats } from '../../hooks';
import ProfilePage from '../ProfilePage';

jest.mock('../../hooks');

const mockUseLeaderboard = useLeaderboard;
const mockUseProfileData = useProfileData;
const mockUseProfileAnswers = useProfileAnswers;
const mockUseProfileStats = useProfileStats;

jest.mock('../../components/profile/LogoutModal', () => ({
  __esModule: true,
  default: () => <div data-testid="logout-modal" />,
}));

jest.mock('../../components/profile/ProfileHero', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-hero" />,
}));

jest.mock('../../components/profile/ProfileStats', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-stats" />,
}));

jest.mock('../../components/profile/ProfileTabs', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-tabs" />,
}));

jest.mock('../../components/profile/DashboardTab', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard-tab" />,
}));

jest.mock('../../components/profile/StandingsTab', () => ({
  __esModule: true,
  default: () => <div data-testid="standings-tab" />,
}));

jest.mock('../../components/profile/QuestionsTab', () => ({
  __esModule: true,
  default: () => <div data-testid="questions-tab" />,
}));

jest.mock('../../components/profile/SubmissionsTab', () => ({
  __esModule: true,
  default: () => <div data-testid="submissions-tab" />,
}));

jest.mock('../../components/profile/SettingsTab', () => ({
  __esModule: true,
  default: () => <div data-testid="settings-tab" />,
}));

const mockLeaderboardData = [
  {
    rank: 1,
    user: {
      id: 123,
      username: 'testuser',
      display_name: 'Test User',
      total_points: 100,
      accuracy: 75.5,
      categories: {
        'Regular Season Standings': {
          points: 30,
          max_points: 50,
          predictions: [
            { team: 'Lakers', predicted_position: 1, actual_position: 1, points: 3 },
          ],
        },
        'Player Awards': {
          points: 40,
          max_points: 60,
          predictions: [],
        },
        'Props & Yes/No': {
          points: 30,
          max_points: 50,
          predictions: [],
        },
      },
    },
  },
];

describe('ProfilePage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="profile-root" data-user-id="123" data-username="testuser" data-display-name="Test User" data-season-slug="2024-25"></div>';

    mockUseProfileData.mockReturnValue({
      userId: '123',
      username: 'testuser',
      displayName: 'Test User',
      selectedSeason: '2024-25',
      setSelectedSeason: jest.fn(),
      seasons: [
        { slug: '2024-25', year: '2024-25' },
        { slug: '2023-24', year: '2023-24' },
      ],
      selectedSeasonObj: { slug: '2024-25', year: '2024-25' },
      canEdit: true,
    });

    mockUseLeaderboard.mockReturnValue({
      data: mockLeaderboardData,
      isLoading: false,
      error: null,
    });

    mockUseProfileAnswers.mockReturnValue({
      answers: [],
      categories: {
        regular_season_standings: { points: 30, max_points: 50 },
        player_awards: { points: 40, max_points: 60 },
        props_and_yes_no: { points: 30, max_points: 50 },
      },
    });

    mockUseProfileStats.mockReturnValue({
      interestingStats: {
        total_correct: 10,
        total_questions: 20,
        accuracy: 50,
      },
      statsLoading: false,
    });
  });

  test('renders without crashing', () => {
    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('profile-hero')).toBeInTheDocument();
    expect(screen.getByTestId('profile-stats')).toBeInTheDocument();
    expect(screen.getByTestId('profile-tabs')).toBeInTheDocument();
  });

  test('handles unauthenticated state (no userId)', () => {
    mockUseProfileData.mockReturnValue({
      userId: '',
      username: '',
      displayName: '',
      selectedSeason: '2024-25',
      setSelectedSeason: jest.fn(),
      seasons: [],
      selectedSeasonObj: null,
      canEdit: false,
    });

    mockUseLeaderboard.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('profile-hero')).toBeInTheDocument();
  });

  test('renders with user data from leaderboard', async () => {
    render(<ProfilePage seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-hero')).toBeInTheDocument();
    });

    expect(screen.getByTestId('profile-stats')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
  });

  test('displays dashboard tab by default', () => {
    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('standings-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('questions-tab')).not.toBeInTheDocument();
  });

  test('handles loading state from leaderboard', () => {
    mockUseLeaderboard.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('profile-hero')).toBeInTheDocument();
  });

  test('handles error state from leaderboard', () => {
    mockUseLeaderboard.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Failed to load data',
    });

    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('profile-hero')).toBeInTheDocument();
  });

  test('creates fallback user when not found in leaderboard', () => {
    mockUseLeaderboard.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('profile-hero')).toBeInTheDocument();
    expect(screen.getByTestId('profile-stats')).toBeInTheDocument();
  });

  test('merges profile answers with leaderboard categories', () => {
    mockUseProfileAnswers.mockReturnValue({
      answers: [
        { question_id: 1, answer: 'Lakers', correct: true, points: 3 },
      ],
      categories: {
        regular_season_standings: { points: 35, max_points: 50 },
        player_awards: { points: 45, max_points: 60 },
        props_and_yes_no: { points: 25, max_points: 50 },
      },
    });

    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('profile-stats')).toBeInTheDocument();
  });

  test('renders logout modal component', () => {
    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('logout-modal')).toBeInTheDocument();
  });

  test('uses season from props when provided', () => {
    render(<ProfilePage seasonSlug="2023-24" />);

    expect(screen.getByTestId('profile-hero')).toBeInTheDocument();
  });

  test('falls back to current season when no prop provided', () => {
    render(<ProfilePage />);

    expect(screen.getByTestId('profile-hero')).toBeInTheDocument();
  });

  test('handles stats loading state', () => {
    mockUseProfileStats.mockReturnValue({
      interestingStats: null,
      statsLoading: true,
    });

    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
  });

  test('displays user by ID when found in leaderboard', () => {
    const leaderboardDataWithUser = [
      {
        rank: 2,
        user: {
          id: 123,
          username: 'testuser',
          display_name: 'Test User',
          total_points: 95,
          categories: {
            'Regular Season Standings': { points: 28, max_points: 50, predictions: [] },
            'Player Awards': { points: 38, max_points: 60, predictions: [] },
            'Props & Yes/No': { points: 29, max_points: 50, predictions: [] },
          },
        },
      },
    ];

    mockUseLeaderboard.mockReturnValue({
      data: leaderboardDataWithUser,
      isLoading: false,
      error: null,
    });

    render(<ProfilePage seasonSlug="2024-25" />);

    expect(screen.getByTestId('profile-stats')).toBeInTheDocument();
  });

  test('renders all profile components in correct order', () => {
    render(<ProfilePage seasonSlug="2024-25" />);

    const hero = screen.getByTestId('profile-hero');
    const stats = screen.getByTestId('profile-stats');
    const tabs = screen.getByTestId('profile-tabs');

    expect(hero).toBeInTheDocument();
    expect(stats).toBeInTheDocument();
    expect(tabs).toBeInTheDocument();
  });
});
