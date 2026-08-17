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

  test('toggles answers when what-if mode is enabled', () => {
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

    const answerButton = screen.getByRole('button', { name: /over 9\.5/i });
    expect(answerButton).toHaveAttribute('title', 'What-If: tap to give this the win; the current leader drops to runner-up');

    fireEvent.click(answerButton);
    expect(toggleWhatIfAnswer).toHaveBeenCalledWith('q1', 'Over');
  });

  test('displays answer with line value appended for over/under predictions', () => {
    render(<LeaderboardTableMobile {...buildProps()} />);

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

    render(<LeaderboardTableMobile {...buildProps({ displayedUsers })} />);

    expect(screen.getByRole('button', { name: /over 9\.5/i }).className).toContain('is-near');
  });

  test('keeps rank, name and score in one fixed zone while columns swipe', () => {
    // The transposition depends on a flex layout with a single sticky fixed
    // zone; a table element would reintroduce the alignment drift this replaced.
    const { container } = render(<LeaderboardTableMobile {...buildProps()} />);

    expect(container.querySelector('table')).not.toBeInTheDocument();

    const fixedZone = screen.getByText('Alpha').closest('.court-adv-mfixed');
    expect(fixedZone).toBeInTheDocument();
    // Rank, name and the score What-If moves all live in that one cell.
    expect(fixedZone).toHaveTextContent('1');
    expect(fixedZone).toHaveTextContent('Alpha');
    expect(fixedZone).toHaveTextContent('120');

    const answerCell = screen.getByRole('button', { name: /over 9\.5/i }).closest('.court-adv-mcell');
    expect(answerCell).toHaveClass('court-adv-mcell--wide');
  });

  test('the fixed participant cell pins that player in the comparison', () => {
    const props = buildProps();
    render(<LeaderboardTableMobile {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /pin alpha/i }));
    expect(props.togglePin).toHaveBeenCalledWith(1);
  });
});
