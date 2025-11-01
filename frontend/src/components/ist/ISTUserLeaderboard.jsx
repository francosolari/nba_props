import React, { useState } from 'react';
import {
  Trophy,
  Star,
  Award,
  ChevronDown,
  ChevronUp,
  Target,
  Users as UsersIcon,
  CircleCheck,
  CircleX,
} from 'lucide-react';
import ProgressBar from '../ProgressBar';

/**
 * Component to display IST user leaderboard with expandable details
 * @param {Object} props
 * @param {Array} props.users - Array of user leaderboard entries
 */
function ISTUserLeaderboard({ users = [] }) {
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(10);

  const toggleUserExpansion = (userId) => {
    const next = new Set(expandedUsers);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setExpandedUsers(next);
  };

  const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Star className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-500" />;
    return (
      <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-black dark:text-white">
        {rank}
      </span>
    );
  };

  if (!users || users.length === 0) {
    return (
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-xl shadow-lg p-8 text-center">
        <UsersIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
        <p className="text-slate-600 dark:text-slate-400">
          No IST predictions submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-xl shadow-lg">
      {/* Title */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          IST Leaderboard
        </h2>
      </div>

      {/* User Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
        {users.slice(0, visibleCount).map((entry) => {
          const user = entry.user;
          const predictions = entry.predictions || [];
          const totalPoints = entry.total_points || 0;
          const maxPossiblePoints = predictions.length; // Each IST prediction is worth up to 1 point
          const accuracy = entry.accuracy || 0;

          return (
            <div
              key={user.id}
              className="bg-white/60 dark:bg-slate-800/40 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30"
            >
              {/* Main Row */}
              <button
                type="button"
                onClick={() => toggleUserExpansion(user.id)}
                className="w-full px-3 py-3 md:px-4 md:py-3.5 flex items-center justify-between transition-colors"
              >
                {/* Left side (rank, avatar, name) */}
                <div className="flex items-center gap-3">
                  {rankIcon(entry.rank)}

                  <div className="relative w-9 h-9">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.display_name || user.username} avatar`}
                        className="w-full h-full rounded-full object-cover border-2 border-slate-200 dark:border-slate-600"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="w-full h-full rounded-full border-2 border-slate-200 dark:border-slate-600 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {(user.display_name || user.username)
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-[15px] text-slate-900 dark:text-white text-left">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(accuracy * 100).toFixed(0)}% accuracy
                    </p>
                  </div>
                </div>

                {/* Right side (points, progress, chevron) */}
                <div className="flex items-center gap-4 md:gap-6">
                  {/* Points */}
                  <div className="text-right">
                    <p className="text-xl md:text-2xl font-bold text-teal-600 dark:text-teal-400">
                      {totalPoints.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">pts</p>
                  </div>

                  {/* Progress bar (desktop only) */}
                  <div className="hidden md:block min-w-[120px]">
                    <ProgressBar
                      value={totalPoints}
                      max={maxPossiblePoints || 1}
                      size="sm"
                      color="bg-gradient-to-r from-teal-500 to-teal-600"
                      bgColor="bg-slate-200 dark:bg-slate-700"
                    />
                    <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300 font-medium text-center">
                      {totalPoints.toFixed(1)}/{maxPossiblePoints}
                    </p>
                  </div>

                  {/* Expand/collapse icon */}
                  {expandedUsers.has(user.id) ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedUsers.has(user.id) && (
                <div className="px-3 pb-4 md:px-4 md:pb-5 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/30 dark:to-slate-900/20">
                  {predictions.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      No predictions yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Group predictions by type */}
                      {[
                        { type: 'group_winner', label: 'Group Winners', icon: Target },
                        { type: 'wildcard', label: 'Wildcards', icon: Star },
                        { type: 'conference_winner', label: 'Conference Winners', icon: Trophy },
                      ].map(({ type, label, icon: Icon }) => {
                        const typePredictions = predictions.filter(
                          (p) => p.prediction_type === type
                        );

                        if (typePredictions.length === 0) return null;

                        const correctPredictions = typePredictions.filter((p) => p.is_correct === true);
                        const wrongPredictions = typePredictions.filter((p) => p.is_correct === false);

                        return (
                          <div key={type} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/70 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{label}</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {/* Correct predictions */}
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                  <CircleCheck className="w-3.5 h-3.5" />
                                  Correct ({correctPredictions.length})
                                </div>
                                <ul className="space-y-1">
                                  {correctPredictions.length === 0 && (
                                    <li className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                      None yet
                                    </li>
                                  )}
                                  {correctPredictions.map((p, i) => (
                                    <li
                                      key={`correct-${i}`}
                                      className="text-[11px] text-emerald-900 dark:text-emerald-100 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30 rounded-md px-2 py-1 leading-tight"
                                    >
                                      {p.answer}
                                      <span className="ml-1 font-bold">+{p.points_earned.toFixed(1)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Wrong predictions */}
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
                                  <CircleX className="w-3.5 h-3.5" />
                                  Missed ({wrongPredictions.length})
                                </div>
                                <ul className="space-y-1">
                                  {wrongPredictions.length === 0 && (
                                    <li className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                      None yet
                                    </li>
                                  )}
                                  {wrongPredictions.map((p, i) => (
                                    <li
                                      key={`wrong-${i}`}
                                      className="text-[11px] text-rose-900 dark:text-rose-100 bg-rose-50/80 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/30 rounded-md px-2 py-1 leading-tight"
                                    >
                                      {p.answer}
                                      <span className="ml-1 font-bold">{p.points_earned.toFixed(1)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {visibleCount < users.length && (
        <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-700/60 text-center">
          <button
            className="px-5 py-2 border rounded-lg bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-all text-sm font-medium shadow-sm hover:shadow"
            onClick={() => setVisibleCount((prev) => prev + 10)}
          >
            Load More ({visibleCount} of {users.length})
          </button>
        </div>
      )}
    </div>
  );
}

export default ISTUserLeaderboard;
