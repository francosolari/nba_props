import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuestionRow from '../components/QuestionRow';
import { filterQuestions } from '../questionTypes';

const questions = [
  { id: 1, question_type: 'superlative', text: 'Who wins MVP?' },
  { id: 2, question_type: 'prop', text: 'Will Wemby average 25 points?' },
  { id: 3, question_type: 'head_to_head', text: 'East or West wins the Finals?' },
];

describe('filterQuestions', () => {
  test('filters by type, text, type label, and #id', () => {
    expect(filterQuestions(questions, { type: 'prop' }).map((q) => q.id)).toEqual([2]);
    expect(filterQuestions(questions, { query: 'mvp' }).map((q) => q.id)).toEqual([1]);
    expect(filterQuestions(questions, { query: 'head-to' }).map((q) => q.id)).toEqual([3]);
    expect(filterQuestions(questions, { query: '#2' }).map((q) => q.id)).toEqual([2]);
    expect(filterQuestions(questions, { type: 'prop', query: 'mvp' })).toEqual([]);
    expect(filterQuestions(questions)).toHaveLength(3);
  });
});

const renderRow = (props) => render(
  <ol>
    <QuestionRow
      question={{ ...questions[0], point_value: 1, award_id: null }}
      onUpdate={jest.fn()}
      onDelete={jest.fn()}
      inputClass="court-admin-input"
      primaryButtonClass=""
      secondaryButtonClass=""
      awardOptions={[]}
      playerOptions={[]}
      teamOptions={[]}
      {...props}
    />
  </ol>,
);

describe('QuestionRow', () => {
  test('asks before deleting and can back out', async () => {
    const onDelete = jest.fn();
    renderRow({ onDelete });

    fireEvent.click(screen.getByRole('button', { name: 'Delete question #1' }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.queryByRole('group', { name: 'Confirm delete' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete question #1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled());
  });

  test('keeps the editor and draft open when a save fails', async () => {
    const onUpdate = jest.fn().mockResolvedValue(false);
    renderRow({ onUpdate });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Who wins MVP this year?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(screen.getByLabelText('Question')).toHaveValue('Who wins MVP this year?');
  });
});

describe('Prop questions', () => {
  const PropForm = require('../components/PropForm').default;
  const { defaultPropForm } = require('../components/PropForm');
  const QuestionCard = require('../../../submissions/QuestionCard').default;

  test('a player stat prop is saved as an over/under with its stat and split points', async () => {
    const handleMutation = jest.fn().mockResolvedValue(true);
    render(
      <PropForm
        form={{
          ...defaultPropForm(1),
          kind: 'player_stat',
          text: 'Luka Dončić technical fouls (season)',
          relatedPlayerId: 7,
          stat: 'technicals',
          line: '15.5',
          pointsIfCorrect: { Over: '1', Under: '2' },
        }}
        setForm={jest.fn()}
        playerOptions={[{ value: 7, label: 'Luka Doncic' }]}
        defaultPointValue={1}
        activeSeason="2026-27"
        ensureSeasonSelected={() => true}
        setError={jest.fn()}
        handleMutation={handleMutation}
        createProp={{ isPending: false }}
        classes={{ labelClass: '', textareaClass: '', primaryButtonClass: '' }}
        themeStyles={{ subtle: '', mode: 'light' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create question' }));

    await waitFor(() => expect(handleMutation).toHaveBeenCalled());
    expect(handleMutation.mock.calls[0][1]).toMatchObject({
      outcome_type: 'over_under',
      stat: 'technicals',
      related_player_id: 7,
      line: 15.5,
      points_if_correct: { Over: 1, Under: 2 },
    });
  });

  test('warns that existing picks will not match after switching Yes/No to Over/Under', () => {
    renderRow({
      question: {
        id: 9, question_type: 'prop', text: 'Will the Bills make the Super Bowl?', point_value: 3,
        outcome_type: 'yes_no', answer_count: 4, points_if_correct: { Yes: 3, No: 1 },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Over / Under' }));
    expect(screen.getByRole('status')).toHaveTextContent('4 picks were made as Yes/No');
  });

  test('the pick card shows each answer its points only when they differ', () => {
    const base = { id: 1, question_type: 'prop', outcome_type: 'yes_no', text: 'Will the Bills make the Super Bowl?', point_value: 3 };
    const { rerender } = render(<QuestionCard question={{ ...base, points_if_correct: { Yes: 3, No: 1 } }} answer="" onChange={jest.fn()} />);
    expect(screen.getByText('Up to 3 pts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yes\s*3 pts/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No\s*1 pt$/ })).toBeInTheDocument();

    rerender(<QuestionCard question={{ ...base, points_if_correct: {} }} answer="" onChange={jest.fn()} />);
    expect(screen.getByText('3 pts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
  });
});

test('an award pick list hides excluded players', () => {
  const QuestionCard = require('../../../submissions/QuestionCard').default;
  render(
    <QuestionCard
      question={{ id: 2, question_type: 'superlative', text: 'Name a first-time All-Star', point_value: 2, excluded_player_ids: [1] }}
      answer=""
      onChange={jest.fn()}
      playerOptions={[{ value: 1, label: 'LeBron James' }, { value: 2, label: 'Alperen Sengun' }]}
    />,
  );
  expect(screen.queryByText('Runner-up selections earn half points.')).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
  expect(screen.getByText('Alperen Sengun')).toBeInTheDocument();
  expect(screen.queryByText('LeBron James')).not.toBeInTheDocument();
});
