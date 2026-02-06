import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LeaderboardTableMobile } from '../LeaderboardTableMobile';

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
  displayedUsers: buildDisplayedUsers(),
  pinnedUserIds: [],
  togglePin: jest.fn(),
  westOrder: [],
  eastOrder: [],
  setWestOrder: jest.fn(),
  setEastOrder: jest.fn(),
  whatIfEnabled: false,
  simActualMap: new Map(),
  requestEnableWhatIf: jest.fn(),
  toggleWhatIfAnswer: jest.fn(),
  sortBy: 'total',
  ...overrides,
});

describe('LeaderboardTableMobile', () => {
  test('shows line values at all times and switches Tot/Pts values by sort mode', () => {
    const props = buildProps();
    const { rerender } = render(<LeaderboardTableMobile {...props} />);

    expect(screen.getByText('Tot')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();

    const answerButton = screen.getByRole('button', { name: /over 9\.5/i });
    fireEvent.click(answerButton);
    expect(props.toggleWhatIfAnswer).not.toHaveBeenCalled();

    rerender(<LeaderboardTableMobile {...buildProps({ sortBy: 'section' })} />);
    expect(screen.getByText('Pts')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.queryByText('120')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /over 9\.5/i })).toBeInTheDocument();
  });

  test('shows what-if hint and toggles answers when what-if mode is enabled', () => {
    const toggleWhatIfAnswer = jest.fn();
    render(
      <LeaderboardTableMobile
        {...buildProps({
          whatIfEnabled: true,
          sortBy: 'section',
          toggleWhatIfAnswer,
        })}
      />
    );

    expect(screen.getByText(/What-If: tap answer to toggle correct\/incorrect/i)).toBeInTheDocument();

    const answerButton = screen.getByRole('button', { name: /over 9\.5/i });
    expect(answerButton).toHaveAttribute('title', 'What-If: tap to toggle correct / incorrect / reset');

    fireEvent.click(answerButton);
    expect(toggleWhatIfAnswer).toHaveBeenCalledWith('q1', 'Over');
  });
});
