/**
 * MSW (Mock Service Worker) request handlers for API mocking in tests.
 *
 * Define mock API responses here for use in all tests.
 */
import { rest } from 'msw';

const API_BASE = 'http://localhost:8000';

export const handlers = [
  // ============================================================================
  // Leaderboard API
  // ============================================================================

  rest.get('/api/v2/leaderboards/:season', (req, res, ctx) => {
    const { season } = req.params;

    return res(
      ctx.json([
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
      ])
    );
  }),

  rest.get('/api/v2/leaderboard/:season', (req, res, ctx) => {
    const { season } = req.params;

    return res(
      ctx.json({
        leaderboard: [
          {
            rank: 1,
            user: {
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
          },
          {
            rank: 2,
            user: {
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
  }),

  // ============================================================================
  // Submissions API
  // ============================================================================

  rest.get('/api/v2/submissions/:season', (req, res, ctx) => {
    const { season } = req.params;

    return res(
      ctx.json({
        season: {
          slug: season,
          year: '2024-25',
          submissions_open: true,
          submission_end_date: '2024-12-31T23:59:59Z',
        },
        categories: [
          {
            name: 'Regular Season Standings',
            questions: [],
          },
          {
            name: 'Player Awards',
            questions: [],
          },
          {
            name: 'Props & Yes/No',
            questions: [],
          },
        ],
      })
    );
  }),

  rest.post('/api/v2/submissions/:season', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        message: 'Submission saved successfully',
        submission: body,
      })
    );
  }),

  // ============================================================================
  // User Submissions API
  // ============================================================================

  rest.get('/api/v2/user-submissions/:season', (req, res, ctx) => {
    return res(
      ctx.json({
        submissions: [
          {
            id: 1,
            question_id: 1,
            question_text: 'Who will win MVP?',
            answer: 'Nikola Jokic',
            points_earned: 5,
            is_correct: true,
          },
          {
            id: 2,
            question_id: 2,
            question_text: 'Who will win ROY?',
            answer: 'Victor Wembanyama',
            points_earned: 5,
            is_correct: true,
          },
        ],
        total_points: 10,
      })
    );
  }),

  // ============================================================================
  // Admin Questions API
  // ============================================================================

  rest.get('/api/v2/admin/questions/:season', (req, res, ctx) => {
    return res(
      ctx.json({
        questions: [
          {
            id: 1,
            text: 'Who will win MVP?',
            type: 'superlative',
            point_value: 5,
            is_active: true,
            correct_answer: null,
          },
          {
            id: 2,
            text: 'Who will win ROY?',
            type: 'superlative',
            point_value: 5,
            is_active: true,
            correct_answer: null,
          },
        ],
      })
    );
  }),

  rest.post('/api/v2/admin/questions', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        question: {
          id: 999,
          ...body,
          created_at: new Date().toISOString(),
        },
      })
    );
  }),

  // ============================================================================
  // Teams API
  // ============================================================================

  rest.get('/api/v2/teams', (req, res, ctx) => {
    return res(
      ctx.json({
        teams: [
          {
            id: 1,
            name: 'Boston Celtics',
            abbreviation: 'BOS',
            conference: 'East',
            division: 'Atlantic',
          },
          {
            id: 2,
            name: 'Los Angeles Lakers',
            abbreviation: 'LAL',
            conference: 'West',
            division: 'Pacific',
          },
        ],
      })
    );
  }),

  // ============================================================================
  // Players API
  // ============================================================================

  rest.get('/api/v2/players', (req, res, ctx) => {
    return res(
      ctx.json({
        players: [
          {
            id: 1,
            name: 'Jayson Tatum',
            team: 'Boston Celtics',
            position: 'F',
          },
          {
            id: 2,
            name: 'LeBron James',
            team: 'Los Angeles Lakers',
            position: 'F',
          },
        ],
      })
    );
  }),

  // ============================================================================
  // Seasons API
  // ============================================================================

  rest.get('/api/v2/seasons/user-participated', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          slug: '2024-25',
          year: '2024-25',
        },
        {
          slug: '2023-24',
          year: '2023-24',
        },
      ])
    );
  }),

  // ============================================================================
  // Error Handlers (for testing error states)
  // ============================================================================

  // Network error simulation
  rest.get('/api/v2/error/network', (req, res, ctx) => {
    return res(ctx.networkError('Network error'));
  }),

  // 404 error
  rest.get('/api/v2/error/not-found', (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({ error: 'Not found' })
    );
  }),

  // 500 error
  rest.get('/api/v2/error/server', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error' })
    );
  }),
];
