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

    const button = screen.getByRole('button', { name: /over 9\.5/i });
    expect(button).toHaveAttribute('title', 'What-If: click to give this the win; the current leader drops to runner-up');

    fireEvent.click(button);
    expect(toggleWhatIfAnswer).toHaveBeenCalledWith('q1', 'Over');
  });

  test('body cells have data-col-user attributes for FLIP column animation', () => {
    const { container } = render(<LeaderboardTableDesktop {...buildProps()} />);

    const colCells = container.querySelectorAll('[data-col-user="1"]');
    expect(colCells.length).toBeGreaterThan(0);

    colCells.forEach((cell) => {
      expect(cell).toHaveAttribute('data-col-user', '1');
    });
  });

  test('displays answer with line value appended for over/under predictions', () => {
    render(<LeaderboardTableDesktop {...buildProps()} />);

    // "Over" answer with line 9.5 should render as "Over 9.5"
    const button = screen.getByRole('button', { name: /over 9\.5/i });
    expect(button).toBeInTheDocument();
    expect(button.textContent).toBe('Over 9.5');
  });

  test('renders partial-credit answers with amber styling', () => {
    const displayedUsers = buildDisplayedUsers();
    displayedUsers[0].user.categories['Player Awards'].predictions[0] = {
      ...displayedUsers[0].user.categories['Player Awards'].predictions[0],
      points: 2.5,
      correct: false,
      score_status: 'partial',
    };

    render(<LeaderboardTableDesktop {...buildProps({ displayedUsers, leaderboardData: displayedUsers })} />);

    expect(screen.getByRole('button', { name: /over 9\.5/i }).className).toContain('is-near');
  });
});

describe('LeaderboardTableDesktop — settlement and roster controls', () => {
  const withSettlement = (overrides) => {
    const users = buildDisplayedUsers();
    users[0].user.categories['Player Awards'].predictions[0] = {
      ...users[0].user.categories['Player Awards'].predictions[0],
      ...overrides,
    };
    return users;
  };

  test('a settled result draws a solid ticket, an unsettled one a dashed ticket', () => {
    const settled = withSettlement({ is_locked: true });
    const { rerender } = render(
      <LeaderboardTableDesktop {...buildProps({ displayedUsers: settled, leaderboardData: settled })} />
    );
    expect(screen.getByRole('button', { name: /over 9\.5/i }).className).toContain('is-settled');

    const open = withSettlement({ is_locked: false });
    rerender(<LeaderboardTableDesktop {...buildProps({ displayedUsers: open, leaderboardData: open })} />);
    expect(screen.getByRole('button', { name: /over 9\.5/i }).className).toContain('is-inplay');
  });

  test('a scenario suppresses the settlement mark, since the numbers are hypothetical', () => {
    const settled = withSettlement({ is_locked: true });
    render(
      <LeaderboardTableDesktop
        {...buildProps({ displayedUsers: settled, leaderboardData: settled, whatIfEnabled: true, sortBy: 'section' })}
      />
    );
    const ticket = screen.getByRole('button', { name: /over 9\.5/i }).className;
    expect(ticket).not.toContain('is-settled');
    expect(ticket).not.toContain('is-inplay');
  });

  test('exact points ride along with every cell for hover, not just the ticket colour', () => {
    const { container } = render(<LeaderboardTableDesktop {...buildProps()} />);
    expect(container.querySelector('.court-adv-points').textContent).toBe('+2');
  });

  test('a participant can be dropped straight from the column head', () => {
    const removeUser = jest.fn();
    render(<LeaderboardTableDesktop {...buildProps({ removeUser })} />);

    fireEvent.click(screen.getByRole('button', { name: /remove alpha/i }));
    expect(removeUser).toHaveBeenCalledWith(1);
  });

  test('a pinned participant sticks to the left edge of the scrolling columns', () => {
    const { container, rerender } = render(<LeaderboardTableDesktop {...buildProps()} />);
    expect(container.querySelectorAll('.is-sticky')).toHaveLength(0);

    rerender(<LeaderboardTableDesktop {...buildProps({ pinnedUserIds: ['1'] })} />);
    // The head cell and every body cell of that column travel together.
    expect(container.querySelectorAll('.is-sticky').length).toBeGreaterThan(1);
  });
});

describe('LeaderboardTableDesktop — the answer key', () => {
  const withResult = (overrides) => {
    const users = buildDisplayedUsers();
    users[0].user.categories['Player Awards'].predictions[0] = {
      ...users[0].user.categories['Player Awards'].predictions[0],
      ...overrides,
    };
    return users;
  };

  const renderWith = (overrides) => {
    const users = withResult(overrides);
    return render(<LeaderboardTableDesktop {...buildProps({ displayedUsers: users, leaderboardData: users })} />);
  };

  test('shows the result even when nobody picked it', () => {
    // Nobody in this comparison chose Wembanyama, so without the key the actual
    // outcome appears nowhere on the board.
    const { container } = renderWith({ correct_answer: 'Victor Wembanyama', is_locked: true });

    const key = container.querySelector('.court-adv-key');
    expect(key).toHaveTextContent('Victor Wembanyama');
    expect(screen.queryByRole('button', { name: /victor wembanyama/i })).not.toBeInTheDocument();
  });

  test('a provisional result is labelled as leading, a settled one as won', () => {
    const { container, rerender } = renderWith({ correct_answer: 'Leader', is_locked: false, is_finalized: false });
    expect(container.querySelector('.court-adv-key')).toHaveTextContent('Leading');

    const settled = withResult({ correct_answer: 'Leader', is_finalized: true });
    rerender(<LeaderboardTableDesktop {...buildProps({ displayedUsers: settled, leaderboardData: settled })} />);
    expect(container.querySelector('.court-adv-key')).toHaveTextContent('Won');
  });

  test('the runner-up is named alongside the winner', () => {
    const { container } = renderWith({ correct_answer: 'Leader', runner_up_answer: 'Second' });
    const key = container.querySelector('.court-adv-key');
    expect(key).toHaveTextContent('Leader');
    expect(key).toHaveTextContent('2nd');
    expect(key).toHaveTextContent('Second');
  });

  test('an ungraded question shows no key rather than an empty one', () => {
    const { container } = renderWith({ correct_answer: null, runner_up_answer: null });
    expect(container.querySelector('.court-adv-key')).not.toBeInTheDocument();
  });
});
