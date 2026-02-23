import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../__mocks__/msw/server';
import { renderWithProviders } from '../../test-utils';
import SubmissionsPage from '../SubmissionsPage';

// Mock the complex components to simplify testing
jest.mock('../../components/SelectComponent', () => ({ value, onChange, options, placeholder }) => (
    <select
        data-testid="select-component"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
    >
        <option value="">{placeholder}</option>
        {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
));

jest.mock('../../components/EditablePredictionBoard', () => ({ predictions }) => (
    <div data-testid="prediction-board">
        {predictions?.map((pred, idx) => (
            <div key={idx} data-testid={`prediction-${idx}`}>
                {pred.team}
            </div>
        ))}
    </div>
));

jest.mock('../../components/StripePaymentModal', () => ({ isOpen, onClose }) =>
    isOpen ? <div data-testid="payment-modal">Payment Modal</div> : null
);

describe('SubmissionsPage', () => {
    const mockQuestions = [
        {
            id: 1,
            text: 'Who will win MVP?',
            question_type: 'superlative',
            category: 'superlative',
            point_value: 10,
            options: [
                { id: 1, option_text: 'Player A' },
                { id: 2, option_text: 'Player B' },
            ],
        },
        {
            id: 2,
            text: 'Will Team X make playoffs?',
            question_type: 'prop',
            category: 'prop',
            point_value: 5,
            options: [
                { id: 3, option_text: 'Yes' },
                { id: 4, option_text: 'No' },
            ],
        },
    ];

    const mockUserAnswers = {
        answers: [
            {
                question_id: 1,
                selected_option_id: 1,
            },
        ],
    };

    const mockSubmissionStatus = {
        is_open: true,
        deadline: '2025-12-31T23:59:59Z',
        season_slug: '2024-25',
    };

    const mockEntryFeeStatus = {
        is_paid: true,
        amount: 10,
    };

    const mockUserContext = {
        username: 'testuser',
        is_admin: false,
        is_authenticated: true,
    };

    beforeEach(() => {
        // Set up default mocks for all the hooks
        server.use(
            rest.get('/api/v2/submissions/questions/:season', (req, res, ctx) => {
                return res(ctx.json({ questions: mockQuestions }));
            }),
            rest.get('/api/v2/submissions/answers/:season', (req, res, ctx) => {
                return res(ctx.json(mockUserAnswers));
            }),
            rest.get('/api/v2/submissions/submission-status/:season', (req, res, ctx) => {
                return res(ctx.json(mockSubmissionStatus));
            }),
            rest.get('/api/v2/submissions/entry-fee/:season', (req, res, ctx) => {
                return res(ctx.json(mockEntryFeeStatus));
            }),
            rest.get('/api/v2/user/context', (req, res, ctx) => {
                return res(ctx.json(mockUserContext));
            }),
            rest.get('/api/v2/seasons/', (req, res, ctx) => {
                return res(ctx.json([{ slug: '2024-25', year: '2024-25' }]));
            }),
            rest.get('/api/v2/payment/status', (req, res, ctx) => {
                return res(ctx.json({ status: 'none' }));
            }),
            rest.get('/api/v2/players/', (req, res, ctx) => {
                return res(ctx.json({ players: [{ id: 1, name: 'Player A' }, { id: 2, name: 'Player B' }] }));
            }),
            rest.get('/api/v2/teams/', (req, res, ctx) => {
                return res(ctx.json({ teams: [{ id: 1, name: 'Team A' }, { id: 2, name: 'Team B' }] }));
            })
        );
    });

    test('renders questions after loading', async () => {
        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        await waitFor(() => {
            expect(screen.getByText(/Who will win MVP/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/Will Team X make playoffs/i)).toBeInTheDocument();
    });

    test('displays user answers when available', async () => {
        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        await waitFor(() => {
            expect(screen.getByText(/Who will win MVP/i)).toBeInTheDocument();
        });

        // The first question should have the user's answer pre-selected
        // This would be reflected in the SelectComponent's value
        const selects = screen.getAllByTestId('select-component');
        expect(selects.length).toBeGreaterThan(0);
    });

    test('handles submission deadline closed', async () => {
        server.use(
            rest.get('/api/v2/submissions/submission-status/:season', (req, res, ctx) => {
                return res(ctx.json({
                    is_open: false,
                    deadline: '2024-01-01T00:00:00Z',
                    season_slug: '2024-25',
                }));
            })
        );

        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        await waitFor(() => {
            expect(screen.getByText(/Who will win MVP/i)).toBeInTheDocument();
        });

        // Questions should still be visible even when submissions are closed
        expect(screen.getByText(/Will Team X make playoffs/i)).toBeInTheDocument();
    });

    test('handles API error gracefully', async () => {
        server.use(
            rest.get('/api/v2/submissions/questions/:season', (req, res, ctx) => {
                return res(ctx.status(500));
            })
        );

        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        await waitFor(() => {
            // Should display an error message
            expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
        });
    });

    test('renders submit button when submissions are open', async () => {
        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        await waitFor(() => {
            expect(screen.getByText(/Who will win MVP/i)).toBeInTheDocument();
        });

        // Check that submit and save buttons exist
        const buttons = screen.getAllByRole('button');
        expect(buttons.some(btn => btn.textContent.includes('Submit'))).toBe(true);
        expect(buttons.some(btn => btn.textContent.includes('Save Progress'))).toBe(true);
    });

    test('groups questions by category', async () => {
        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        await waitFor(() => {
            expect(screen.getByText(/Who will win MVP/i)).toBeInTheDocument();
        });

        // Check for category headers
        expect(screen.getByText(/Awards.*Superlatives/i)).toBeInTheDocument();
        expect(screen.getByText(/Prop Bets/i)).toBeInTheDocument();
    });
});
