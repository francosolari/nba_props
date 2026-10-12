import { renderHook } from '@testing-library/react';
import useIstSubmissionData from '../useIstSubmissionData';

const questions = [
  { id: 1, prediction_type: 'conference_winner', ist_group: 'East', text: 'East winner' },
  { id: 2, prediction_type: 'conference_winner', ist_group: 'West', text: 'West winner' },
  { id: 3, prediction_type: 'champion', text: 'NBA Cup champion' },
  { id: 4, prediction_type: 'tiebreaker', text: 'East points' },
  { id: 5, prediction_type: 'tiebreaker', text: 'West points' },
];
const teamOptions = [
  { value: 11, label: 'Boston Celtics', conference: 'East' },
  { value: 22, label: 'Denver Nuggets', conference: 'West' },
  { value: 33, label: 'New York Knicks', conference: 'East' },
];
const run = (answers, isReadOnly = false) => {
  const onAnswerChange = jest.fn();
  renderHook(() => useIstSubmissionData({ questions, answers, onAnswerChange, isReadOnly, teamOptions, istStandings: {} }));
  return onAnswerChange;
};

test('one entered score cannot change the champion while the other score is blank', () => {
  expect(run({ 1: 11, 2: 22, 3: 22, 4: '110', 5: '' })).not.toHaveBeenCalled();
});
test('two scores select the higher-scoring finalist', () => {
  expect(run({ 1: 11, 2: 22, 3: 22, 4: '110', 5: '105' })).toHaveBeenCalledWith(3, 11);
});
test('equal scores preserve the manually selected champion', () => {
  expect(run({ 1: 11, 2: 22, 3: 22, 4: '110', 5: '110' })).not.toHaveBeenCalled();
});
test('changing a finalist clears a champion that is no longer in the matchup', () => {
  expect(run({ 1: 33, 2: 22, 3: 11, 4: '', 5: '' })).toHaveBeenCalledWith(3, '');
});
test('locked predictions never change automatically', () => {
  expect(run({ 1: 11, 2: 22, 3: 22, 4: '110', 5: '105' }, true)).not.toHaveBeenCalled();
});
