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

    expect(screen.getByText(/tap any answer to toggle correct \/ incorrect \/ reset/i)).toBeInTheDocument();

    const answerButton = screen.getByRole('button', { name: /over 9\.5/i });
    expect(answerButton).toHaveAttribute('title', 'What-If: tap to toggle correct / incorrect / reset');

    fireEvent.click(answerButton);
    expect(toggleWhatIfAnswer).toHaveBeenCalledWith('q1', 'Over');
  });

  test('displays answer with line value appended for over/under predictions', () => {
    render(<LeaderboardTableMobile {...buildProps()} />);

    const button = screen.getByRole('button', { name: /over 9\.5/i });
    expect(button).toBeInTheDocument();
    expect(button.textContent).toBe('Over 9.5');
  });

  test('renders mobile-optimized flex layout with explicit column widths', () => {
    // FAANG-standard: Verify the structural fix for alignment/glitchiness (the "Why" of the change).
    // We expect explicit width classes that match the header to prevent misalignment.
    const props = buildProps();
    const { container } = render(<LeaderboardTableMobile {...props} />);

    // Verify migration away from table to avoid layout engine inconsistencies
    const table = container.querySelector('table');
    expect(table).not.toBeInTheDocument();

    // Verify Sticky Player Column (100px)
    const playerCell = screen.getByText('Alpha').closest('div');
    expect(playerCell).toHaveClass('sticky', 'left-0', 'w-[100px]');

    // Verify Sticky Points Column (42px)
    // The points cell is the next sibling or close by. We can find it by value '120' (Total) or '45' (Pts)
    // In default buildProps, sortBy is 'total', so it shows 120.
    const pointsCell = screen.getByText('120').closest('div');
    expect(pointsCell).toHaveClass('sticky', 'left-[100px]', 'w-[42px]');

    // Verify Data/Question Column (160px)
    const answerButton = screen.getByRole('button', { name: /over 9\.5/i });
    const answerCell = answerButton.closest('div');
    expect(answerCell).toHaveClass('w-[160px]');
  });
});
