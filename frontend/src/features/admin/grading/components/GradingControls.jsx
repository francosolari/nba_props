// File: frontend/src/features/admin/grading/components/GradingControls.jsx
import React from 'react';
import CourtSelect from '../../../../components/CourtSelect';
import {
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Target,
  CheckCircle2,
} from 'lucide-react';

const COMMAND_LABELS = {
  update_season_standings: 'Update Season Standings',
  scrape_award_odds: 'Scrape Award Odds',
  grade_props_answers: 'Grade Props Answers',
  grade_standing_predictions: 'Grade Standing Predictions',
  grade_ist_predictions: 'Grade IST Predictions',
};

const GradingControls = ({
  activeTab,
  selectedSeason,
  setSelectedSeason,
  seasonsData,
  searchQuery,
  setSearchQuery,
  bulkGradeMode,
  setBulkGradeMode,
  selectedAnswers,
  setSelectedAnswers,
  onBulkGrade,
  onRefresh,
  isLoading,
  runGradingMutation,
  onRunGradingCommand,
  showStandings,
  setShowStandings,
}) => {
  const handleRunCommand = (command) => {
    const friendlyName = COMMAND_LABELS[command] || command;
    if (!window.confirm(
      `Run "${friendlyName}" for ${selectedSeason}?\n\n`
      + 'Note: This may fail on production if NBA API is blocked.\n'
      + 'This operation may take several seconds.',
    )) {
      return;
    }
    onRunGradingCommand(command);
  };

  return (
    <div className="court-admin-section mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="court-admin-label block mb-2">Season</label>
          <CourtSelect label="Season" showLabel={false} value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
            {seasonsData?.map((season) => (
              <option key={season.slug} value={season.slug}>{season.year}</option>
            ))}
          </CourtSelect>
        </div>

        {activeTab === 'audit' && (
          <div>
            <label className="court-admin-label block mb-2">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--court-steel)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Username or name..."
                className="court-admin-input w-full pl-10"
              />
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            <label className="court-admin-label block mb-2">Bulk Actions</label>
            <button
              type="button"
              onClick={() => setBulkGradeMode(!bulkGradeMode)}
              className={bulkGradeMode ? 'court-button court-button--small w-full justify-center' : 'court-admin-chip-btn w-full justify-center'}
            >
              {bulkGradeMode ? 'Exit Bulk Mode' : 'Bulk Grade Mode'}
            </button>
          </div>
        )}

        <div>
          <label className="court-admin-label block mb-2">Actions</label>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="court-admin-chip-btn w-full justify-center"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {activeTab === 'audit' && bulkGradeMode && selectedAnswers.size > 0 && (
        <div className="mt-4 pt-4 flex flex-wrap items-center gap-3 border-t border-[var(--court-rule-soft)]">
          <span className="court-admin-label">{selectedAnswers.size} selected</span>
          <button type="button" onClick={() => onBulkGrade(true)} className="court-admin-chip-btn court-admin-chip-btn--success">
            Mark Correct
          </button>
          <button type="button" onClick={() => onBulkGrade(false)} className="court-admin-chip-btn court-admin-chip-btn--danger">
            Mark Incorrect
          </button>
          <button type="button" onClick={() => setSelectedAnswers(new Set())} className="court-admin-chip-btn">
            Clear Selection
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-[var(--court-rule-soft)]">
        <div className="flex items-center justify-between mb-3 gap-3">
          <p className="text-xs text-[var(--court-steel)]">
            <strong className="text-[var(--court-ink)]">Management Commands</strong> (LOCAL ONLY &mdash; will fail if NBA API blocked)
          </p>
          {runGradingMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-[var(--court-blue)]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Running command...
            </div>
          )}
        </div>

        <div className="mb-3">
          <p className="text-xs mb-2 text-[var(--court-steel)]">Update Data:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleRunCommand('update_season_standings')}
              disabled={runGradingMutation.isPending}
              className="court-admin-chip-btn court-admin-chip-btn--success"
              title="Fetch latest standings from NBA API"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Update Standings
            </button>
            {showStandings ? (
              <button type="button" onClick={() => setShowStandings(false)} className="court-admin-chip-btn" title="Hide standings">
                <EyeOff className="w-3.5 h-3.5" />
                Hide Standings
              </button>
            ) : (
              <button type="button" onClick={() => setShowStandings(true)} className="court-admin-chip-btn" title="Show standings">
                <Eye className="w-3.5 h-3.5" />
                Show Standings
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRunCommand('scrape_award_odds')}
              disabled={runGradingMutation.isPending}
              className="court-admin-chip-btn court-admin-chip-btn--warning"
              title="Scrape latest award odds from DraftKings"
            >
              <Target className="w-3.5 h-3.5" />
              Scrape Award Odds
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs mb-2 text-[var(--court-steel)]">Run Grading:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { command: 'grade_props_answers', label: 'Grade Props' },
              { command: 'grade_standing_predictions', label: 'Grade Standings' },
              { command: 'grade_ist_predictions', label: 'Grade IST' },
            ].map(({ command, label }) => (
              <button
                key={command}
                type="button"
                onClick={() => handleRunCommand(command)}
                disabled={runGradingMutation.isPending}
                className="court-admin-chip-btn court-admin-chip-btn--blue"
                title={COMMAND_LABELS[command]}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingControls;
