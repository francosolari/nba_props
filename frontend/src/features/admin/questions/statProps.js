// Stats a player-stat prop can be about. Internal filing only: players see
// every prop as "Prop", and the admin writes the question text.
export const STAT_OPTIONS = [
  { value: 'points', label: 'Points per game' },
  { value: 'rebounds', label: 'Rebounds per game' },
  { value: 'assists', label: 'Assists per game' },
  { value: 'pra', label: 'Pts + reb + ast per game' },
  { value: 'steals', label: 'Steals per game' },
  { value: 'blocks', label: 'Blocks per game' },
  { value: 'threes', label: 'Threes made (season)' },
  { value: 'technicals', label: 'Technical fouls (season)' },
  { value: 'games', label: 'Games played' },
  { value: 'fg_pct', label: 'Field goal %' },
  { value: 'three_pct', label: '3-point %' },
  { value: 'other', label: 'Other' },
];

export const statLabel = (value) => STAT_OPTIONS.find((option) => option.value === value)?.label || value;

// The form's three prop kinds. Player stat is answered over/under; the
// stat saved with it is what files it as a player stat.
export const PROP_KINDS = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'over_under', label: 'Over / Under' },
  { value: 'player_stat', label: 'Player stat' },
];

export const propKind = (question) => (
  question.outcome_type === 'yes_no' ? 'yes_no' : question.stat ? 'player_stat' : 'over_under'
);

export const outcomeForKind = (kind) => (kind === 'yes_no' ? 'yes_no' : 'over_under');
