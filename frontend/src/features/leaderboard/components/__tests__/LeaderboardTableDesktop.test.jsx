import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LeaderboardTableDesktop } from '../LeaderboardTableDesktop';

const buildDisplayedUsers = () => ([
  {
    rank: 1,
    user: {
      id: 1,
      username: 'alpha',
      display_name: 'Alpha',
      total_points: 120,
      categories: {
        'Regular Season Standings': { points: 0, predictions: [] },
        'Player Awards': {
          points: 45,
          predictions: [
            {
              question_id: 'q1',
              question: 'Rebounds over/under 9.5',
              answer: 'Over',
              line: 9.5,
              points: 2,
              correct: true,
            },
          ],
        },
        'Props & Yes/No': { points: 0, predictions: [] },
      },
    },
  },
]);

const buildProps = (overrides = {}) => ({
  section: 'awards',
  sortBy: 'total',
  displayedUsers: buildDisplayedUsers(),
  pinnedUserIds: [],
  togglePin: jest.fn(),
  westOrder: [],
  eastOrder: [],
  setWestOrder: jest.fn(),
  setEastOrder: jest.fn(),
  whatIfEnabled: false,
  requestEnableWhatIf: jest.fn(),
  toggleWhatIfAnswer: jest.fn(),
  simActualMap: new Map(),
  leaderboardData: buildDisplayedUsers(),
  ...overrides,
});

describe('LeaderboardTableDesktop', () => {
  test('shows line values at all times and switches header points by sort mode', () => {
    const props = buildProps();
    const { rerender } = render(<LeaderboardTableDesktop {...props} />);

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /over 9\.5/i })).toBeInTheDocument();

    rerender(<LeaderboardTableDesktop {...buildProps({ sortBy: 'section' })} />);
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.queryByText('120')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /over 9\.5/i })).toBeInTheDocument();
  });

  test('only enables answer interaction in what-if mode', () => {
    const toggleWhatIfAnswer = jest.fn();
    const props = buildProps({ toggleWhatIfAnswer });
    const { rerender } = render(<LeaderboardTableDesktop {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /over 9\.5/i }));
    expect(toggleWhatIfAnswer).not.toHaveBeenCalled();

    rerender(<LeaderboardTableDesktop {...buildProps({ toggleWhatIfAnswer, whatIfEnabled: true, sortBy: 'section' })} />);

    expect(screen.getByText(/What-If: click answer to toggle correct\/incorrect/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /over 9\.5/i });
    expect(button).toHaveAttribute('title', 'What-If: click to toggle correct / incorrect / reset');

    fireEvent.click(button);
    expect(toggleWhatIfAnswer).toHaveBeenCalledWith('q1', 'Over');
  });
});
