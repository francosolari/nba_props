export const QUESTION_GROUP_META = {
  superlative: {
    title: 'Awards & Superlatives',
    shortTitle: 'Awards',
    description: 'Pick the season award winners and standout performers.',
  },
  prop: {
    title: 'Prop Bets',
    shortTitle: 'Props',
    description: 'Forecast over/under lines and yes/no season outcomes.',
  },
  player_stat: {
    title: 'Player Stat Challenges',
    shortTitle: 'Player stats',
    description: 'Predict statistical totals for standout player performances.',
  },
  head_to_head: {
    title: 'Head-to-Head Matchups',
    shortTitle: 'Matchups',
    description: 'Choose the winner in marquee matchups.',
  },
  ist: {
    title: 'In Season Tournament: NBA Cup',
    shortTitle: 'NBA Cup',
    description: 'Make your picks for the NBA In-Season Tournament.',
  },
  nba_finals: {
    title: 'NBA Finals Predictions',
    shortTitle: 'Finals',
    description: 'Project the teams and outcomes of the Finals.',
  },
  other: {
    title: 'Additional Predictions',
    shortTitle: 'More picks',
    description: 'Questions that do not fit other categories.',
  },
};

export const QUESTION_GROUP_ORDER = [
  'superlative',
  'prop',
  'player_stat',
  'head_to_head',
  'nba_finals',
  'ist',
  'other',
];

export const isAnswered = (value) => {
  if (value === undefined || value === null) return false;
  return typeof value === 'string' ? value.trim().length > 0 : true;
};

export const getQuestionGroupType = (question) => (
  QUESTION_GROUP_META[question.question_type] ? question.question_type : 'other'
);
