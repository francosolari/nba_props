import { orderQuestions } from '../helpers';

const questions = [
  { id: 1, text: 'Will Kawhi get a tribute?', kind: 'Yes/No' },
  { id: 2, text: 'Ant or LaMelo threes', kind: 'Head-to-head' },
  { id: 3, text: 'Trae assists', kind: 'Over/Under' },
  { id: 4, text: 'Chet vs Spurs', kind: 'Over/Under' },
  { id: 5, text: 'MVP', kind: undefined },
];

test('all questions are grouped by kind, then alphabetical', () => {
  expect(orderQuestions(questions).map((q) => q.id)).toEqual([4, 3, 1, 2, 5]);
});

test('a picked kind shows only its questions', () => {
  expect(orderQuestions(questions, 'Over/Under').map((q) => q.id)).toEqual([4, 3]);
});
