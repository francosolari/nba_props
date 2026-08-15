import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../__mocks__/msw/server';
import { renderWithProviders } from '../../test-utils';
import LeaderboardPage from '../LeaderboardPage';

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
                                badges: [{ type: 'category_best', category: 'Regular Season Standings' }],
                                categories: {
                                    'Regular Season Standings': {
                                        points: 50,
                                        max_points: 60,
                                        predictions: [
                                            { team: 'Celtics', conference: 'East', predicted_position: 1, actual_position: 1, points: 3 },
                                            { team: 'Knicks', conference: 'East', predicted_position: 2, actual_position: 3, points: 1 },
                                            { team: 'Bucks', conference: 'East', predicted_position: 1, actual_position: 4, points: 0 },
                                            { team: 'Heat', conference: 'East', predicted_position: 5, actual_position: null, points: 0 },
                                        ],
                                    },
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

    test('renders leaderboard data and the signed-in participant rank only', async () => {
        renderWithProviders(<LeaderboardPage seasonSlug="2024-25" loggedInUsername="player2" />);

        await waitFor(() => {
            expect(screen.getByText('Props Predictions Leaderboard')).toBeInTheDocument();
        });

        expect(screen.getByText('Your rank')).toBeInTheDocument();
        expect(screen.getByText('2nd')).toBeInTheDocument();
        expect(screen.getByText('/ 2')).toBeInTheDocument();
        expect(screen.queryByText('Players')).not.toBeInTheDocument();
        expect(screen.queryByText('Predictions')).not.toBeInTheDocument();
        expect(screen.queryByText('Accuracy')).not.toBeInTheDocument();
        expect(screen.queryByText('Top Score')).not.toBeInTheDocument();

        // Check rankings
        expect(screen.getByText('Player One')).toBeInTheDocument();
        expect(screen.getByText('Top Regular')).toHaveClass('court-category-badge');
        const scores = screen.getAllByText('150');
        expect(scores.length).toBeGreaterThan(0);
        expect(scores[0]).toBeInTheDocument();
        expect(screen.getByText('Player Two')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
    });

    test('does not render a rank summary for logged-out visitors', async () => {
        renderWithProviders(<LeaderboardPage seasonSlug="2024-25" loggedInUsername="" />);

        await waitFor(() => {
            expect(screen.getByText('Player One')).toBeInTheDocument();
        });

        expect(screen.queryByText('Your rank')).not.toBeInTheDocument();
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
            // Look for any expanded content - handle multiple matches if hidden elements exist
            const breakdowns = screen.getAllByText(/Detailed Breakdown/i);
            expect(breakdowns.length).toBeGreaterThan(0);
            // Optionally check if at least one is visible if possible, but presence is good enough here
            expect(breakdowns[0]).toBeInTheDocument();
        });

        expect(screen.getAllByText('Exact').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Off by 1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Missed').length).toBeGreaterThan(0);
        expect(screen.queryByText('Not yet graded')).not.toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: /Exact/i })[0]);

        expect(screen.getByText('Celtics')).toBeInTheDocument();
        expect(screen.getByLabelText('Picked and finished 1st')).toHaveTextContent('1st');
        expect(document.querySelector('.court-grade-pick__logo')).toHaveAttribute('src', expect.stringContaining('/static/img/teams/'));
        expect(screen.queryByText(/Picked 1/)).not.toBeInTheDocument();
    });
});
