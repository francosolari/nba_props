import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ISTWildcardRace from '../ISTWildcardRace';

describe('ISTWildcardRace', () => {
  it('returns null when there are no teams', () => {
    const { container } = render(<ISTWildcardRace conference="East" teams={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders top three wildcard contenders and hides others', () => {
    const teams = [
      { team_id: 1, team_name: 'Team One', ist_group: 'Group A', wins: 3, losses: 0, point_differential: 15 },
      { team_id: 2, team_name: 'Team Two', ist_group: 'Group B', wins: 2, losses: 1, point_differential: 5 },
      { team_id: 3, team_name: 'Team Three', ist_group: 'Group C', wins: 2, losses: 1, point_differential: -2 },
      { team_id: 4, team_name: 'Team Four', ist_group: 'Group D', wins: 1, losses: 2, point_differential: -10 },
    ];

    render(<ISTWildcardRace conference="East" teams={teams} />);

    expect(screen.getByText(/East WILDCARD/i)).toBeInTheDocument();
    expect(screen.getByText('Team One')).toBeInTheDocument();
    expect(screen.getByText('Team Two')).toBeInTheDocument();
    expect(screen.getByText('Team Three')).toBeInTheDocument();
    expect(screen.queryByText('Team Four')).not.toBeInTheDocument();
  });

  it('toggles tiebreaker rules when the info button is clicked', async () => {
    const user = userEvent.setup();
    const teams = [
      { team_id: 1, team_name: 'Team One', ist_group: 'Group A', wins: 3, losses: 0, point_differential: 15 },
    ];

    render(<ISTWildcardRace conference="West" teams={teams} />);

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    expect(screen.getByText('Tiebreaker Order:')).toBeInTheDocument();

    await user.click(toggleButton);

    expect(screen.queryByText('Tiebreaker Order:')).not.toBeInTheDocument();
  });
});
