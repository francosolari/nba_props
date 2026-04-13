// File: frontend/src/pages/AdminGradingPanelNew.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getCSRFToken } from '../utils/csrf';
import { useToast } from '../components/Toast';
import NBAStandings from '../components/NBAStandings';
import SelectComponent from '../components/SelectComponent';
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

const AdminGradingPanel = ({ seasonSlug = 'current', theme = 'dark' }) => {
  const toast = useToast();
  const [selectedSeason, setSelectedSeason] = useState(seasonSlug);

  // Initialize activeTab from URL parameters
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
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editedAnswer, setEditedAnswer] = useState('');
  const [editedAnswerPlayerId, setEditedAnswerPlayerId] = useState(null);
  const [editedRunnerUpPlayerId, setEditedRunnerUpPlayerId] = useState(null);
  const [editedRunnerUpPoints, setEditedRunnerUpPoints] = useState('');
  const [editedScoringRows, setEditedScoringRows] = useState([]);
  const [showStandings, setShowStandings] = useState(false);

  const queryClient = useQueryClient();

  // Update URL when subtab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('subtab', activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab]);

  // Theme helper
  const getThemeClasses = () => ({
    card: theme === 'dark'
      ? 'backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40'
      : 'bg-white border border-slate-200 shadow-sm',
    text: {
      primary: theme === 'dark' ? 'text-slate-100' : 'text-slate-900',
      secondary: theme === 'dark' ? 'text-slate-300' : 'text-slate-700',
      muted: theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
    },
    input: theme === 'dark'
      ? 'rounded-xl border border-slate-700/40 bg-slate-900/70 text-slate-100 focus:ring-blue-500/60'
      : 'rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-blue-500',
    button: {
      primary: 'bg-blue-500 text-white hover:bg-blue-600',
      secondary: theme === 'dark'
        ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    },
  });

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

  const { data: playersData } = useQuery({
    queryKey: ['players', 'grading'],
    queryFn: async () => {
      const res = await axios.get('/api/v2/players/');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: activeTab === 'grading',
  });

  const playerOptions = useMemo(
    () => (playersData?.players || [])
      .map(player => ({ value: player.id, label: player.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [playersData]
  );
  const playerNameById = useMemo(
    () => new Map((playersData?.players || []).map(player => [String(player.id), player.name])),
    [playersData]
  );

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({
      questionId,
      correctAnswer,
      isFinalized,
      answerPointValues,
      correctAnswerPlayerId,
      runnerUpPlayerId,
      runnerUpPoints,
    }) => {
      const res = await axios.post('/api/v2/admin/grading/update-question', {
        question_id: questionId,
        correct_answer: correctAnswer,
        is_finalized: isFinalized,
        answer_point_values: answerPointValues,
        correct_answer_player_id: correctAnswerPlayerId,
        runner_up_player_id: runnerUpPlayerId,
        runner_up_points: runnerUpPoints,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken('csrftoken'),
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grading-questions']);
      queryClient.invalidateQueries(['grading-audit']);
      setEditingQuestion(null);
      setEditedAnswer('');
      setEditedAnswerPlayerId(null);
      setEditedRunnerUpPlayerId(null);
      setEditedRunnerUpPoints('');
      setEditedScoringRows([]);
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
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken('csrftoken'),
        },
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
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken('csrftoken'),
        },
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

  const buildScoringRows = (answerPointValues = {}) => (
    Object.entries(answerPointValues || {}).map(([answer, points]) => ({
      answer,
      points: String(points),
    }))
  );

  const scoringRowsToMap = (rows) => {
    const map = {};
    rows.forEach((row) => {
      const answer = String(row.answer || '').trim();
      if (!answer) return;
      const points = Number(row.points);
      if (Number.isNaN(points)) return;
      map[answer] = points;
    });
    return map;
  };

  const handleUpdateQuestion = async ({
    questionId,
    correctAnswer,
    isFinalized = null,
    answerPointValues = undefined,
    correctAnswerPlayerId = undefined,
    runnerUpPlayerId = undefined,
    runnerUpPoints = undefined,
  }) => {
    try {
      await updateQuestionMutation.mutateAsync({
        questionId,
        correctAnswer,
        isFinalized,
        answerPointValues,
        correctAnswerPlayerId,
        runnerUpPlayerId,
        runnerUpPoints,
      });
      toast.success('Question updated successfully!\n\nRun grading to apply this answer to all user submissions.');
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error(`Failed to update question: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question.question_id);
    setEditedAnswer(question.correct_answer || '');
    const correctOption = question.correct_answer_player_id
      ? playerOptions.find(option => String(option.value) === String(question.correct_answer_player_id))
      : playerOptions.find(option => option.label === question.correct_answer);
    setEditedAnswerPlayerId(correctOption?.value || null);
    const scoringRows = buildScoringRows(question.answer_point_values);
    setEditedScoringRows(scoringRows);
    const runnerUpEntry = scoringRows.find(row => (
      question.choices || []
    ).includes(row.answer) && row.answer !== question.correct_answer);
    const runnerUpOption = question.runner_up_player_id
      ? playerOptions.find(option => String(option.value) === String(question.runner_up_player_id))
      : runnerUpEntry
        ? playerOptions.find(option => option.label === runnerUpEntry.answer)
        : null;
    setEditedRunnerUpPlayerId(runnerUpOption?.value || null);
    setEditedRunnerUpPoints(
      runnerUpEntry?.points || (question.question_type === 'SuperlativeQuestion' ? String((Number(question.point_value) || 0) / 2) : '')
    );
  };

  const handleSaveQuestion = async (question) => {
    const isPlayerQuestion = question.input_type === 'player_search';
    const correctAnswer = isPlayerQuestion && editedAnswerPlayerId
      ? playerNameById.get(String(editedAnswerPlayerId))
      : editedAnswer;
    const answerPointValues = scoringRowsToMap(editedScoringRows);
    const runnerUpPoints = editedRunnerUpPoints === '' ? undefined : Number(editedRunnerUpPoints);

    if (!String(correctAnswer || '').trim()) {
      toast.warning('Please enter a correct answer');
      return;
    }
    await handleUpdateQuestion({
      questionId: question.question_id,
      correctAnswer,
      answerPointValues,
      correctAnswerPlayerId: isPlayerQuestion && editedAnswerPlayerId ? Number(editedAnswerPlayerId) : undefined,
      runnerUpPlayerId: question.question_type === 'SuperlativeQuestion' && editedRunnerUpPlayerId
        ? Number(editedRunnerUpPlayerId)
        : undefined,
      runnerUpPoints: question.question_type === 'SuperlativeQuestion' && editedRunnerUpPlayerId && !Number.isNaN(runnerUpPoints)
        ? runnerUpPoints
        : undefined,
    });
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditedAnswer('');
    setEditedAnswerPlayerId(null);
    setEditedRunnerUpPlayerId(null);
    setEditedRunnerUpPoints('');
    setEditedScoringRows([]);
  };

  const addScoringRow = (answer = '', points = '') => {
    setEditedScoringRows(prev => [...prev, { answer, points: String(points) }]);
  };

  const updateScoringRow = (index, updates) => {
    setEditedScoringRows(prev => prev.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...updates } : row
    )));
  };

  const removeScoringRow = (index) => {
    setEditedScoringRows(prev => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleRunnerUpSelect = (option, question) => {
    const playerId = option ? option.value : null;
    const playerName = option ? option.label : '';
    const defaultPoints = editedRunnerUpPoints || String((Number(question.point_value) || 0) / 2);

    setEditedRunnerUpPlayerId(playerId);
    if (!playerName) return;
    setEditedRunnerUpPoints(defaultPoints);
    setEditedScoringRows(prev => {
      const withoutExistingRunnerUp = prev.filter(row => row.answer !== playerName);
      return [...withoutExistingRunnerUp, { answer: playerName, points: defaultPoints }];
    });
  };

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
        Array.from(selectedAnswers).map(answerId =>
          manualGradeMutation.mutateAsync({ answerId, isCorrect, pointsOverride: null, correctAnswer: null })
        )
      );
      toast.success(`Successfully graded ${selectedAnswers.size} answers`);
    } catch (error) {
      console.error('Error in bulk grading:', error);
      toast.error(`Bulk grading failed: ${error.message}`);
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
      toast.success(`Success!\n\n${result.message}`, 7000);

      // Show standings after successful update
      if (command === 'update_season_standings') {
        setShowStandings(true);
      }
    } catch (error) {
      console.error('Error running grading command:', error);
      const errorMsg = error.response?.data?.error || error.message;
      toast.error(`Command Failed\n\n${errorMsg}\n\nTip: Make sure you're running this locally where NBA API is accessible.`, 10000);
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
      <div className={`flex items-center justify-center min-h-screen transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-300'
          : 'bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-700'
      }`}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-black'
          : 'bg-gradient-to-br from-slate-100 via-white to-slate-100'
      }`}>
        <div className={theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}>
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100'
        : 'bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Admin Grading Panel</h1>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
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
                : theme === 'dark'
                  ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📝 Question Grading
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === 'audit'
                ? 'bg-blue-500 text-white'
                : theme === 'dark'
                  ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📊 Results Audit
          </button>
        </div>

        {/* Controls */}
        <div className={`rounded-3xl p-6 mb-6 ${getThemeClasses().card}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Season Selector */}
            <div>
              <label className={`block text-sm mb-2 ${getThemeClasses().text.muted}`}>Season</label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className={getThemeClasses().input}
              >
                {seasonsData?.map(season => (
                  <option key={season.slug} value={season.slug}>{season.year}</option>
                ))}
              </select>
            </div>

            {/* Search (only for audit tab) */}
            {activeTab === 'audit' && (
              <div>
                <label className={`block text-sm mb-2 ${getThemeClasses().text.muted}`}>Search Users</label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${getThemeClasses().text.muted}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Username or name..."
                    className={`${getThemeClasses().input} pl-10`}
                  />
                </div>
              </div>
            )}

            {/* Bulk Actions (only for audit tab) */}
            {activeTab === 'audit' && (
              <div>
                <label className={`block text-sm mb-2 ${getThemeClasses().text.muted}`}>Bulk Actions</label>
                <button
                  onClick={() => setBulkGradeMode(!bulkGradeMode)}
                  className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition ${
                    bulkGradeMode
                      ? 'bg-blue-500 text-white'
                      : getThemeClasses().button.secondary
                  }`}
                >
                  {bulkGradeMode ? 'Exit Bulk Mode' : 'Bulk Grade Mode'}
                </button>
              </div>
            )}

            {/* Refresh */}
            <div>
              <label className={`block text-sm mb-2 ${getThemeClasses().text.muted}`}>Actions</label>
              <button
                onClick={() => activeTab === 'grading' ? refetchQuestions() : refetchAudit()}
                disabled={isLoading}
                className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2 ${getThemeClasses().button.secondary}`}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Bulk Grade Buttons (only for audit tab) */}
          {activeTab === 'audit' && bulkGradeMode && selectedAnswers.size > 0 && (
            <div className={`mt-4 pt-4 flex gap-3 ${
              theme === 'dark' ? 'border-t border-slate-700/40' : 'border-t border-slate-200'
            }`}>
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
          <div className={`mt-4 pt-4 ${
            theme === 'dark' ? 'border-t border-slate-700/40' : 'border-t border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-xs ${getThemeClasses().text.muted}`}>
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
              <p className={`text-xs mb-2 ${getThemeClasses().text.muted}`}>Update Data:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleRunGradingCommand('update_season_standings')}
                  disabled={runGradingMutation.isPending}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-400/20'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
                  }`}
                  title="Fetch latest standings from NBA API"
                >
                  🔄 Update Standings
                </button>
                {showStandings ? (
                  <button
                    onClick={() => setShowStandings(false)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      theme === 'dark'
                        ? 'bg-slate-600/20 text-slate-200 hover:bg-slate-500/20'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'
                    }`}
                    title="Hide standings"
                  >
                    👁️ Hide Standings
                  </button>
                ) : (
                  <button
                    onClick={() => setShowStandings(true)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      theme === 'dark'
                        ? 'bg-slate-600/20 text-slate-200 hover:bg-slate-500/20'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'
                    }`}
                    title="Show standings"
                  >
                    👁️ Show Standings
                  </button>
                )}
                <button
                  onClick={() => handleRunGradingCommand('scrape_award_odds')}
                  disabled={runGradingMutation.isPending}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-400/20'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                  }`}
                  title="Scrape latest award odds from DraftKings"
                >
                  🎯 Scrape Award Odds
                </button>
              </div>
            </div>

            {/* Grading Commands */}
            <div>
              <p className={`text-xs mb-2 ${getThemeClasses().text.muted}`}>Run Grading:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleRunGradingCommand('grade_props_answers')}
                  disabled={runGradingMutation.isPending}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-blue-500/20 text-blue-200 hover:bg-blue-400/20'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                  }`}
                  title="Grade all prop and award questions"
                >
                  ✓ Grade Props
                </button>
                <button
                  onClick={() => handleRunGradingCommand('grade_standing_predictions')}
                  disabled={runGradingMutation.isPending}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-blue-500/20 text-blue-200 hover:bg-blue-400/20'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                  }`}
                  title="Grade standings predictions"
                >
                  ✓ Grade Standings
                </button>
                <button
                  onClick={() => handleRunGradingCommand('grade_ist_predictions')}
                  disabled={runGradingMutation.isPending}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-blue-500/20 text-blue-200 hover:bg-blue-400/20'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                  }`}
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
              <div className={`rounded-2xl p-4 ${getThemeClasses().card}`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className={`text-2xl font-bold ${getThemeClasses().text.primary}`}>{questionsData?.total_questions || 0}</div>
                    <div className={`text-xs ${getThemeClasses().text.muted}`}>Total Questions</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl p-4 ${getThemeClasses().card}`}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <div>
                    <div className={`text-2xl font-bold ${getThemeClasses().text.primary}`}>
                      {questionsData?.questions?.filter(q => q.has_correct_answer).length || 0}
                    </div>
                    <div className={`text-xs ${getThemeClasses().text.muted}`}>Answers Set</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl p-4 ${getThemeClasses().card}`}>
                <div className="flex items-center gap-3">
                  <Lock className="w-8 h-8 text-amber-400" />
                  <div>
                    <div className={`text-2xl font-bold ${getThemeClasses().text.primary}`}>
                      {questionsData?.questions?.filter(q => q.is_finalized).length || 0}
                    </div>
                    <div className={`text-xs ${getThemeClasses().text.muted}`}>Finalized</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl p-4 ${getThemeClasses().card}`}>
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-purple-400" />
                  <div>
                    <div className={`text-2xl font-bold ${getThemeClasses().text.primary}`}>
                      {questionsData?.questions?.reduce((sum, q) => sum + q.submission_count, 0) || 0}
                    </div>
                    <div className={`text-xs ${getThemeClasses().text.muted}`}>Total Submissions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* NBA Standings Section */}
            {showStandings && (
              <div className={`mb-6 rounded-2xl p-6 ${
                theme === 'dark'
                  ? 'backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40'
                  : 'bg-white border border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${getThemeClasses().text.primary}`}>
                    Updated NBA Standings
                  </h3>
                  <button
                    onClick={() => setShowStandings(false)}
                    className={`p-2 rounded-lg transition ${
                      theme === 'dark'
                        ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Hide standings"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <NBAStandings seasonSlug={selectedSeason} theme={theme} />
              </div>
            )}

            {/* Questions by Category */}
            <div className="space-y-3">
              {Object.entries(questionsByCategory).map(([categoryName, questions]) => {
                const isExpanded = expandedQuestionCategories.has(categoryName);
                const answeredCount = questions.filter(q => q.has_correct_answer).length;

                return (
                  <div
                    key={categoryName}
                    className={`rounded-2xl overflow-hidden ${getThemeClasses().card}`}
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleQuestionCategory(categoryName)}
                      className={`w-full px-6 py-4 flex items-center justify-between transition ${
                        theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className={`w-5 h-5 ${getThemeClasses().text.muted}`} />
                        ) : (
                          <ChevronRight className={`w-5 h-5 ${getThemeClasses().text.muted}`} />
                        )}
                        {getCategoryIcon(categoryName)}
                        <div className="text-left">
                          <div className={`font-semibold text-lg ${getThemeClasses().text.primary}`}>{categoryName}</div>
                          <div className={`text-sm ${getThemeClasses().text.muted}`}>
                            {answeredCount} / {questions.length} answered
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm ${getThemeClasses().text.muted}`}>{questions.length} questions</div>
                      </div>
                    </button>

                    {/* Expanded Questions */}
                    {isExpanded && (
                      <div className={`p-6 space-y-3 ${
                        theme === 'dark' ? 'border-t border-slate-700/40' : 'border-t border-slate-200'
                      }`}>
                        {questions.map(question => {
                          const isEditing = editingQuestion === question.question_id;

                          return (
                            <div
                              key={question.question_id}
                              className={`border rounded-xl p-4 transition ${
                                question.has_correct_answer
                                  ? theme === 'dark'
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : 'border-emerald-300 bg-emerald-50'
                                  : theme === 'dark'
                                    ? 'border-slate-700/30 bg-slate-900/40'
                                    : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`text-sm font-medium ${getThemeClasses().text.secondary}`}>{question.question_text}</div>
                                    {question.is_finalized && (
                                      <Lock className="w-4 h-4 text-amber-400" title="Finalized" />
                                    )}
                                  </div>

                                  <div className={`text-xs space-y-1 ${getThemeClasses().text.muted}`}>
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
                                          <div className={`text-xs ${getThemeClasses().text.muted}`}>
                                            Line: {question.line} {question.related_player_name && `(${question.related_player_name})`}
                                          </div>
                                        )}

                                        {question.input_type === 'yes_no' && question.related_player_name && (
                                          <div className={`text-xs ${getThemeClasses().text.muted}`}>
                                            Player: {question.related_player_name}
                                          </div>
                                        )}

                                        <div className="space-y-3">
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
                                              className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${getThemeClasses().input}`}
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
                                              <SelectComponent
                                                options={playerOptions}
                                                value={editedAnswerPlayerId}
                                                onChange={(option) => {
                                                  setEditedAnswerPlayerId(option ? option.value : null);
                                                  setEditedAnswer(option ? option.label : '');
                                                }}
                                                placeholder="Search player database..."
                                                mode={theme}
                                              />
                                              <div className={`mt-1 text-[11px] ${getThemeClasses().text.muted}`}>
                                                Saves the selected player's canonical name for grading submitted player IDs.
                                              </div>
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
                                            <div className="flex gap-2">
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
                                            </div>
                                          )}

                                          {/* Custom scoring editor */}
                                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                              <div>
                                                <div className="text-xs font-bold uppercase tracking-wide text-amber-300">
                                                  Custom answer points
                                                </div>
                                                <div className={`text-[11px] ${getThemeClasses().text.muted}`}>
                                                  Optional. Matching answers earn these points instead of the default point value.
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => addScoringRow('', '')}
                                                className="rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                                              >
                                                Add row
                                              </button>
                                            </div>

                                            {question.question_type === 'SuperlativeQuestion' && (
                                              <div className="mb-3 grid gap-2 md:grid-cols-[1fr_110px]">
                                                <div>
                                                  <div className="mb-1 text-[11px] font-semibold text-slate-300">Runner-up player</div>
                                                  <SelectComponent
                                                    options={playerOptions}
                                                    value={editedRunnerUpPlayerId}
                                                    onChange={(option) => handleRunnerUpSelect(option, question)}
                                                    placeholder="Search runner-up player..."
                                                    mode={theme}
                                                  />
                                                </div>
                                                <label className="text-[11px] font-semibold text-slate-300">
                                                  Runner-up pts
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={editedRunnerUpPoints}
                                                    onChange={(e) => {
                                                      const nextPoints = e.target.value;
                                                      setEditedRunnerUpPoints(nextPoints);
                                                      const runnerUpName = editedRunnerUpPlayerId
                                                        ? playerNameById.get(String(editedRunnerUpPlayerId))
                                                        : '';
                                                      if (runnerUpName) {
                                                        setEditedScoringRows(prev => prev.map(row => (
                                                          row.answer === runnerUpName ? { ...row, points: nextPoints } : row
                                                        )));
                                                      }
                                                    }}
                                                    className={`mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${getThemeClasses().input}`}
                                                  />
                                                </label>
                                              </div>
                                            )}

                                            {editedScoringRows.length === 0 ? (
                                              <div className={`rounded-lg border border-dashed border-slate-700/50 px-3 py-2 text-xs ${getThemeClasses().text.muted}`}>
                                                No custom scoring rows. Correct answers use the default point value.
                                              </div>
                                            ) : (
                                              <div className="space-y-2">
                                                {editedScoringRows.map((row, index) => (
                                                  <div key={`${row.answer}-${index}`} className="grid gap-2 md:grid-cols-[1fr_110px_auto]">
                                                    <input
                                                      type="text"
                                                      value={row.answer}
                                                      onChange={(e) => updateScoringRow(index, { answer: e.target.value })}
                                                      placeholder="Answer text, e.g. No or player name"
                                                      className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${getThemeClasses().input}`}
                                                    />
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      step="0.5"
                                                      value={row.points}
                                                      onChange={(e) => updateScoringRow(index, { points: e.target.value })}
                                                      placeholder="Pts"
                                                      className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${getThemeClasses().input}`}
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() => removeScoringRow(index)}
                                                      className="rounded-lg bg-rose-500/15 px-2.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/25"
                                                    >
                                                      Remove
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            {question.choices?.length > 0 && (
                                              <div className="mt-3 flex flex-wrap gap-2">
                                                {question.choices.map(choice => (
                                                  <button
                                                    key={choice}
                                                    type="button"
                                                    onClick={() => addScoringRow(choice, choice === question.correct_answer ? question.point_value : '')}
                                                    className="rounded-full bg-slate-800/70 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
                                                  >
                                                    Add {choice}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>

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
              <div className={`rounded-2xl p-4 ${getThemeClasses().card}`}>
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className={`text-2xl font-bold ${getThemeClasses().text.primary}`}>{filteredUsers.length}</div>
                    <div className={`text-xs ${getThemeClasses().text.muted}`}>Total Users</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl p-4 ${getThemeClasses().card}`}>
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-amber-400" />
                  <div>
                    <div className={`text-2xl font-bold ${getThemeClasses().text.primary}`}>
                      {filteredUsers[0]?.total_points?.toFixed(1) || 0}
                    </div>
                    <div className={`text-xs ${getThemeClasses().text.muted}`}>Top Score</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl p-4 ${getThemeClasses().card}`}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <div>
                    <div className={`text-2xl font-bold ${getThemeClasses().text.primary}`}>
                      {filteredUsers.reduce((sum, u) =>
                        sum + u.categories.reduce((s, c) => s + c.correct_count, 0), 0
                      )}
                    </div>
                    <div className={`text-xs ${getThemeClasses().text.muted}`}>Correct Answers</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl p-4 ${getThemeClasses().card}`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className={`text-2xl font-bold ${getThemeClasses().text.primary}`}>
                      {filteredUsers.reduce((sum, u) =>
                        sum + u.categories.reduce((s, c) => s + c.pending_count, 0), 0
                      )}
                    </div>
                    <div className={`text-xs ${getThemeClasses().text.muted}`}>Pending</div>
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
                    className={`rounded-2xl overflow-hidden ${getThemeClasses().card}`}
                  >
                    {/* User Header */}
                    <button
                      onClick={() => toggleUser(user.user_id)}
                      className={`w-full px-6 py-4 flex items-center justify-between transition ${
                        theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className={`w-5 h-5 ${getThemeClasses().text.muted}`} />
                        ) : (
                          <ChevronRight className={`w-5 h-5 ${getThemeClasses().text.muted}`} />
                        )}
                        <div className="text-left">
                          <div className={`font-semibold text-lg ${getThemeClasses().text.primary}`}>{user.display_name}</div>
                          <div className={`text-sm ${getThemeClasses().text.muted}`}>@{user.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">{user.total_points.toFixed(1)}</div>
                        <div className={`text-xs ${getThemeClasses().text.muted}`}>total points</div>
                      </div>
                    </button>

                    {/* Expanded User Content */}
                    {isExpanded && (
                      <div className={`p-6 space-y-4 ${
                        theme === 'dark' ? 'border-t border-slate-700/40' : 'border-t border-slate-200'
                      }`}>
                        {user.categories.map(category => {
                          const catKey = `${user.user_id}-${category.category_name}`;
                          const isCatExpanded = expandedCategories.has(catKey);

                          return (
                            <div key={category.category_name} className={`border rounded-xl overflow-hidden ${
                              theme === 'dark' ? 'border-slate-700/30' : 'border-slate-200'
                            }`}>
                              {/* Category Header */}
                              <button
                                onClick={() => toggleCategory(user.user_id, category.category_name)}
                                className={`w-full px-4 py-3 flex items-center justify-between transition ${
                                  theme === 'dark' ? 'bg-slate-800/30 hover:bg-slate-800/50' : 'bg-slate-100 hover:bg-slate-200'
                                }`}
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
