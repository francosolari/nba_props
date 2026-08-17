// File: frontend/src/pages/AdminGradingPanel.jsx
import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { ClipboardList, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  useGradingQuestions,
  useGradingAudit,
  useGradingSeasons,
  useGradingPlayers,
  useManualGradeMutation,
  useRunGradingMutation,
} from '../hooks/admin/useAdminGrading';
import { useGradingQuestionEditor } from '../hooks/admin/useGradingQuestionEditor';
import GradingControls from '../features/admin/grading/components/GradingControls';
import GradingQuestionsTab from '../features/admin/grading/components/GradingQuestionsTab';
import AuditTab from '../features/admin/grading/components/AuditTab';

const AdminGradingPanel = ({ seasonSlug = 'current' }) => {
  const toast = useToast();
  const [selectedSeason, setSelectedSeason] = useState(seasonSlug);

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const subtabParam = params.get('subtab');
    return ['grading', 'audit'].includes(subtabParam) ? subtabParam : 'grading';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Map());
  const [expandedQuestionCategories, setExpandedQuestionCategories] = useState(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState(new Set());
  const [bulkGradeMode, setBulkGradeMode] = useState(false);
  const [showStandings, setShowStandings] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('subtab', activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab]);

  const { data: questionsData, isLoading: questionsLoading, error: questionsError, refetch: refetchQuestions } = useGradingQuestions(selectedSeason, activeTab === 'grading');
  const { data: auditData, isLoading: auditLoading, error: auditError, refetch: refetchAudit } = useGradingAudit(selectedSeason, activeTab === 'audit');
  const { data: seasonsData } = useGradingSeasons();
  const { playerOptions, playerNameById } = useGradingPlayers(activeTab === 'grading');

  const editor = useGradingQuestionEditor({ playerOptions, playerNameById, toast });

  const manualGradeMutation = useManualGradeMutation(() => setSelectedAnswers(new Set()));
  const runGradingMutation = useRunGradingMutation();

  const handleGradeAnswer = async (answerId, isCorrect, pointsOverride = null, correctAnswer = null) => {
    try {
      await manualGradeMutation.mutateAsync({ answerId, isCorrect, pointsOverride, correctAnswer });
      toast.success('Answer graded successfully');
    } catch (error) {
      console.error('Error grading answer:', error);
      toast.error(`Failed to grade answer: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleBulkGrade = async (isCorrect) => {
    if (selectedAnswers.size === 0) {
      toast.warning('No answers selected');
      return;
    }
    if (!window.confirm(`Mark ${selectedAnswers.size} answers as ${isCorrect ? 'correct' : 'incorrect'}?`)) {
      return;
    }
    try {
      await Promise.all(
        Array.from(selectedAnswers).map((answerId) => (
          manualGradeMutation.mutateAsync({ answerId, isCorrect, pointsOverride: null, correctAnswer: null })
        )),
      );
      toast.success(`Successfully graded ${selectedAnswers.size} answers`);
    } catch (error) {
      console.error('Error in bulk grading:', error);
      toast.error(`Bulk grading failed: ${error.message}`);
    }
  };

  const handleRunGradingCommand = async (command) => {
    try {
      const result = await runGradingMutation.mutateAsync({ command, seasonSlug: selectedSeason });
      toast.success(`Success!\n\n${result.message}`, 7000);
      if (command === 'update_season_standings') setShowStandings(true);
    } catch (error) {
      console.error('Error running grading command:', error);
      const errorMsg = error.response?.data?.error || error.message;
      toast.error(`Command Failed\n\n${errorMsg}\n\nTip: Make sure you're running this locally where NBA API is accessible.`, 10000);
    }
  };

  const toggleUser = (userId) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleCategory = (userId, categoryName) => {
    setExpandedCategories((prev) => {
      const next = new Map(prev);
      const key = `${userId}-${categoryName}`;
      if (next.has(key)) next.delete(key); else next.set(key, true);
      return next;
    });
  };

  const toggleQuestionCategory = (categoryName) => {
    setExpandedQuestionCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) next.delete(categoryName); else next.add(categoryName);
      return next;
    });
  };

  const toggleAnswerSelection = (answerId) => {
    setSelectedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(answerId)) next.delete(answerId); else next.add(answerId);
      return next;
    });
  };

  const isLoading = activeTab === 'grading' ? questionsLoading : auditLoading;
  const error = activeTab === 'grading' ? questionsError : auditError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--court-steel)]">
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[var(--court-danger)] text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="court-admin-content">
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Admin Grading Panel</h1>
        <p className="text-[var(--court-steel)]">
          {activeTab === 'grading' ? 'Set correct answers for questions and run grading' : 'Review user submissions and manually grade answers'}
          {' '}&bull; {questionsData?.season_year || auditData?.season_year || selectedSeason}
        </p>
      </div>

      <div className="court-profile-tabs mb-6" style={{ maxWidth: 420 }}>
        <button type="button" onClick={() => setActiveTab('grading')} className={activeTab === 'grading' ? 'is-active' : ''}>
          <ClipboardList aria-hidden="true" className="w-4 h-4" />
          <span>Question Grading</span>
        </button>
        <button type="button" onClick={() => setActiveTab('audit')} className={activeTab === 'audit' ? 'is-active' : ''}>
          <ShieldCheck aria-hidden="true" className="w-4 h-4" />
          <span>Results Audit</span>
        </button>
      </div>

      <GradingControls
        activeTab={activeTab}
        selectedSeason={selectedSeason}
        setSelectedSeason={setSelectedSeason}
        seasonsData={seasonsData}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        bulkGradeMode={bulkGradeMode}
        setBulkGradeMode={setBulkGradeMode}
        selectedAnswers={selectedAnswers}
        setSelectedAnswers={setSelectedAnswers}
        onBulkGrade={handleBulkGrade}
        onRefresh={() => (activeTab === 'grading' ? refetchQuestions() : refetchAudit())}
        isLoading={isLoading}
        runGradingMutation={runGradingMutation}
        onRunGradingCommand={handleRunGradingCommand}
        showStandings={showStandings}
        setShowStandings={setShowStandings}
      />

      {activeTab === 'grading' && (
        <GradingQuestionsTab
          questionsData={questionsData}
          selectedSeason={selectedSeason}
          expandedQuestionCategories={expandedQuestionCategories}
          onToggleCategory={toggleQuestionCategory}
          editor={editor}
          playerOptions={playerOptions}
          showStandings={showStandings}
          setShowStandings={setShowStandings}
        />
      )}

      {activeTab === 'audit' && (
        <AuditTab
          auditData={auditData}
          searchQuery={searchQuery}
          expandedUsers={expandedUsers}
          onToggleUser={toggleUser}
          expandedCategories={expandedCategories}
          onToggleCategory={toggleCategory}
          bulkGradeMode={bulkGradeMode}
          selectedAnswers={selectedAnswers}
          onToggleAnswerSelection={toggleAnswerSelection}
          onGradeAnswer={handleGradeAnswer}
        />
      )}
    </div>
  );
};

export default AdminGradingPanel;
