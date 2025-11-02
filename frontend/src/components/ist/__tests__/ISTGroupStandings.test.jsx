import React from 'react';
import { render, screen } from '@testing-library/react';
import ISTGroupStandings from '../ISTGroupStandings';

describe('ISTGroupStandings', () => {
  it('returns null when no teams are provided', () => {
    const { container } = render(
      <ISTGroupStandings groupName="East Group A" conference="East" teams={[]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders group header and team rows with stats', () => {
    const teams = [
      {
        team_id: 1,
        team_name: 'Team Alpha',
        group_rank: 1,
        wins: 3,
        losses: 0,
        point_differential: 12,
      },
      {
        team_id: 2,
        team_name: 'Team Beta',
        group_rank: 2,
        wins: 2,
        losses: 1,
        point_differential: -5,
        clinch_group: true,
      },
    ];

    const { container } = render(
      <ISTGroupStandings groupName="East Group A" conference="East" teams={teams} />
    );

    expect(screen.getByText('GROUP A')).toBeInTheDocument();
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.getByText('3-0')).toBeInTheDocument();
    expect(screen.getByText('2-1')).toBeInTheDocument();
    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
    expect(screen.getByText('CLINCH')).toBeInTheDocument();
    expect(container.querySelector('.lucide-check')).toBeInTheDocument();
  });
});
