import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ISTUserLeaderboard from '../ISTUserLeaderboard';

const buildPrediction = (overrides = {}) => ({
  prediction_type: 'group_winner',
  ist_group: 'East Group A',
  question_text: 'Group A Winner',
  answer: 'Boston Celtics',
  is_correct: true,
  points_earned: 5,
  ...overrides,
});

describe('ISTUserLeaderboard', () => {
  it('renders an empty state when no users exist', () => {
    render(<ISTUserLeaderboard users={[]} />);

    expect(screen.getByText(/No IST predictions submitted yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Prediction Leaders/i)).not.toBeInTheDocument();
  });

  it('displays user rows with summary info and expands to show breakdowns', async () => {
    const user = userEvent.setup();
    const leaderboard = [
      {
        rank: 1,
        total_points: 27.4,
        user: { id: '1', display_name: 'Alice Analyst' },
        predictions: [
          buildPrediction(),
          buildPrediction({
            prediction_type: 'wildcard',
            ist_group: 'West Wildcard',
            answer: 'Los Angeles Lakers',
            is_correct: false,
          }),
          buildPrediction({
            prediction_type: 'conference_winner',
            ist_group: 'West Finals',
            answer: 'Denver Nuggets',
            is_correct: null,
          }),
          buildPrediction({
            prediction_type: 'tiebreaker',
            question_text: 'Total three pointers',
            answer: '255',
            is_correct: null,
          }),
          buildPrediction({
            prediction_type: 'something_else',
            question_text: 'MVP',
            answer: 'Giannis Antetokounmpo',
            is_correct: true,
          }),
        ],
      },
    ];

    render(<ISTUserLeaderboard users={leaderboard} />);

    expect(screen.getByText('Prediction Leaders')).toBeInTheDocument();
    expect(screen.getByText('Alice Analyst')).toBeInTheDocument();
    expect(screen.getByText('27.4')).toBeInTheDocument();
    expect(screen.queryByText('CLINCH')).not.toBeInTheDocument();

    const showBreakdownButton = screen.getByRole('button', { name: /Show breakdown/i });
    await user.click(showBreakdownButton);

    expect(screen.getByText(/Wildcards/i)).toBeInTheDocument();
    expect(screen.getByText(/Conference & Finals/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiebreakers/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Hide breakdown/i }));
    expect(screen.queryByText(/Wildcards/i)).not.toBeInTheDocument();
  });

  it('extends the visible list when Load More is clicked', async () => {
    const user = userEvent.setup();
    const leaderboard = Array.from({ length: 11 }, (_, index) => ({
      rank: index + 1,
      total_points: 10 + index,
      user: { id: String(index + 1), display_name: `User ${index + 1}` },
      predictions: [],
    }));

    render(<ISTUserLeaderboard users={leaderboard} />);

    expect(screen.getByText('User 10')).toBeInTheDocument();
    expect(screen.queryByText('User 11')).not.toBeInTheDocument();

    const loadMoreButton = screen.getByRole('button', { name: /Load More/ });
    await user.click(loadMoreButton);

    expect(screen.getByText('User 11')).toBeInTheDocument();
  });
});
