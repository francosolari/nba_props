import React from 'react';
import { render, screen } from '@testing-library/react';
import PredictionRow from '../PredictionRow';

describe('PredictionRow Component', () => {
  test('renders with required props', () => {
    render(
      <PredictionRow
        question="Who will win MVP?"
        status="pending"
      />
    );

    expect(screen.getByText('Who will win MVP?')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('0/3 pts')).toBeInTheDocument();
  });

  test('displays correct status for each type', () => {
    const statuses = ['pending', 'correct', 'incorrect', 'partial'];
    const labels = ['Pending', 'Correct', 'Incorrect', 'Partial'];

    statuses.forEach((status, index) => {
      const { rerender } = render(
        <PredictionRow
          question="Test question"
          status={status}
        />
      );

      expect(screen.getByText(labels[index])).toBeInTheDocument();

      if (index < statuses.length - 1) {
        rerender(<div />);
      }
    });
  });

  test('displays points correctly', () => {
    render(
      <PredictionRow
        question="Test question"
        points={5}
        possiblePoints={10}
      />
    );

    expect(screen.getByText('5/10 pts')).toBeInTheDocument();
  });

  test('shows user answer when provided', () => {
    render(
      <PredictionRow
        question="Who will win MVP?"
        answer="LeBron James"
        status="pending"
      />
    );

    expect(screen.getByText(/Your answer:/)).toBeInTheDocument();
    expect(screen.getByText('LeBron James')).toBeInTheDocument();
  });

  test('shows correct answer when status is not pending', () => {
    render(
      <PredictionRow
        question="Who will win MVP?"
        answer="LeBron James"
        correctAnswer="Nikola Jokic"
        status="incorrect"
      />
    );

    expect(screen.getByText(/Correct answer:/)).toBeInTheDocument();
    expect(screen.getByText('Nikola Jokic')).toBeInTheDocument();
  });

  test('does not show correct answer when status is pending', () => {
    render(
      <PredictionRow
        question="Who will win MVP?"
        answer="LeBron James"
        correctAnswer="Nikola Jokic"
        status="pending"
      />
    );

    expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument();
  });

  test('compact mode hides details', () => {
    render(
      <PredictionRow
        question="Who will win MVP?"
        answer="LeBron James"
        status="correct"
        compact={true}
      />
    );

    expect(screen.queryByText('Correct')).not.toBeInTheDocument();
    expect(screen.queryByText(/Your answer:/)).not.toBeInTheDocument();
  });

  test('non-compact mode shows full details', () => {
    render(
      <PredictionRow
        question="Who will win MVP?"
        answer="LeBron James"
        status="correct"
        compact={false}
      />
    );

    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText(/Your answer:/)).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <PredictionRow
        question="Test"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('defaults to pending status when no status provided', () => {
    const { container } = render(
      <PredictionRow question="Test" />
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-gray-100');
  });
});
