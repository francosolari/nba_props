import React from 'react';
import { render, screen } from '@testing-library/react';
import ReadOnlyStandingsList from '../ReadOnlyStandingsList';

describe('ReadOnlyStandingsList Component', () => {
  const mockPredictions = [
    {
      team_id: 1,
      team_name: 'Boston Celtics',
      predicted_position: 1,
      team_conference: 'East',
      points: 3,
    },
    {
      team_id: 2,
      team_name: 'Milwaukee Bucks',
      predicted_position: 2,
      team_conference: 'East',
      points: 1,
    },
    {
      team_id: 3,
      team_name: 'Miami Heat',
      predicted_position: 3,
      team_conference: 'East',
      points: 0,
    },
    {
      team_id: 4,
      team_name: 'Los Angeles Lakers',
      predicted_position: 1,
      team_conference: 'West',
      points: 3,
    },
  ];

  test('renders conference header', () => {
    render(<ReadOnlyStandingsList conference="East" predictions={mockPredictions} />);

    expect(screen.getByText('Eastern Conference')).toBeInTheDocument();
  });

  test('filters predictions by conference', () => {
    render(<ReadOnlyStandingsList conference="East" predictions={mockPredictions} />);

    expect(screen.getByText('Boston Celtics')).toBeInTheDocument();
    expect(screen.getByText('Milwaukee Bucks')).toBeInTheDocument();
    expect(screen.getByText('Miami Heat')).toBeInTheDocument();
    expect(screen.queryByText('Los Angeles Lakers')).not.toBeInTheDocument();
  });

  test('sorts teams by predicted position', () => {
    const unsortedPredictions = [
      { team_id: 3, team_name: 'Miami Heat', predicted_position: 3, team_conference: 'East', points: 0 },
      { team_id: 1, team_name: 'Boston Celtics', predicted_position: 1, team_conference: 'East', points: 3 },
      { team_id: 2, team_name: 'Milwaukee Bucks', predicted_position: 2, team_conference: 'East', points: 1 },
    ];

    const { container } = render(
      <ReadOnlyStandingsList conference="East" predictions={unsortedPredictions} />
    );

    const teamNames = Array.from(container.querySelectorAll('.font-bold')).map(el => el.textContent);
    expect(teamNames).toEqual(['Boston Celtics', 'Milwaukee Bucks', 'Miami Heat']);
  });

  test('displays predicted position for each team', () => {
    render(<ReadOnlyStandingsList conference="East" predictions={mockPredictions} />);

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
  });

  test('displays points for each team', () => {
    render(<ReadOnlyStandingsList conference="East" predictions={mockPredictions} />);

    expect(screen.getByText('3 pts')).toBeInTheDocument();
    expect(screen.getByText('1 pts')).toBeInTheDocument();
    expect(screen.getByText('0 pts')).toBeInTheDocument();
  });

  test('applies correct background color for 3 points', () => {
    const { container } = render(
      <ReadOnlyStandingsList conference="East" predictions={mockPredictions} />
    );

    const celtics = container.querySelector('[title="Boston Celtics"]').closest('li');
    expect(celtics).toHaveClass('bg-green-200');
  });

  test('applies correct background color for 1 point', () => {
    const { container } = render(
      <ReadOnlyStandingsList conference="East" predictions={mockPredictions} />
    );

    const bucks = container.querySelector('[title="Milwaukee Bucks"]').closest('li');
    expect(bucks).toHaveClass('bg-yellow-200');
  });

  test('applies correct background color for 0 points', () => {
    const { container } = render(
      <ReadOnlyStandingsList conference="East" predictions={mockPredictions} />
    );

    const heat = container.querySelector('[title="Miami Heat"]').closest('li');
    expect(heat).toHaveClass('bg-white');
  });

  test('renders West conference correctly', () => {
    render(<ReadOnlyStandingsList conference="West" predictions={mockPredictions} />);

    expect(screen.getByText('Western Conference')).toBeInTheDocument();
    expect(screen.getByText('Los Angeles Lakers')).toBeInTheDocument();
    expect(screen.queryByText('Boston Celtics')).not.toBeInTheDocument();
  });

  test('handles empty predictions array', () => {
    const { container } = render(
      <ReadOnlyStandingsList conference="East" predictions={[]} />
    );

    expect(screen.getByText('Eastern Conference')).toBeInTheDocument();
    const list = container.querySelector('ul');
    expect(list.children).toHaveLength(0);
  });

  test('handles case-insensitive conference matching', () => {
    const mixedCasePredictions = [
      { team_id: 1, team_name: 'Team A', predicted_position: 1, team_conference: 'EAST', points: 3 },
      { team_id: 2, team_name: 'Team B', predicted_position: 2, team_conference: 'east', points: 1 },
    ];

    render(<ReadOnlyStandingsList conference="East" predictions={mixedCasePredictions} />);

    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  test('displays team name in title attribute', () => {
    const { container } = render(
      <ReadOnlyStandingsList conference="East" predictions={mockPredictions} />
    );

    const teamElement = container.querySelector('[title="Boston Celtics"]');
    expect(teamElement).toBeInTheDocument();
    expect(teamElement).toHaveAttribute('title', 'Boston Celtics');
  });
});
