import { useQuery, useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo } from 'react';

const QUESTION_CATEGORIES = {
  superlative: 'Superlatives',
  prop: 'Props & Totals',
  player_stat: 'Props & Totals',
  head_to_head: 'Props & Totals',
  nba_finals: 'Props & Totals',
  ist: 'In-Season Tournament',
};

const useUserSubmissions = (seasonSlug, isAuthenticated) => {
  const results = useQueries({
    queries: [
      {
        queryKey: ['questions', seasonSlug],
        queryFn: async () => {
          const res = await axios.get(`/api/v2/submissions/questions/${seasonSlug}`);
          return res.data;
        },
        enabled: !!seasonSlug,
      },
      {
        queryKey: ['user-standings', seasonSlug],
        queryFn: async () => {
          const res = await axios.get(`/api/v2/submissions/standings/${seasonSlug}`);
          return res.data;
        },
        enabled: isAuthenticated && !!seasonSlug,
      },
      {
        queryKey: ['user-answers', seasonSlug],
        queryFn: async () => {
          const res = await axios.get(`/api/v2/submissions/answers/${seasonSlug}`);
          return res.data;
        },
        enabled: isAuthenticated && !!seasonSlug,
      },
    ],
  });

  const questionsQuery = results[0];
  const standingsQuery = results[1];
  const answersQuery = results[2];

  const submissionData = useMemo(() => {
    const data = {
      standings: {
        east: standingsQuery.data?.east || [],
        west: standingsQuery.data?.west || [],
      },
      sections: [],
    };

    if (questionsQuery.data?.questions) {
      const sectionsMap = new Map();

      for (const question of questionsQuery.data.questions) {
        const category = QUESTION_CATEGORIES[question.question_type] || 'Other';
        if (!sectionsMap.has(category)) {
          sectionsMap.set(category, { label: category, total: 0, completed: 0 });
        }
        sectionsMap.get(category).total += 1;
      }

      if (answersQuery.data?.answers) {
        for (const answer of answersQuery.data.answers) {
          const question = questionsQuery.data.questions.find(q => q.id === answer.question_id);
          if (question) {
            const category = QUESTION_CATEGORIES[question.question_type];
            if (sectionsMap.has(category)) {
              sectionsMap.get(category).completed += 1;
            }
          }
        }
      }
      data.sections = Array.from(sectionsMap.values());
    }

    return data;
  }, [questionsQuery.data, standingsQuery.data, answersQuery.data]);

  const isLoading = results.some(query => query.isLoading);

  return {
    submissionData,
    isLoading,
  };
};

export default useUserSubmissions;