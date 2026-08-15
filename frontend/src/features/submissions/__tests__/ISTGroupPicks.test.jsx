import React from 'react';
import { render, screen } from '@testing-library/react';
import ISTGroupPicks from '../ISTGroupPicks';

const questions = [
  {
    id: 1,
    ist_group: 'East Group A',
    point_value: 2,
    text: 'Choose the East Group A winner',
  },
  {
    id: 2,
    ist_group: 'West Group C',
    point_value: 2,
    text: 'Choose the West Group C winner',
  },
];

describe('ISTGroupPicks', () => {
  it('uses dark conference brand colors on NBA Cup group markers', () => {
    render(
      <ISTGroupPicks
        groupQuestions={questions}
        wildcardQuestions={[]}
        teamsForQuestion={() => []}
        answers={{}}
        onAnswerChange={jest.fn()}
        isReadOnly={false}
      />,
    );

    expect(screen.getByLabelText('East Group A marker')).toHaveClass(
      'ist-group-marker',
      'ist-group-marker--east',
    );
    expect(screen.getByLabelText('West Group C marker')).toHaveClass(
      'ist-group-marker',
      'ist-group-marker--west',
    );
  });
});
