import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NBAFinalsSection from '../NBAFinalsSection';

const questions = [
  { id: 1, text: 'Which Eastern Conference team will reach the NBA Finals?', group_name: 'east_finalist', point_value: 2 },
  { id: 2, text: 'Which Western Conference team will reach the NBA Finals?', group_name: 'west_finalist', point_value: 2 },
  { id: 3, text: 'Which team will win the NBA Finals?', group_name: 'champion', point_value: 4 },
  { id: 4, text: 'NBA Finals series score (tiebreaker)', group_name: 'series_score', point_value: 0 },
];
const teamOptions = [
  { value: 10, label: 'New York Knicks', conference: 'East' },
  { value: 11, label: 'Boston Celtics', conference: 'East' },
  { value: 20, label: 'Oklahoma City Thunder', conference: 'West' },
];
const renderSection = (answers, onAnswerChange = jest.fn()) => {
  render(<NBAFinalsSection questions={questions} answers={answers} onAnswerChange={onAnswerChange} isReadOnly={false} teamOptions={teamOptions} loadingAuxData={false} />);
  return onAnswerChange;
};

test('the champion waits for both finalists', () => {
  renderSection({ 1: 10 });
  expect(screen.getByText(/Pick both finalists first/)).toBeInTheDocument();
  expect(screen.queryByRole('radiogroup', { name: 'NBA Finals champion' })).not.toBeInTheDocument();
});

test('the champion is one of the two finalists', () => {
  const onAnswerChange = renderSection({ 1: 10, 2: 20 });
  const champion = screen.getByRole('radiogroup', { name: 'NBA Finals champion' });
  const options = [...champion.querySelectorAll('[role=radio]')].map((b) => b.textContent);
  expect(options).toEqual(['New York Knicks', 'Oklahoma City Thunder']);
  fireEvent.click(screen.getByRole('radio', { name: 'Oklahoma City Thunder' }));
  expect(onAnswerChange).toHaveBeenCalledWith(3, '20');
});

test('the series score saves as champion wins in N', () => {
  const onAnswerChange = renderSection({});
  fireEvent.click(screen.getByRole('radio', { name: '4-2' }));
  expect(onAnswerChange).toHaveBeenCalledWith(4, '4-2');
});

test('legacy wording still finds each role', () => {
  const legacy = [
    { id: 85, text: 'Which Eastern Conference team will appear in the NBA Finals?', point_value: 1 },
    { id: 86, text: 'Which Western Conference team will appear in the NBA Finals', group_name: 'finals_west', point_value: 1 },
    { id: 87, text: 'Which team will win the NBA Finals?', group_name: 'finals_east', point_value: 2 },
  ];
  render(<NBAFinalsSection questions={legacy} answers={{ 85: 10, 86: 20, 87: '10' }} onAnswerChange={jest.fn()} isReadOnly teamOptions={teamOptions} loadingAuxData={false} />);
  expect(screen.getByRole('radio', { name: 'New York Knicks' })).toHaveAttribute('aria-checked', 'true');
});
