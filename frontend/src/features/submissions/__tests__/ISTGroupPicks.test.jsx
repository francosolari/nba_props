import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('uses saturated conference brand colors on NBA Cup group markers', () => {
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

  it('tags selected team cards with their matching conference outline theme', () => {
    const teams = {
      1: [{ id: 11, name: 'East Team' }],
      2: [{ id: 22, name: 'West Team' }],
    };

    render(
      <ISTGroupPicks
        groupQuestions={questions}
        wildcardQuestions={[]}
        teamsForQuestion={(question) => teams[question.id]}
        answers={{ 1: 11, 2: 22 }}
        onAnswerChange={jest.fn()}
        isReadOnly={false}
      />,
    );

    expect(screen.getByRole('button', { name: /East Team/ })).toHaveClass('ist-team-choice--east');
    expect(screen.getByRole('button', { name: /West Team/ })).toHaveClass('ist-team-choice--west');
  });
});


test('a team row selects its question and locked picks cannot be changed', () => {
  const onAnswerChange = jest.fn();
  const props = {
    groupQuestions: [questions[0]], wildcardQuestions: [],
    teamsForQuestion: () => [{ id: 11, name: 'Boston Celtics' }],
    answers: {}, onAnswerChange, isReadOnly: false,
  };
  const { rerender } = render(<ISTGroupPicks {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Boston Celtics' }));
  expect(onAnswerChange).toHaveBeenCalledWith(1, 11);
  rerender(<ISTGroupPicks {...props} answers={{ 1: 11 }} isReadOnly />);
  const row = screen.getByRole('button', { name: 'Boston Celtics' });
  expect(row).toHaveAttribute('aria-pressed', 'true');
  expect(row).toBeDisabled();
  fireEvent.click(row);
  expect(onAnswerChange).toHaveBeenCalledTimes(1);
});
