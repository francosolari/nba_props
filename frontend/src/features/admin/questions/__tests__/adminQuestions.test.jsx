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
