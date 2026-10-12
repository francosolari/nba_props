// File: frontend/src/features/admin/grading/components/GradingQuestionsTab.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, Users, X } from 'lucide-react';
import NBAStandings from '../../../../components/NBAStandings';
import GradingStatsRow from './GradingStatsRow';
import GradingCategoryAccordion from './GradingCategoryAccordion';

const GradingQuestionsTab = ({
  questionsData,
  selectedSeason,
  expandedQuestionCategories,
  setExpandedQuestionCategories,
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

  const openTotal = questionsData?.questions?.filter((q) => !q.has_correct_answer).length || 0;
  const [showOnlyOpen, setShowOnlyOpen] = useState(null);
  const onlyOpen = showOnlyOpen ?? openTotal > 0;

  // On first load, open the categories that still need answers so the work
  // is one tap away instead of hidden behind collapsed sections.
  const autoExpanded = useRef(false);
  useEffect(() => {
    if (autoExpanded.current || !questionsData?.questions) return;
    autoExpanded.current = true;
    const pending = Object.entries(questionsByCategory)
      .filter(([, qs]) => qs.some((q) => !q.has_correct_answer))
      .map(([name]) => name);
    if (pending.length) setExpandedQuestionCategories(new Set(pending));
  }, [questionsData, questionsByCategory, setExpandedQuestionCategories]);

  const categories = Object.entries(questionsByCategory)
    .map(([name, qs]) => [name, qs, onlyOpen ? qs.filter((q) => !q.has_correct_answer) : qs])
    .filter(([, , visible]) => visible.length > 0);
  const allExpanded = categories.length > 0 && categories.every(([name]) => expandedQuestionCategories.has(name));

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

      <div className="court-admin-grading-tools">
        <div className="court-admin-filter" role="radiogroup" aria-label="Show questions">
          <button type="button" role="radio" aria-checked={onlyOpen} onClick={() => setShowOnlyOpen(true)} className={onlyOpen ? 'is-active' : ''}>
            Needs answer<span>{openTotal}</span>
          </button>
          <button type="button" role="radio" aria-checked={!onlyOpen} onClick={() => setShowOnlyOpen(false)} className={!onlyOpen ? 'is-active' : ''}>
            All<span>{questionsData?.questions?.length || 0}</span>
          </button>
        </div>
        {categories.length > 0 && (
          <button
            type="button"
            className="court-admin-link"
            onClick={() => setExpandedQuestionCategories(allExpanded ? new Set() : new Set(categories.map(([name]) => name)))}
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      {onlyOpen && openTotal === 0 && questionsData?.total_questions > 0 && (
        <div className="court-admin-list__empty court-admin-section">
          Every question has an answer. Run grading to score them, or{' '}
          <button type="button" className="court-admin-link" onClick={() => setShowOnlyOpen(false)}>show all</button>.
        </div>
      )}

      <div className="space-y-3">
        {categories.map(([categoryName, questions, visibleQuestions]) => (
          <GradingCategoryAccordion
            key={categoryName}
            categoryName={categoryName}
            questions={questions}
            visibleQuestions={visibleQuestions}
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
