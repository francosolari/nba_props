import { useState, useEffect, useCallback } from 'react';

// Helper to get seasonSlug from DOM, if available
const getSeasonSlugFromDOM = () => {
  const rootElement = document.getElementById('leaderboard-page-root'); // Assuming this is the root for LeaderboardPage
  return rootElement?.getAttribute('data-season-slug') || 'current'; // Default to 'current'
};

// Helper to get loggedInUsername from DOM, if available
const getLoggedInUsernameFromDOM = () => {
  const rootElement = document.getElementById('leaderboard-page-root'); // Assuming this is the root for LeaderboardPage
  return rootElement?.getAttribute('data-logged-in-username') || '';
};

// Define constants for question types and their display names
const QUESTION_TYPES = {
  REGULAR_SEASON_STANDINGS: 'regularseasonstandingprediction', // From StandingPrediction
  SUPERLATIVE_QUESTION: 'superlativequestion',
  PROP_QUESTION: 'propquestion',
  HEAD_TO_HEAD_QUESTION: 'headtoheadquestion',
  PLAYER_STAT_PREDICTION_QUESTION: 'playerstatpredictionquestion',
  NBA_FINALS_PREDICTION_QUESTION: 'nbafinalspredictionquestion',
};

const CATEGORY_MAP = {
  [QUESTION_TYPES.REGULAR_SEASON_STANDINGS]: 'Regular Season Standings',
  [QUESTION_TYPES.SUPERLATIVE_QUESTION]: 'Superlative Questions',
  // Grouping Misc questions
  [QUESTION_TYPES.PROP_QUESTION]: 'Misc Questions',
  [QUESTION_TYPES.HEAD_TO_HEAD_QUESTION]: 'Misc Questions',
  [QUESTION_TYPES.PLAYER_STAT_PREDICTION_QUESTION]: 'Misc Questions',
  [QUESTION_TYPES.NBA_FINALS_PREDICTION_QUESTION]: 'Misc Questions',
};

function useUserAnswers(username, seasonSlug) {
  const effectiveUsername = username || getLoggedInUsernameFromDOM();
  const effectiveSeason = seasonSlug || getSeasonSlugFromDOM();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!effectiveUsername || !effectiveSeason) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1) Fetch user's answers to questions
      const ansRes = await fetch(
        `/api/v1/user-answers/${encodeURIComponent(effectiveUsername)}/?season=${effectiveSeason}`
      );
      const { answers } = await ansRes.json();

      // 2) Fetch user's standings predictions
      const standRes = await fetch(
        `/api/v1/user-predictions/${effectiveSeason}/?username=${encodeURIComponent(
          effectiveUsername
        )}`
      );
      const { predictions: standings } = await standRes.json();

      // 3) Fetch all questions for the season to get question types and max points
      const questionsRes = await fetch(
        `/api/v1/questions/${effectiveSeason}`
      );
      const { questions } = await questionsRes.json();
      const questionMap = new Map(questions.map(q => [q.id, q]));

      // 4) Group answers and predictions into categories
      const categories = {
        'Regular Season Standings': {
          totalPossiblePoints: 0,
          pointsEarned: 0,
          items: [],
          isPrediction: true, // Special flag for predictions vs. answers
        },
        'Superlative Questions': {
          totalPossiblePoints: 0,
          pointsEarned: 0,
          items: [],
        },
        'Misc Questions': {
          totalPossiblePoints: 0,
          pointsEarned: 0,
          items: [],
        },
      };

      // Process Standing Predictions
      if (standings && standings.standings) {
        standings.standings.forEach(sp => {
          // Assuming each standing prediction has an associated max_points and points_earned
          // This might need adjustment based on how standings points are calculated on backend
          categories['Regular Season Standings'].items.push(sp);
          categories['Regular Season Standings'].pointsEarned += sp.points || 0;
          categories['Regular Season Standings'].totalPossiblePoints += 3;
        });
      }


      // Process Answers (non-IST questions)
      for (const ans of answers) {
        if (ans.question_type === 'inseasontournamentquestion') continue; // Exclude IST questions

        const questionDetails = questionMap.get(ans.question); // 'ans.question' is the question ID
        if (!questionDetails) continue; // Skip if question details not found

        let categoryName = 'Misc Questions'; // Default for most questions
        if (ans.question_type === QUESTION_TYPES.SUPERLATIVE_QUESTION) {
          categoryName = 'Superlative Questions';
        } else if (ans.question_type === QUESTION_TYPES.REGULAR_SEASON_STANDINGS) {
          // Handled by standings predictions already
          continue;
        }

        if (!categories[categoryName]) {
          categories[categoryName] = {
            totalPossiblePoints: 0,
            pointsEarned: 0,
            items: [],
          };
        }

        categories[categoryName].items.push(ans);
        categories[categoryName].pointsEarned += ans.points_earned || 0;
        categories[categoryName].totalPossiblePoints += questionDetails.max_points || 0;
      }
      
      // Calculate overall accuracy and total points
      let overallPointsEarned = 0;
      let overallTotalPossiblePoints = 0;

      Object.values(categories).forEach(cat => {
        overallPointsEarned += cat.pointsEarned;
        overallTotalPossiblePoints += cat.totalPossiblePoints;
      });

      setData({
        username: effectiveUsername,
        categories,
        overallPointsEarned,
        overallTotalPossiblePoints,
      });

    } catch (err) {
      console.error(`Error fetching data for ${effectiveUsername}:`, err);
      setError('Failed to load user data.');
    } finally {
      setLoading(false);
    }
  }, [effectiveUsername, effectiveSeason]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export default useUserAnswers;