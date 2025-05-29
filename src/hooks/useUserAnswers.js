// src/hooks/useUserAnswers.js

import { useState, useEffect, useCallback } from 'react';

// Map your question_type values to human-friendly category labels
const CATEGORY_MAP = {
  standings: 'Standings',
  nbafinalspredictionquestion: 'NBA Finals',
  superlativequestion: 'Awards',
  propquestion: 'Props',
  headtoheadquestion: 'Head-to-Head',
};

// Helpers to read from your Django mount point
function getSeasonSlugFromDOM() {
  const container = document.getElementById('predictions-table-root');
  return container?.dataset.seasonSlug || '';
}
function getLoggedInUsernameFromDOM() {
  const container = document.getElementById('predictions-table-root');
  return container?.dataset.loggedInUsername || '';
}

export default function useUserAnswers(username, seasonSlug) {
  // If someone passes in username/seasonSlug, use it;
  // otherwise, fall back to what’s in the DOM.
  const effectiveUsername = username || getLoggedInUsernameFromDOM();
  const effectiveSeason = seasonSlug || getSeasonSlugFromDOM();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    // Bail early if we still don’t have a username or season
    if (!effectiveUsername || !effectiveSeason) return;

    setLoading(true);
    setError(null);
    try {
      // 1) Fetch per-question answers
      const ansRes = await fetch(
        `/api/user-answers/${encodeURIComponent(
          effectiveUsername
        )}/?season=${effectiveSeason}`
      );
      const { answers } = await ansRes.json();

      // 2) Fetch standings predictions
      const standRes = await fetch(
        `/api/user-predictions/${effectiveSeason}/?username=${encodeURIComponent(
          effectiveUsername
        )}`
      );
      const { predictions: standings } = await standRes.json();

      // 3) Group answers into categories
      const categories = {};
      for (const ans of answers) {
        if (ans.question_type === 'inseasontournamentquestion') continue;
        const key = [
          'propquestion',
          'headtoheadquestion',
          'superlativequestion',
          'nbafinalspredictionquestion',
        ].includes(ans.question_type)
          ? ans.question_type
          : 'propquestion';
        const label = CATEGORY_MAP[key] || 'Other';
        categories[label] = categories[label] || { total: 0, items: [] };
        categories[label].items.push(ans);
        categories[label].total += ans.points_earned;
      }

      // 4) Finally, inject your “Standings” category
      const standingsCat = {
        total: standings.reduce((sum, p) => sum + p.points, 0),
        items: standings.map((p) => ({
          question_text: `${p.team_name} → pos ${p.predicted_position}`,
          points_earned: p.points,
        })),
      };
      categories['Standings'] = standingsCat;

      setData({ username: effectiveUsername, categories });
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [effectiveUsername, effectiveSeason]);

  // Run the loader whenever the inputs change or once the DOM values become available
  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}