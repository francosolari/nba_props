import {
  orderSignature,
  restoreDraftOrder,
  standingsPayload,
} from '../editableStandingsData';

const east = [
  { team_id: 1, team_name: 'One' },
  { team_id: 2, team_name: 'Two' },
];

describe('editableStandingsData', () => {
  it('restores known draft ids and retains teams absent from the draft', () => {
    expect(restoreDraftOrder(east, [2]).map((team) => team.team_id)).toEqual([2, 1]);
  });

  it('builds stable order signatures', () => {
    expect(orderSignature(east)).toBe('1|2');
  });

  it('builds consecutive conference payload positions', () => {
    expect(standingsPayload(east, [{ team_id: 3 }])).toEqual([
      { team_id: 1, predicted_position: 1 },
      { team_id: 2, predicted_position: 2 },
      { team_id: 3, predicted_position: 1 },
    ]);
  });
});
