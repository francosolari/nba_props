// File: frontend/src/features/admin/grading/components/GradingQuestionsTab.jsx
import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Lock, Users, X } from 'lucide-react';
import NBAStandings from '../../../../components/NBAStandings';
import GradingStatsRow from './GradingStatsRow';
import GradingCategoryAccordion from './GradingCategoryAccordion';

const GradingQuestionsTab = ({
  questionsData,
  selectedSeason,
  expandedQuestionCategories,
  onToggleCategory,
  editor,
  playerOptions,
  showStandings,
  setShowStandings,
}) => {
  const questionsByCategory = useMemo(() => {
    if (!questionsData?.questions) return {};
    const grouped = {};
    questionsData.questions.forEach((q) => {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push(q);
    });
    return grouped;
  }, [questionsData]);

  const stats = [
    { icon: AlertCircle, value: questionsData?.total_questions || 0, label: 'Total Questions', colorVar: '--court-blue' },
    { icon: CheckCircle2, value: questionsData?.questions?.filter((q) => q.has_correct_answer).length || 0, label: 'Answers Set', colorVar: '--court-success' },
    { icon: Lock, value: questionsData?.questions?.filter((q) => q.is_finalized).length || 0, label: 'Finalized', colorVar: '--court-warning' },
    { icon: Users, value: questionsData?.questions?.reduce((sum, q) => sum + q.submission_count, 0) || 0, label: 'Total Submissions', colorVar: '--court-blue' },
  ];

  return (
    <div>
      <GradingStatsRow stats={stats} />

      {showStandings && (
        <div className="court-admin-section mb-6">
          <div className="court-admin-section__head">
            <span>Updated NBA Standings</span>
            <button type="button" onClick={() => setShowStandings(false)} className="text-white/80 hover:text-white" title="Hide standings">
              <X className="w-4 h-4" />
            </button>
          </div>
          <NBAStandings seasonSlug={selectedSeason} />
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(questionsByCategory).map(([categoryName, questions]) => (
          <GradingCategoryAccordion
            key={categoryName}
            categoryName={categoryName}
            questions={questions}
            isExpanded={expandedQuestionCategories.has(categoryName)}
            onToggle={() => onToggleCategory(categoryName)}
            editor={editor}
            playerOptions={playerOptions}
          />
        ))}
      </div>

      {questionsData?.total_questions === 0 && (
        <div className="text-center py-12 text-[var(--court-steel)]">
          No questions found for this season.
        </div>
      )}
    </div>
  );
};

export default GradingQuestionsTab;
