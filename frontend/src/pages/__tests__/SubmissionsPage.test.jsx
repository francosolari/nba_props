import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../__mocks__/msw/server';
import { renderWithProviders } from '../../test-utils';
import SubmissionsPage from '../SubmissionsPage';

// Mock the complex components to simplify testing
jest.mock('../../components/SelectComponent', () => ({ value, onChange, options, placeholder }) => (
    <select
        data-testid="select-component"
        value={value || ''}
        onChange={(e) => onChange(options?.find((option) => String(option.value) === e.target.value) || null)}
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

jest.mock('../../components/EditablePredictionBoard', () => {
    const ReactModule = require('react');
    return ReactModule.forwardRef(({ predictions }, ref) => {
        ReactModule.useImperativeHandle(ref, () => ({
            saveStandings: () => Promise.resolve({ success: true, slug: '2024-25' }),
        }));
        return (
            <div data-testid="prediction-board">
                {predictions?.map((pred, idx) => (
                    <div key={idx} data-testid={`prediction-${idx}`}>
                        {pred.team}
                    </div>
                ))}
            </div>
        );
    });
});

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
        localStorage.clear();
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
            rest.get('/api/v2/payments/payment-status/:season', (req, res, ctx) => {
                return res(ctx.json({ is_paid: true, status: 'paid' }));
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
        expect(buttons.some(btn => btn.textContent.includes('Save for later'))).toBe(true);
    });

    test('groups questions by category', async () => {
        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        await waitFor(() => {
            expect(screen.getByText(/Who will win MVP/i)).toBeInTheDocument();
        });

        // Check for category headers
        expect(screen.getByRole('heading', { name: /Awards.*Superlatives/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Prop Bets/i })).toBeInTheDocument();
    });

    test('shows overall and current-section completion using configured questions only', async () => {
        server.use(
            rest.get('/api/v2/submissions/answers/:season', (req, res, ctx) => {
                return res(ctx.json({
                    answers: [
                        { question_id: 1, answer: '1' },
                        { question_id: 999, answer: 'stale cached answer' },
                    ],
                }));
            })
        );

        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        expect(await screen.findByTestId('submission-progress')).toBeInTheDocument();
        expect(screen.getByTestId('overall-progress')).toHaveTextContent('1 of 2 answered');
        expect(screen.getByTestId('section-progress')).toHaveTextContent('Awards & Superlatives');
        expect(screen.getByTestId('section-progress')).toHaveTextContent('1 of 1');
        const sectionJumps = screen.getByRole('navigation', { name: /jump to prediction section/i });
        expect(within(sectionJumps).getByRole('link', { name: /Awards Done/i })).toHaveAttribute(
            'href',
            '#question-group-superlative'
        );
        expect(within(sectionJumps).getByRole('link', { name: /Props 1 left/i })).toHaveAttribute(
            'href',
            '#question-group-prop'
        );
    });

    test('blocks an incomplete final submission and points to save for later', async () => {
        let submissionRequests = 0;
        server.use(
            rest.get('/api/v2/submissions/answers/:season', (req, res, ctx) => {
                return res(ctx.json({ answers: [{ question_id: 1, answer: '1' }] }));
            }),
            rest.post('/api/v2/submissions/answers/:season', (req, res, ctx) => {
                submissionRequests += 1;
                return res(ctx.json({ status: 'success', saved_count: 1 }));
            })
        );

        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        const submitButton = await screen.findByRole('button', { name: /submit predictions/i });
        fireEvent.click(submitButton);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            '1 unanswered question remains. Complete it before submitting, or save for later.'
        );
        expect(submissionRequests).toBe(0);
        expect(screen.getByRole('button', { name: /save for later/i })).toBeEnabled();
    });

    test('allows an incomplete entry to be saved for later', async () => {
        let submittedAnswers = null;
        server.use(
            rest.get('/api/v2/submissions/answers/:season', (req, res, ctx) => {
                return res(ctx.json({ answers: [{ question_id: 1, answer: '1' }] }));
            }),
            rest.post('/api/v2/submissions/answers/:season', async (req, res, ctx) => {
                submittedAnswers = await req.json();
                return res(ctx.json({ status: 'success', saved_count: 1 }));
            })
        );

        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        fireEvent.click(await screen.findByRole('button', { name: /save for later/i }));

        await waitFor(() => {
            expect(submittedAnswers).toEqual({
                answers: [{ question_id: 1, answer: '1' }],
            });
        });
        expect(await screen.findByText(/progress saved/i)).toBeInTheDocument();
    });

    test('lets a guest start an entry and saves the draft on their device', async () => {
        let submissionRequests = 0;
        server.use(
            rest.get('/api/v2/user/context', (req, res, ctx) => res(ctx.json({
                username: null,
                is_admin: false,
                is_authenticated: false,
            }))),
            rest.post('/api/v2/submissions/answers/:season', (req, res, ctx) => {
                submissionRequests += 1;
                return res(ctx.json({ status: 'success' }));
            })
        );

        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);

        expect(await screen.findByText(/no account needed to start/i)).toBeInTheDocument();
        fireEvent.change(screen.getAllByTestId('select-component')[0], { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /save for later/i }));

        expect(await screen.findByText(/keep your entry with an account/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute(
            'href',
            '/accounts/signup/?next=%2F'
        );
        expect(JSON.parse(localStorage.getItem('submissions_2024-25'))).toMatchObject({ 1: 1 });
        expect(submissionRequests).toBe(0);
    });

    test('requires a guest to create an account before final submission', async () => {
        let submissionRequests = 0;
        server.use(
            rest.get('/api/v2/user/context', (req, res, ctx) => res(ctx.json({
                username: null,
                is_admin: false,
                is_authenticated: false,
            }))),
            rest.post('/api/v2/submissions/answers/:season', (req, res, ctx) => {
                submissionRequests += 1;
                return res(ctx.json({ status: 'success' }));
            })
        );

        renderWithProviders(<SubmissionsPage seasonSlug="2024-25" />);
        fireEvent.click(await screen.findByRole('button', { name: /submit predictions/i }));

        expect(await screen.findByText(/create an account or log in to submit them/i)).toBeInTheDocument();
        expect(submissionRequests).toBe(0);
    });
});
