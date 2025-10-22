// File: frontend/src/pages/AdminGradingPanelNew.jsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Search,
  AlertCircle,
  Award,
  Trophy,
  TrendingUp,
  Users,
  RefreshCw,
  CheckSquare,
  Square,
  Edit2,
  Save,
  X
} from 'lucide-react';

const AdminGradingPanel = ({ seasonSlug = 'current' }) => {
  const [selectedSeason, setSelectedSeason] = useState(seasonSlug);
  const [activeTab, setActiveTab] = useState('grading'); // 'grading' or 'audit'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Map());
  const [expandedQuestionCategories, setExpandedQuestionCategories] = useState(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState(new Set());
  const [bulkGradeMode, setBulkGradeMode] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editedAnswer, setEditedAnswer] = useState('');

  const queryClient = useQueryClient();

  // Fetch questions for grading
  const { data: questionsData, isLoading: questionsLoading, error: questionsError, refetch: refetchQuestions } = useQuery({
    queryKey: ['grading-questions', selectedSeason],
    queryFn: async () => {
      const res = await axios.get(`/api/v2/admin/grading/questions/${selectedSeason}`);
      return res.data;
    },
    staleTime: 30000,
    enabled: activeTab === 'grading',
  });

  // Fetch grading audit data
  const { data: auditData, isLoading: auditLoading, error: auditError, refetch: refetchAudit } = useQuery({
    queryKey: ['grading-audit', selectedSeason],
    queryFn: async () => {
      const res = await axios.get(`/api/v2/admin/grading/audit/${selectedSeason}`);
      return res.data;
    },
    staleTime: 30000,
    enabled: activeTab === 'audit',
  });

  // Fetch seasons
  const { data: seasonsData } = useQuery({
    queryKey: ['seasons', 'all'],
    queryFn: async () => {
      const res = await axios.get('/api/v2/seasons/user-participated');
      return res.data;
    },
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, correctAnswer, isFinalized }) => {
      const res = await axios.post('/api/v2/admin/grading/update-question', {
        question_id: questionId,
        correct_answer: correctAnswer,
        is_finalized: isFinalized,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grading-questions']);
      setEditingQuestion(null);
      setEditedAnswer('');
    },
  });

  // Manual grade mutation
  const manualGradeMutation = useMutation({
    mutationFn: async ({ answerId, isCorrect, pointsOverride, correctAnswer }) => {
      const res = await axios.post('/api/v2/admin/grading/grade-manual', {
        answer_id: answerId,
        is_correct: isCorrect,
        points_override: pointsOverride,
        correct_answer: correctAnswer,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grading-audit']);
      setSelectedAnswers(new Set());
    },
  });

  // Run grading command mutation
  const runGradingMutation = useMutation({
    mutationFn: async ({ command, seasonSlug }) => {
      const res = await axios.post('/api/v2/admin/grading/run-grading-command', {
        command,
        season_slug: seasonSlug,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grading-audit']);
      queryClient.invalidateQueries(['grading-questions']);
    },
  });

  // Group questions by category
  const questionsByCategory = useMemo(() => {
    if (!questionsData?.questions) return {};
    const grouped = {};
    questionsData.questions.forEach(q => {
      if (!grouped[q.category]) {
        grouped[q.category] = [];
      }
      grouped[q.category].push(q);
    });
    return grouped;
  }, [questionsData]);

  const filteredUsers = useMemo(() => {
    if (!auditData?.users) return [];
    if (!searchQuery.trim()) return auditData.users;

    const query = searchQuery.toLowerCase();
    return auditData.users.filter(user =>
      user.username.toLowerCase().includes(query) ||
      user.display_name.toLowerCase().includes(query)
    );
  }, [auditData, searchQuery]);

  const handleUpdateQuestion = async (questionId, correctAnswer, isFinalized = null) => {
    try {
      await updateQuestionMutation.mutateAsync({ questionId, correctAnswer, isFinalized });
      alert('✓ Question updated successfully!\n\nRun grading to apply this answer to all user submissions.');
    } catch (error) {
      console.error('Error updating question:', error);
      alert(`✗ Failed to update question: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question.question_id);
    setEditedAnswer(question.correct_answer || '');
  };

  const handleSaveQuestion = async (question) => {
    if (!editedAnswer.trim()) {
      alert('Please enter a correct answer');
      return;
    }
    await handleUpdateQuestion(question.question_id, editedAnswer);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditedAnswer('');
  };

  const handleGradeAnswer = async (answerId, isCorrect, pointsOverride = null, correctAnswer = null) => {
    try {
      await manualGradeMutation.mutateAsync({ answerId, isCorrect, pointsOverride, correctAnswer });
    } catch (error) {
      console.error('Error grading answer:', error);
      alert(`Failed to grade answer: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleBulkGrade = async (isCorrect) => {
    if (selectedAnswers.size === 0) {
      alert('No answers selected');
      return;
    }

    if (!window.confirm(`Mark ${selectedAnswers.size} answers as ${isCorrect ? 'correct' : 'incorrect'}?`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedAnswers).map(answerId =>
          manualGradeMutation.mutateAsync({ answerId, isCorrect, pointsOverride: null, correctAnswer: null })
        )
      );
      alert(`Successfully graded ${selectedAnswers.size} answers`);
    } catch (error) {
      console.error('Error in bulk grading:', error);
      alert(`Bulk grading failed: ${error.message}`);
    }
  };

  const handleRunGradingCommand = async (command) => {
    const commandNames = {
      'update_season_standings': 'Update Season Standings',
      'scrape_award_odds': 'Scrape Award Odds',
      'grade_props_answers': 'Grade Props Answers',
      'grade_standing_predictions': 'Grade Standing Predictions',
      'grade_ist_predictions': 'Grade IST Predictions'
    };

    const friendlyName = commandNames[command] || command;

    if (!window.confirm(
      `Run "${friendlyName}" for ${selectedSeason}?\n\n` +
      `Note: This may fail on production if NBA API is blocked.\n` +
      `This operation may take several seconds.`
    )) {
      return;
    }

    try {
      const result = await runGradingMutation.mutateAsync({ command, seasonSlug: selectedSeason });
      alert(`✓ Success!\n\n${result.message}`);
    } catch (error) {
      console.error('Error running grading command:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`✗ Command Failed\n\n${errorMsg}\n\nTip: Make sure you're running this locally where NBA API is accessible.`);
    }
  };

  const toggleUser = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleCategory = (userId, categoryName) => {
    setExpandedCategories(prev => {
      const next = new Map(prev);
      const key = `${userId}-${categoryName}`;
      if (next.has(key)) next.delete(key);
      else next.set(key, true);
      return next;
    });
  };

  const toggleQuestionCategory = (categoryName) => {
    setExpandedQuestionCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  };

  const toggleAnswerSelection = (answerId) => {
    setSelectedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(answerId)) next.delete(answerId);
      else next.add(answerId);
      return next;
    });
  };

  const getCategoryIcon = (categoryName) => {
    if (categoryName.includes('Award') || categoryName.includes('Superlative')) return <Award className="w-4 h-4" />;
    if (categoryName.includes('Standings')) return <TrendingUp className="w-4 h-4" />;
    if (categoryName.includes('Tournament')) return <Trophy className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  const isLoading = activeTab === 'grading' ? questionsLoading : auditLoading;
  const error = activeTab === 'grading' ? questionsError : auditError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-rose-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Grading Panel</h1>
          <p className="text-slate-400">
            {activeTab === 'grading'
              ? 'Set correct answers for questions and run grading'
              : 'Review user submissions and manually grade answers'
            } • {questionsData?.season_year || auditData?.season_year || selectedSeason}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('grading')}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === 'grading'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            📝 Question Grading
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === 'audit'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            📊 Results Audit
          </button>
        </div>

        {/* Controls */}
        <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-3xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Season Selector */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Season</label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full rounded-xl border border-slate-700/40 bg-slate-900/70 px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              >
                {seasonsData?.map(season => (
                  <option key={season.slug} value={season.slug}>{season.year}</option>
                ))}
              </select>
            </div>

            {/* Search (only for audit tab) */}
            {activeTab === 'audit' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Search Users</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Username or name..."
                    className="w-full rounded-xl border border-slate-700/40 bg-slate-900/70 pl-10 pr-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  />
                </div>
              </div>
            )}

            {/* Bulk Actions (only for audit tab) */}
            {activeTab === 'audit' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Bulk Actions</label>
                <button
                  onClick={() => setBulkGradeMode(!bulkGradeMode)}
                  className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition ${
                    bulkGradeMode
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  {bulkGradeMode ? 'Exit Bulk Mode' : 'Bulk Grade Mode'}
                </button>
              </div>
            )}

            {/* Refresh */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Actions</label>
              <button
                onClick={() => activeTab === 'grading' ? refetchQuestions() : refetchAudit()}
                disabled={isLoading}
                className="w-full rounded-xl bg-slate-800/70 text-slate-300 hover:bg-slate-700/80 px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Bulk Grade Buttons (only for audit tab) */}
          {activeTab === 'audit' && bulkGradeMode && selectedAnswers.size > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/40 flex gap-3">
              <span className="text-sm text-slate-400">{selectedAnswers.size} selected</span>
              <button
                onClick={() => handleBulkGrade(true)}
                className="rounded-full bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 px-4 py-1.5 text-sm font-medium transition"
              >
                Mark Correct
              </button>
              <button
                onClick={() => handleBulkGrade(false)}
                className="rounded-full bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 px-4 py-1.5 text-sm font-medium transition"
              >
                Mark Incorrect
              </button>
              <button
                onClick={() => setSelectedAnswers(new Set())}
                className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 px-4 py-1.5 text-sm font-medium transition"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Management Commands */}
          <div className="mt-4 pt-4 border-t border-slate-700/40">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">
                <strong>Management Commands</strong> (LOCAL ONLY - will fail if NBA API blocked)
              </p>
              {runGradingMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Running command...
                </div>
              )}
            </div>

            {/* Data Update Commands */}
            <div className="mb-3">
              <p className="text-xs text-slate-400 mb-2">Update Data:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleRunGradingCommand('update_season_standings')}
                  disabled={runGradingMutation.isPending}
                  className="rounded-full bg-emerald-500/20 text-emerald-200 hover:bg-emerald-400/20 px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                  title="Fetch latest standings from NBA API"
                >
                  🔄 Update Standings
                </button>
                <button
                  onClick={() => handleRunGradingCommand('scrape_award_odds')}
                  disabled={runGradingMutation.isPending}
                  className="rounded-full bg-amber-500/20 text-amber-200 hover:bg-amber-400/20 px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                  title="Scrape latest award odds from DraftKings"
                >
                  🎯 Scrape Award Odds
                </button>
              </div>
            </div>

            {/* Grading Commands */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Run Grading:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleRunGradingCommand('grade_props_answers')}
                  disabled={runGradingMutation.isPending}
                  className="rounded-full bg-blue-500/20 text-blue-200 hover:bg-blue-400/20 px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                  title="Grade all prop and award questions"
                >
                  ✓ Grade Props
                </button>
                <button
                  onClick={() => handleRunGradingCommand('grade_standing_predictions')}
                  disabled={runGradingMutation.isPending}
                  className="rounded-full bg-blue-500/20 text-blue-200 hover:bg-blue-400/20 px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                  title="Grade standings predictions"
                >
                  ✓ Grade Standings
                </button>
                <button
                  onClick={() => handleRunGradingCommand('grade_ist_predictions')}
                  disabled={runGradingMutation.isPending}
                  className="rounded-full bg-blue-500/20 text-blue-200 hover:bg-blue-400/20 px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                  title="Grade In-Season Tournament predictions"
                >
                  ✓ Grade IST
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* GRADING TAB CONTENT */}
        {activeTab === 'grading' && (
          <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold">{questionsData?.total_questions || 0}</div>
                    <div className="text-xs text-slate-400">Total Questions</div>
                  </div>
                </div>
              </div>
              <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <div>
                    <div className="text-2xl font-bold">
                      {questionsData?.questions?.filter(q => q.has_correct_answer).length || 0}
                    </div>
                    <div className="text-xs text-slate-400">Answers Set</div>
                  </div>
                </div>
              </div>
              <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Lock className="w-8 h-8 text-amber-400" />
                  <div>
                    <div className="text-2xl font-bold">
                      {questionsData?.questions?.filter(q => q.is_finalized).length || 0}
                    </div>
                    <div className="text-xs text-slate-400">Finalized</div>
                  </div>
                </div>
              </div>
              <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-purple-400" />
                  <div>
                    <div className="text-2xl font-bold">
                      {questionsData?.questions?.reduce((sum, q) => sum + q.submission_count, 0) || 0}
                    </div>
                    <div className="text-xs text-slate-400">Total Submissions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions by Category */}
            <div className="space-y-3">
              {Object.entries(questionsByCategory).map(([categoryName, questions]) => {
                const isExpanded = expandedQuestionCategories.has(categoryName);
                const answeredCount = questions.filter(q => q.has_correct_answer).length;

                return (
                  <div
                    key={categoryName}
                    className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleQuestionCategory(categoryName)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                        {getCategoryIcon(categoryName)}
                        <div className="text-left">
                          <div className="font-semibold text-lg">{categoryName}</div>
                          <div className="text-sm text-slate-400">
                            {answeredCount} / {questions.length} answered
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">{questions.length} questions</div>
                      </div>
                    </button>

                    {/* Expanded Questions */}
                    {isExpanded && (
                      <div className="border-t border-slate-700/40 p-6 space-y-3">
                        {questions.map(question => {
                          const isEditing = editingQuestion === question.question_id;

                          return (
                            <div
                              key={question.question_id}
                              className={`border rounded-xl p-4 transition ${
                                question.has_correct_answer
                                  ? 'border-emerald-500/30 bg-emerald-500/5'
                                  : 'border-slate-700/30 bg-slate-900/40'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="text-sm font-medium">{question.question_text}</div>
                                    {question.is_finalized && (
                                      <Lock className="w-4 h-4 text-amber-400" title="Finalized" />
                                    )}
                                  </div>

                                  <div className="text-xs text-slate-400 space-y-1">
                                    <div>Type: {question.question_type}</div>
                                    <div>Points: {question.point_value}</div>
                                    <div>Submissions: {question.submission_count}</div>
                                  </div>

                                  {/* Edit Answer */}
                                  <div className="mt-3">
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        {/* Show line for over/under questions */}
                                        {question.input_type === 'over_under' && question.line && (
                                          <div className="text-xs text-slate-400">
                                            Line: {question.line} {question.related_player_name && `(${question.related_player_name})`}
                                          </div>
                                        )}

                                        {question.input_type === 'yes_no' && question.related_player_name && (
                                          <div className="text-xs text-slate-400">
                                            Player: {question.related_player_name}
                                          </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                          {/* Yes/No Radio Buttons */}
                                          {question.input_type === 'yes_no' && (
                                            <div className="flex gap-3">
                                              {question.choices?.map(choice => (
                                                <label key={choice} className="flex items-center gap-2 cursor-pointer">
                                                  <input
                                                    type="radio"
                                                    name={`q-${question.question_id}`}
                                                    value={choice}
                                                    checked={editedAnswer === choice}
                                                    onChange={(e) => setEditedAnswer(e.target.value)}
                                                    className="w-4 h-4 text-blue-500"
                                                  />
                                                  <span className="text-sm text-slate-300">{choice}</span>
                                                </label>
                                              ))}
                                            </div>
                                          )}

                                          {/* Over/Under Radio Buttons */}
                                          {question.input_type === 'over_under' && (
                                            <div className="flex gap-3">
                                              {question.choices?.map(choice => (
                                                <label key={choice} className="flex items-center gap-2 cursor-pointer">
                                                  <input
                                                    type="radio"
                                                    name={`q-${question.question_id}`}
                                                    value={choice}
                                                    checked={editedAnswer === choice}
                                                    onChange={(e) => setEditedAnswer(e.target.value)}
                                                    className="w-4 h-4 text-blue-500"
                                                  />
                                                  <span className="text-sm text-slate-300">{choice}</span>
                                                </label>
                                              ))}
                                            </div>
                                          )}

                                          {/* Team Choice Dropdown */}
                                          {question.input_type === 'team_choice' && (
                                            <select
                                              value={editedAnswer}
                                              onChange={(e) => setEditedAnswer(e.target.value)}
                                              className="flex-1 rounded-lg border border-slate-700/40 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                              autoFocus
                                            >
                                              <option value="">Select team...</option>
                                              {question.choices?.map(choice => (
                                                <option key={choice} value={choice}>{choice}</option>
                                              ))}
                                            </select>
                                          )}

                                          {/* Player Search (with suggestions if available) */}
                                          {question.input_type === 'player_search' && (
                                            <div className="flex-1">
                                              <input
                                                type="text"
                                                value={editedAnswer}
                                                onChange={(e) => setEditedAnswer(e.target.value)}
                                                placeholder="Enter player name..."
                                                list={`players-${question.question_id}`}
                                                className="w-full rounded-lg border border-slate-700/40 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                                autoFocus
                                              />
                                              {question.choices && question.choices.length > 0 && (
                                                <datalist id={`players-${question.question_id}`}>
                                                  {question.choices.map(choice => (
                                                    <option key={choice} value={choice} />
                                                  ))}
                                                </datalist>
                                              )}
                                            </div>
                                          )}

                                          {/* Regular Text Input (fallback) */}
                                          {question.input_type === 'text' && (
                                            <input
                                              type="text"
                                              value={editedAnswer}
                                              onChange={(e) => setEditedAnswer(e.target.value)}
                                              placeholder="Enter correct answer..."
                                              className="flex-1 rounded-lg border border-slate-700/40 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                              autoFocus
                                            />
                                          )}

                                          {/* Save/Cancel buttons (for non-radio inputs) */}
                                          {question.input_type !== 'yes_no' && question.input_type !== 'over_under' && (
                                            <>
                                              <button
                                                onClick={() => handleSaveQuestion(question)}
                                                disabled={updateQuestionMutation.isPending}
                                                className="rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-3 py-2 text-sm"
                                                title="Save"
                                              >
                                                <Save className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={handleCancelEdit}
                                                className="rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 px-3 py-2 text-sm"
                                                title="Cancel"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </>
                                          )}
                                        </div>

                                        {/* Auto-save for radio buttons */}
                                        {(question.input_type === 'yes_no' || question.input_type === 'over_under') && editedAnswer && (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleSaveQuestion(question)}
                                              disabled={updateQuestionMutation.isPending}
                                              className="rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-3 py-1.5 text-xs flex items-center gap-1"
                                            >
                                              <Save className="w-3 h-3" />
                                              Save
                                            </button>
                                            <button
                                              onClick={handleCancelEdit}
                                              className="rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 px-3 py-1.5 text-xs flex items-center gap-1"
                                            >
                                              <X className="w-3 h-3" />
                                              Cancel
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                          <span className="text-xs text-slate-500">Correct Answer: </span>
                                          <span className={`text-sm ${question.has_correct_answer ? 'text-emerald-300' : 'text-slate-400'}`}>
                                            {question.correct_answer || '(not set)'}
                                          </span>
                                          {/* Show line for over/under */}
                                          {question.input_type === 'over_under' && question.line && (
                                            <span className="text-xs text-slate-500 ml-2">
                                              (Line: {question.line})
                                            </span>
                                          )}
                                          {/* Show related player */}
                                          {question.related_player_name && (
                                            <span className="text-xs text-slate-500 ml-2">
                                              ({question.related_player_name})
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => handleEditQuestion(question)}
                                          className="rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-3 py-1.5 text-xs flex items-center gap-1"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          Edit
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Status Indicator */}
                                <div className="flex flex-col items-center gap-2">
                                  {question.has_correct_answer ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                  ) : (
                                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {questionsData?.total_questions === 0 && (
              <div className="text-center py-12 text-slate-400">
                No questions found for this season.
              </div>
            )}
          </div>
        )}

        {/* AUDIT TAB CONTENT */}
        {activeTab === 'audit' && (
          <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold">{filteredUsers.length}</div>
                    <div className="text-xs text-slate-400">Total Users</div>
                  </div>
                </div>
              </div>
              <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-amber-400" />
                  <div>
                    <div className="text-2xl font-bold">
                      {filteredUsers[0]?.total_points?.toFixed(1) || 0}
                    </div>
                    <div className="text-xs text-slate-400">Top Score</div>
                  </div>
                </div>
              </div>
              <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <div>
                    <div className="text-2xl font-bold">
                      {filteredUsers.reduce((sum, u) =>
                        sum + u.categories.reduce((s, c) => s + c.correct_count, 0), 0
                      )}
                    </div>
                    <div className="text-xs text-slate-400">Correct Answers</div>
                  </div>
                </div>
              </div>
              <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-2xl font-bold">
                      {filteredUsers.reduce((sum, u) =>
                        sum + u.categories.reduce((s, c) => s + c.pending_count, 0), 0
                      )}
                    </div>
                    <div className="text-xs text-slate-400">Pending</div>
                  </div>
                </div>
              </div>
            </div>

            {/* User List */}
            <div className="space-y-3">
              {filteredUsers.map(user => {
                const isExpanded = expandedUsers.has(user.user_id);

                return (
                  <div
                    key={user.user_id}
                    className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden"
                  >
                    {/* User Header */}
                    <button
                      onClick={() => toggleUser(user.user_id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                        <div className="text-left">
                          <div className="font-semibold text-lg">{user.display_name}</div>
                          <div className="text-sm text-slate-400">@{user.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">{user.total_points.toFixed(1)}</div>
                        <div className="text-xs text-slate-500">total points</div>
                      </div>
                    </button>

                    {/* Expanded User Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-700/40 p-6 space-y-4">
                        {user.categories.map(category => {
                          const catKey = `${user.user_id}-${category.category_name}`;
                          const isCatExpanded = expandedCategories.has(catKey);

                          return (
                            <div key={category.category_name} className="border border-slate-700/30 rounded-xl overflow-hidden">
                              {/* Category Header */}
                              <button
                                onClick={() => toggleCategory(user.user_id, category.category_name)}
                                className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/30 hover:bg-slate-800/50 transition"
                              >
                                <div className="flex items-center gap-3">
                                  {isCatExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  )}
                                  {getCategoryIcon(category.category_name)}
                                  <span className="font-medium">{category.category_name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-emerald-400">{category.correct_count} ✓</span>
                                  <span className="text-rose-400">{category.incorrect_count} ✗</span>
                                  <span className="text-yellow-400">{category.pending_count} ⏳</span>
                                  <span className="font-bold text-blue-400">
                                    {category.total_points.toFixed(1)} / {category.possible_points.toFixed(1)}
                                  </span>
                                </div>
                              </button>

                              {/* Category Questions */}
                              {isCatExpanded && category.questions.length > 0 && (
                                <div className="p-4 space-y-2">
                                  {category.questions.map(question => (
                                    <div
                                      key={question.question_id}
                                      className="border border-slate-700/30 rounded-lg p-3 bg-slate-900/40"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          {bulkGradeMode && (
                                            <button
                                              onClick={() => toggleAnswerSelection(question.question_id)}
                                              className="mr-2"
                                            >
                                              {selectedAnswers.has(question.question_id) ? (
                                                <CheckSquare className="w-5 h-5 text-blue-400" />
                                              ) : (
                                                <Square className="w-5 h-5 text-slate-600" />
                                              )}
                                            </button>
                                          )}
                                          <div className="text-sm font-medium mb-1">{question.question_text}</div>
                                          <div className="text-xs text-slate-400 space-y-1">
                                            <div>User Answer: <span className="text-slate-300">{question.user_answer || '—'}</span></div>
                                            <div>Correct Answer: <span className="text-slate-300">{question.correct_answer || '—'}</span></div>
                                            <div className="flex items-center gap-2">
                                              Points: <span className="text-blue-400">{question.points_earned} / {question.point_value}</span>
                                              {question.is_finalized && (
                                                <Lock className="w-3 h-3 text-amber-400" title="Finalized" />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {question.is_correct === null ? (
                                            <span className="text-yellow-400 text-xs">Pending</span>
                                          ) : question.is_correct ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                          ) : (
                                            <XCircle className="w-5 h-5 text-rose-400" />
                                          )}
                                          {!bulkGradeMode && (
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => handleGradeAnswer(question.question_id, true)}
                                                className="rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-2 py-1 text-xs"
                                                title="Mark Correct"
                                              >
                                                ✓
                                              </button>
                                              <button
                                                onClick={() => handleGradeAnswer(question.question_id, false)}
                                                className="rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 px-2 py-1 text-xs"
                                                title="Mark Incorrect"
                                              >
                                                ✗
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                No users found matching your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGradingPanel;
