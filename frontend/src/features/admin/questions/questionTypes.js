// Question types in the order the admin composer and list filters show them.
export const QUESTION_TYPES = [
  { value: 'superlative', label: 'Award' },
  { value: 'prop', label: 'Prop' },
  { value: 'head_to_head', label: 'Head-to-head' },
  { value: 'player_stat', label: 'Player stat' },
  { value: 'ist', label: 'Cup' },
  { value: 'nba_finals', label: 'Finals' },
];

export const questionTypeLabel = (value) => (
  QUESTION_TYPES.find((type) => type.value === value)?.label || value
);

// Case-insensitive match on question text, type label, or id.
export const filterQuestions = (questions, { type = 'all', query = '' } = {}) => {
  const needle = query.trim().toLowerCase();
  return questions.filter((question) => {
    if (type !== 'all' && question.question_type !== type) return false;
    if (!needle) return true;
    return (
      String(question.text || '').toLowerCase().includes(needle)
      || questionTypeLabel(question.question_type).toLowerCase().includes(needle)
      || String(question.id) === needle.replace(/^#/, '')
    );
  });
};
