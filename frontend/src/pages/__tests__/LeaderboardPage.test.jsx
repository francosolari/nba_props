import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../__mocks__/msw/server';
import { renderWithProviders } from '../../test-utils';
import LeaderboardPage from '../LeaderboardPage';

// Mock ProgressBar to avoid complexity
jest.mock('../../components/ProgressBar', () => ({ value, max }) => (
    <div data-testid="progress-bar" data-value={value} data-max={max} />
));

describe('LeaderboardPage', () => {
    beforeEach(() => {
        // Override the default array mock with object format that includes season and totals
        server.use(
            rest.get('/api/v2/leaderboards/:season', (req, res, ctx) => {
                const { season } = req.params;
                return res(
                    ctx.json({
                        leaderboard: [
                            {
                                rank: 1,
                                id: 1,
                                username: 'player1',
                                display_name: 'Player One',
                                avatar: null,
                                total_points: 150,
                                badges: [],
                                categories: {
                                    'Regular Season Standings': { points: 50, max_points: 60, predictions: [] },
                                    'Player Awards': { points: 60, max_points: 75, predictions: [] },
                                    'Props & Yes/No': { points: 40, max_points: 50, predictions: [] },
                                },
                            },
                            {
                                rank: 2,
                                id: 2,
                                username: 'player2',
                                display_name: 'Player Two',
                                avatar: null,
                                total_points: 120,
                                badges: [],
                                categories: {
                                    'Regular Season Standings': { points: 40, max_points: 60, predictions: [] },
                                    'Player Awards': { points: 50, max_points: 75, predictions: [] },
                                    'Props & Yes/No': { points: 30, max_points: 50, predictions: [] },
                                },
                            },
                        ],
                        season: {
                            slug: season,
                            year: '2024-25',
                            submissions_open: false,
                            submission_end_date: '2024-10-20T00:00:00Z',
                        },
                        totals: {
                            totalPlayers: 2,
                            totalPredictions: 100,
                            avgAccuracy: 0.65,
                        },
                    })
                );
            })
        );
    });

    test('renders loading state initially', () => {
        renderWithProviders(<LeaderboardPage seasonSlug="2024-25" />);
        // Check for skeleton loader elements
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    test('renders leaderboard data and metrics', async () => {
        renderWithProviders(<LeaderboardPage seasonSlug="2024-25" />);

        await waitFor(() => {
            expect(screen.getByText('NBA Predictions Leaderboard')).toBeInTheDocument();
        });

        // Check metrics
        expect(screen.getByText('Players')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Total players from mock

        // Check rankings
        expect(screen.getByText('Player One')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Player Two')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
    });

    test('handles API error', async () => {
        server.use(
            rest.get('/api/v2/leaderboards/:season', (req, res, ctx) => {
                return res(ctx.status(500));
            }),
            rest.get('/api/v2/leaderboard/:season', (req, res, ctx) => {
                return res(ctx.status(500));
            }),
            rest.get('/api/v2/answers/all-by-season/', (req, res, ctx) => {
                return res(ctx.status(500));
            })
        );

        renderWithProviders(<LeaderboardPage seasonSlug="2024-25" />);

        await waitFor(() => {
            // The error message from axios is usually "Error: Request failed with status code 500"
            // or "AxiosError: Request failed with status code 500"
            expect(screen.getByText(/Request failed/i)).toBeInTheDocument();
        });
    });

    test('expands user details on click', async () => {
        renderWithProviders(<LeaderboardPage seasonSlug="2024-25" />);

        // Wait for data to load
        await waitFor(() => {
            expect(screen.getByText('Player One')).toBeInTheDocument();
        });

        // Click on the row (button)
        const rowButton = screen.getByText('Player One').closest('button');
        fireEvent.click(rowButton);

        // Verify expansion by checking that the chevron changed from down to up
        // The CategoryCard content might not render in the test environment due to complexity
        await waitFor(() => {
            // Look for any expanded content - the easiest is to check if there are more elements now
            const expandedSection = rowButton.parentElement.querySelector('[class*="bg-gradient-to-br from-slate-50"]');
            expect(expandedSection).toBeInTheDocument();
        });
    });
});
