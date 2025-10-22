// File: frontend/src/pages/AdminGradingPanel.jsx
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
  Square
} from 'lucide-react';

const AdminGradingPanel = ({ seasonSlug = 'current' }) => {
  const [selectedSeason, setSelectedSeason] = useState(seasonSlug);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Map());
  const [selectedAnswers, setSelectedAnswers] = useState(new Set());
  const [bulkGradeMode, setBulkGradeMode] = useState(false);

  const queryClient = useQueryClient();

  // Fetch grading audit data
  const { data: auditData, isLoading, error, refetch } = useQuery({
    queryKey: ['grading-audit', selectedSeason],
    queryFn: async () => {
      const res = await axios.get(`/api/v2/admin/grading/audit/${selectedSeason}`);
      return res.data;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch seasons
  const { data: seasonsData } = useQuery({
    queryKey: ['seasons', 'all'],
    queryFn: async () => {
      const res = await axios.get('/api/v2/seasons/user-participated');
      return res.data;
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
    },
  });

  // Finalize question mutation
  const finalizeQuestionMutation = useMutation({
    mutationFn: async ({ questionId, correctAnswer }) => {
      const res = await axios.post(`/api/v2/admin/grading/finalize-question/${questionId}`, null, {
        params: { correct_answer: correctAnswer },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grading-audit']);
    },
  });

  const filteredUsers = useMemo(() => {
    if (!auditData?.users) return [];
    if (!searchQuery.trim()) return auditData.users;

    const query = searchQuery.toLowerCase();
    return auditData.users.filter(user =>
      user.username.toLowerCase().includes(query) ||
      user.display_name.toLowerCase().includes(query)
    );
  }, [auditData, searchQuery]);

  const toggleUser = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleCategory = (userId, categoryName) => {
    setExpandedCategories(prev => {
      const next = new Map(prev);
      const key = `${userId}-${categoryName}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, true);
      }
      return next;
    });
  };

  const toggleAnswerSelection = (answerId) => {
    setSelectedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(answerId)) {
        next.delete(answerId);
      } else {
        next.add(answerId);
      }
      return next;
    });
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

  const getCategoryIcon = (categoryName) => {
    if (categoryName.includes('Award') || categoryName.includes('Superlative')) return <Award className="w-4 h-4" />;
    if (categoryName.includes('Standings')) return <TrendingUp className="w-4 h-4" />;
    if (categoryName.includes('Tournament')) return <Trophy className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-slate-300">Loading grading audit...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-rose-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          Error loading audit data: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Grading Audit Panel</h1>
          <p className="text-slate-400">
            Review and manually grade user answers • {auditData?.season_year || selectedSeason}
          </p>
        </div>

        {/* Controls */}
        <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 rounded-3xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Search */}
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

            {/* Bulk Actions */}
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

            {/* Refresh */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Actions</label>
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-full rounded-xl bg-slate-800/70 text-slate-300 hover:bg-slate-700/80 px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Bulk Grade Buttons */}
          {bulkGradeMode && selectedAnswers.size > 0 && (
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
    </div>
  );
};

export default AdminGradingPanel;
