import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import EditablePredictionBoard from "../components/EditablePredictionBoard";
import {
  Trophy,
  Target,
  Award,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  User as UserIcon,
  Mail,
  Key,
  LogOut,
  ExternalLink,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  XCircle,
  Hourglass,
  X,
  Edit2,
  Save,
  AlertCircle,
} from "lucide-react";
import useLeaderboard from "../hooks/useLeaderboard";
import UserExpandedView from "../components/UserExpandedView";
import QuestionForm from "../components/QuestionForm";
import DisplayPredictionsBoard from "../components/DisplayPredictions";

function getRootProps() {
  const el = document.getElementById("profile-root");
  return {
    userId: el?.getAttribute("data-user-id") || "",
    username: el?.getAttribute("data-username") || "",
    displayName: el?.getAttribute("data-display-name") || "",
    seasonSlug: el?.getAttribute("data-season-slug") || "current",
    seasonsCsv: el?.getAttribute("data-seasons") || "",
  };
}

function avatarUrl(name) {
  const n = (name || "User").trim();
  return `https://avatar-placeholder.iran.liara.run/username/${encodeURIComponent(n)}?width=160&height=160&fontSize=64`;
}

// Modal Component for Logout Confirmation
function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
              <LogOut className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Sign Out
            </h3>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Are you sure you want to sign out? You'll need to sign in again to
            access your predictions.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageShellClasses =
  "min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 py-6 pb-20";
const containerClasses = "container mx-auto px-4 space-y-5";
const panelClasses =
  "rounded-md border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-sm";
const mutedPanelClasses =
  "rounded-md border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60";

export default function ProfilePage({
  seasonSlug: seasonFromProp = "current",
}) {
  const { userId, username, displayName, seasonSlug, seasonsCsv } =
    getRootProps();
  const initialSeason = seasonFromProp || seasonSlug || "current";
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [seasons, setSeasons] = useState(() =>
    seasonsCsv
      ? seasonsCsv
          .split(",")
          .filter(Boolean)
          .map((slug) => ({ slug }))
      : [{ slug: initialSeason }],
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get("/api/v2/seasons/");
        if (mounted && Array.isArray(res.data) && res.data.length) {
          setSeasons(res.data);
          if (!res.data.find((s) => s.slug === selectedSeason)) {
            setSelectedSeason(res.data[0].slug);
          }
        }
      } catch (_) {
        // Fallback silently to server-provided CSV
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { data, isLoading, error } = useLeaderboard(selectedSeason);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [answers, setAnswers] = useState([]);

  const me = useMemo(() => {
    if (!Array.isArray(data)) return null;
    const byId = data.find((e) => String(e?.user?.id) === String(userId));
    const byName = data.find(
      (e) => String(e?.user?.username) === String(username),
    );
    const found = byId || byName;
    if (found) return found;
    return {
      rank: "—",
      user: {
        id: userId || null,
        username: username || "me",
        display_name: displayName || username || "Me",
        avatar: null,
        total_points: 0,
        accuracy: 0,
        categories: {
          "Regular Season Standings": {
            points: 0,
            max_points: 0,
            predictions: [],
          },
          "Player Awards": { points: 0, max_points: 0, predictions: [] },
          "Props & Yes/No": { points: 0, max_points: 0, predictions: [] },
        },
      },
    };
  }, [data, userId, username, displayName]);

  const cats = me?.user?.categories || {};
  const standings = cats["Regular Season Standings"] || {
    points: 0,
    max_points: 0,
    predictions: [],
  };
  const awards = cats["Player Awards"] || {
    points: 0,
    max_points: 0,
    predictions: [],
  };
  const props = cats["Props & Yes/No"] || {
    points: 0,
    max_points: 0,
    predictions: [],
  };

  const expandedCategories = useMemo(() => {
    const toItems = (preds, isStandings) =>
      (preds || []).map((p, idx) => ({
        id: p.question_id || `${p.team}-${idx}`,
        question: p.question || (isStandings ? p.team : ""),
        answer: p.answer,
        correct: typeof p.correct === "boolean" ? p.correct : undefined,
        points: p.points || 0,
        team_name: isStandings ? p.team : undefined,
        predicted_position: isStandings ? p.predicted_position : undefined,
        actual_position: isStandings ? p.actual_position : undefined,
      }));
    return [
      {
        id: "regular",
        type: "Regular",
        icon: "grid",
        title: "Regular Season Standings",
        points: standings.points || 0,
        maxPoints: standings.max_points || 0,
        predictions: toItems(standings.predictions, true),
      },
      {
        id: "awards",
        type: "Awards",
        icon: "award",
        title: "Player Awards",
        points: awards.points || 0,
        maxPoints: awards.max_points || 0,
        predictions: toItems(awards.predictions, false),
      },
      {
        id: "props",
        type: "Props",
        icon: "target",
        title: "Props & Yes/No",
        points: props.points || 0,
        maxPoints: props.max_points || 0,
        predictions: toItems(props.predictions, false),
      },
    ];
  }, [standings, awards, props]);

  const confLists = useMemo(() => {
    const preds = (standings?.predictions || []).slice();
    const west = [];
    const east = [];
    preds.forEach((p) => {
      const isWest = String(p?.conference || "")
        .toLowerCase()
        .startsWith("w");
      (isWest ? west : east).push(p);
    });
    const order = (arr) =>
      arr
        .sort((a, b) => (a.actual_position || 999) - (b.actual_position || 999))
        .slice(0, 5);
    return { west: order(west), east: order(east) };
  }, [standings]);

  const compareHref = `/page-detail/${encodeURIComponent(selectedSeason)}/?user=${encodeURIComponent(me?.user?.id || "")}&section=standings`;
  const selectedSeasonObj =
    seasons.find((s) => s.slug === selectedSeason) || {};
  const canEdit = useMemo(() => {
    try {
      const now = new Date();
      const start = selectedSeasonObj.submission_start_date
        ? new Date(selectedSeasonObj.submission_start_date)
        : null;
      const end = selectedSeasonObj.submission_end_date
        ? new Date(selectedSeasonObj.submission_end_date)
        : null;
      if (!end) return false;
      if (start && now < start) return false;
      return now <= end;
    } catch (_) {
      return false;
    }
  }, [selectedSeasonObj]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (activeTab !== "questions" && activeTab !== "dashboard") return;
        const res = await axios.get(
          `/api/v2/answers/user/${encodeURIComponent(username || me?.user?.username || "")}`,
          {
            params: { season_slug: selectedSeason, resolve_names: true },
          },
        );
        if (mounted)
          setAnswers(Array.isArray(res.data?.answers) ? res.data.answers : []);
      } catch (_) {
        if (mounted) setAnswers([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeTab, selectedSeason, username, me?.user?.username]);

  const handleLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const confirmLogout = useCallback(() => {
    window.location.href = "/accounts/logout/";
  }, []);

  return (
      <div className={pageShellClasses}>
        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
        />

        <div className={containerClasses}>
          <section className={`${panelClasses} p-4 md:p-6`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-full overflow-hidden border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                  <img
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    src={avatarUrl(
                      me?.user?.display_name || me?.user?.username,
                    )}
                  />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                    {me?.user?.display_name || me?.user?.username}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    @{me?.user?.username}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                  Season
                </span>
                <div className="relative">
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="appearance-none border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium px-3 py-2 pr-9 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500"
                  >
                    {seasons.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.slug}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          {/* Stats Overview - Always visible */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`${mutedPanelClasses} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Rank
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {me?.rank ? `#${me.rank}` : "—"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {data?.length || 0} players
              </div>
            </div>

            <div className={`${mutedPanelClasses} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Total Points
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {me?.user?.total_points?.toLocaleString() || "0"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                across all categories
              </div>
            </div>

            <div className={`${mutedPanelClasses} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Standings
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {standings.points || 0}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                of {standings.max_points || 0} pts
              </div>
            </div>

            <div className={`${mutedPanelClasses} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-rose-600 dark:text-rose-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Props &amp; Awards
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {(awards.points || 0) + (props.points || 0)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                of {(awards.max_points || 0) + (props.max_points || 0)} pts
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={`${panelClasses} flex gap-1 p-1 overflow-x-auto`}>
            {[
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "standings", label: "Standings", icon: Trophy },
              { id: "questions", label: "Questions", icon: Target },
              ...(canEdit ? [{ id: "submissions", label: "Submissions", icon: Edit2 }] : []),
              { id: "settings", label: "Settings", icon: UserIcon },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 min-w-[120px] px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5 ${
                  activeTab === t.id
                    ? "bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white shadow-md shadow-teal-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          {activeTab === "dashboard" && (
            <div className="space-y-4">
              {/* Performance Summary */}
              <div className={`${panelClasses} p-5`}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-500" />
                  Performance Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      title: "Regular Season Standings",
                      icon: BarChart3,
                      data: standings,
                      color: "teal",
                      href: `/page-detail/${encodeURIComponent(selectedSeason)}/?user=${encodeURIComponent(me?.user?.id || "")}&section=standings`,
                    },
                    {
                      title: "Player Awards",
                      icon: Award,
                      data: awards,
                      color: "amber",
                      href: null,
                    },
                    {
                      title: "Props & Predictions",
                      icon: Target,
                      data: props,
                      color: "rose",
                      href: null,
                    },
                  ].map(({ title, icon: Icon, data, color, href }) => {
                    const percentage =
                      data.max_points > 0
                        ? Math.round((data.points / data.max_points) * 100)
                        : 0;
                    const colorClasses = {
                      teal: {
                        bg: "bg-teal-500/80 dark:bg-teal-500/90",
                        icon: "text-teal-600 dark:text-teal-500",
                        border: "border-teal-200 dark:border-teal-700",
                      },
                      amber: {
                        bg: "bg-amber-500/80 dark:bg-amber-500/90",
                        icon: "text-amber-600 dark:text-amber-500",
                        border: "border-amber-200 dark:border-amber-700",
                      },
                      rose: {
                        bg: "bg-rose-500/80 dark:bg-rose-500/90",
                        icon: "text-rose-600 dark:text-rose-500",
                        border: "border-rose-200 dark:border-rose-700",
                      },
                    };
                    const styles = colorClasses[color];

                    const card = (
                      <div
                        className={`${panelClasses} p-4 hover:shadow-lg transition-all duration-200 ${href ? "cursor-pointer" : ""}`}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`p-2 rounded-lg ${styles.border} border bg-white dark:bg-slate-800`}>
                            <Icon className={`w-5 h-5 ${styles.icon}`} />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex-1">
                            {title}
                          </h4>
                          {href && <ExternalLink className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div className="mb-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">
                              {data.points || 0}
                            </span>
                            <span className="text-lg text-slate-500 dark:text-slate-400">
                              / {data.max_points || 0}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-400 ml-auto font-medium">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full ${styles.bg} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {data.predictions?.length || 0} predictions made
                        </div>
                      </div>
                    );

                    return href ? (
                      <a key={title} href={href} className="block">
                        {card}
                      </a>
                    ) : (
                      <div key={title}>{card}</div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recent Activity */}
                <div className={`${panelClasses} p-5`}>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                    Recent Predictions
                  </h3>
                  {answers.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                      No predictions submitted yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {answers.slice(0, 5).map((a, idx) => {
                        const isCorrect = a.is_correct === true;
                        const isIncorrect = a.is_correct === false;
                        const isPending = a.is_correct === null || typeof a.is_correct === "undefined";

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                              {isIncorrect && <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                              {isPending && <Hourglass className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                  {a.question_text}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                  {String(a.answer)}
                                </div>
                              </div>
                            </div>
                            {typeof a.points_earned === "number" && (
                              <span
                                className={`text-xs font-bold ml-2 flex-shrink-0 ${
                                  a.points_earned > 0
                                    ? "text-emerald-600 dark:text-emerald-500"
                                    : "text-slate-400 dark:text-slate-500"
                                }`}
                              >
                                +{a.points_earned}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {answers.length > 5 && (
                        <button
                          onClick={() => setActiveTab("questions")}
                          className="w-full text-center text-xs text-teal-600 dark:text-teal-500 hover:text-teal-700 dark:hover:text-teal-400 font-medium py-2"
                        >
                          View all {answers.length} predictions →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Standings Preview */}
                <div className={`${panelClasses} p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-teal-600 dark:text-teal-500" />
                      Top Standings Picks
                    </h3>
                    <button
                      onClick={() => setActiveTab("standings")}
                      className="text-xs text-teal-600 dark:text-teal-500 hover:text-teal-700 dark:hover:text-teal-400 font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  {standings.predictions?.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                      No standings predictions yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(standings.predictions || [])
                        .filter((p) => (p.points || 0) > 0)
                        .sort((a, b) => (b.points || 0) - (a.points || 0))
                        .slice(0, 5)
                        .map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  (p.points || 0) === 3
                                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                    : (p.points || 0) === 1
                                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                      : "bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-400"
                                }`}
                              >
                                {p.predicted_position}
                              </span>
                              <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                {p.team}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-bold ${
                                (p.points || 0) > 0
                                  ? "text-emerald-600 dark:text-emerald-500"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              +{p.points || 0}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "standings" && (
            <div className="space-y-4">
              {/* Standings Overview */}
              <div className={`${panelClasses} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-teal-600 dark:text-teal-500" />
                    Regular Season Standings Predictions
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20" />
                        <span className="text-slate-600 dark:text-slate-400">3 pts</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20" />
                        <span className="text-slate-600 dark:text-slate-400">1 pt</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span className="text-slate-600 dark:text-slate-400">0 pts</span>
                      </div>
                    </div>
                    <a
                      href={compareHref}
                      className="text-xs text-teal-600 dark:text-teal-500 hover:text-teal-700 dark:hover:text-teal-400 font-medium inline-flex items-center gap-1"
                    >
                      Full comparison <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Points Summary */}
                <div className="mb-5 p-4 rounded-lg bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide mb-1">
                        Total Standings Points
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-teal-900 dark:text-teal-100">
                          {standings.points || 0}
                        </span>
                        <span className="text-lg text-teal-700 dark:text-teal-400">
                          / {standings.max_points || 0}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide mb-1">
                        Accuracy
                      </div>
                      <div className="text-3xl font-bold text-teal-900 dark:text-teal-100">
                        {standings.max_points > 0
                          ? Math.round((standings.points / standings.max_points) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conference Breakdowns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {[
                    { title: "Western Conference", list: confLists.west, color: "rose" },
                    { title: "Eastern Conference", list: confLists.east, color: "blue" },
                  ].map(({ title, list, color }) => {
                    const colorClasses = {
                      rose: {
                        header: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-300 dark:border-rose-700",
                        text: "text-rose-900 dark:text-rose-100",
                      },
                      blue: {
                        header: "bg-blue-500/10 dark:bg-blue-500/20 border-blue-300 dark:border-blue-700",
                        text: "text-blue-900 dark:text-blue-100",
                      },
                    };
                    const styles = colorClasses[color];

                    return (
                      <div key={title}>
                        <div className={`px-4 py-2 rounded-t-lg border ${styles.header} mb-2`}>
                          <h4 className={`text-sm font-bold ${styles.text}`}>{title}</h4>
                        </div>
                        {list.length === 0 ? (
                          <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400 italic">
                            No predictions yet
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {list.map((p, idx) => {
                              const points = p.points || 0;
                              const cardBg =
                                points === 3
                                  ? "bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/50"
                                  : points === 1
                                    ? "bg-amber-50/80 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50"
                                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700";

                              const pointBadge =
                                points === 3
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : points === 1
                                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                    : "bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-400";

                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${cardBg} transition-all hover:shadow-md`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${pointBadge}`}
                                      >
                                        {p.predicted_position}
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                        pred
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                        {p.team}
                                      </div>
                                      <div className="text-xs text-slate-600 dark:text-slate-400">
                                        Actual: #{p.actual_position ?? "TBD"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div
                                      className={`text-lg font-bold ${
                                        points > 0
                                          ? "text-emerald-600 dark:text-emerald-500"
                                          : "text-slate-400 dark:text-slate-500"
                                      }`}
                                    >
                                      +{points}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                      pts
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
              </div>
            </div>
          )}

          {activeTab === "questions" && (
            <div className="space-y-4">
              <div className={`${panelClasses} p-5`}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-teal-600 dark:text-teal-500" />
                  Question Predictions
                </h3>

                {answers.length === 0 ? (
                  <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
                    No questions answered for {selectedSeason}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {(() => {
                      // Group answers by question type
                      const grouped = {};
                      answers.forEach((a) => {
                        const type = (a.question_type || "Other").toUpperCase();
                        if (!grouped[type]) grouped[type] = [];
                        grouped[type].push(a);
                      });

                      // Color scheme for question types
                      const typeInfo = {
                        PROPQUESTION: {
                          badge: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300",
                          label: "Props",
                          icon: Target,
                        },
                        SUPERLATIVEQUESTION: {
                          badge: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300",
                          label: "Superlatives",
                          icon: Award,
                        },
                        NBAFINALSPREDICTIONQUESTION: {
                          badge: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300",
                          label: "Finals",
                          icon: Trophy,
                        },
                        default: {
                          badge: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300",
                          label: "Other",
                          icon: AlertCircle,
                        },
                      };

                      const getTypeInfo = (type) => typeInfo[type] || typeInfo["default"];

                      return Object.entries(grouped).map(([type, items]) => {
                        const info = getTypeInfo(type);
                        const Icon = info.icon;
                        const totalPoints = items.reduce((sum, a) => sum + (a.points_earned || 0), 0);
                        const maxPoints = items.reduce((sum, a) => sum + (a.max_points || 0), 0);
                        const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

                        return (
                          <div key={type}>
                            {/* Type Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${info.badge}`}>
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm font-bold uppercase tracking-wider">{info.label}</span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  {items.length} {items.length === 1 ? "question" : "questions"}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-sm font-bold text-slate-900 dark:text-slate-200">
                                    {totalPoints} / {maxPoints} pts
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {percentage}% accuracy
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Questions Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              {items.map((a, idx) => {
                                const isCorrect = a.is_correct === true;
                                const isIncorrect = a.is_correct === false;
                                const isPending = a.is_correct === null || typeof a.is_correct === "undefined";

                                const baseCard = "rounded-lg border p-4 transition-all hover:shadow-md";
                                const cardClasses = `${baseCard} ${
                                  isCorrect
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/50"
                                    : isIncorrect
                                      ? "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700/50"
                                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                                }`;

                                return (
                                  <div key={idx} className={cardClasses}>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2 leading-snug">
                                      {a.question_text}
                                    </div>
                                    <div className="text-sm text-slate-800 dark:text-slate-300 mb-3 p-2 rounded bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        Your answer:
                                      </span>{" "}
                                      <span className="font-bold">{String(a.answer)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {isCorrect && (
                                          <>
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                                            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                                              Correct
                                            </span>
                                          </>
                                        )}
                                        {isIncorrect && (
                                          <>
                                            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-500" />
                                            <span className="font-bold text-rose-700 dark:text-rose-400 text-sm">
                                              Incorrect
                                            </span>
                                          </>
                                        )}
                                        {isPending && (
                                          <>
                                            <Hourglass className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            <span className="font-semibold text-slate-500 dark:text-slate-400 text-sm">
                                              Pending
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      {typeof a.points_earned === "number" && (
                                        <span
                                          className={`font-bold text-base ${
                                            a.points_earned > 0
                                              ? "text-emerald-700 dark:text-emerald-400"
                                              : "text-slate-500 dark:text-slate-400"
                                          }`}
                                        >
                                          +{a.points_earned}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "submissions" && (
            <div className="space-y-4">
              {/* Info Banner */}
              <div className={`${panelClasses} p-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700">
                    {canEdit ? (
                      <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {canEdit ? "Submissions Open" : "Submissions Locked"}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {canEdit
                        ? `Make or update your predictions for ${selectedSeason} below. Changes are saved automatically.`
                        : `The submission period for ${selectedSeason} has ended. View your submitted predictions in the Dashboard, Standings, and Questions tabs.`}
                    </p>
                    {canEdit && selectedSeasonObj?.submission_end_date && (
                      <p className="text-xs text-teal-700 dark:text-teal-400 font-medium mt-2">
                        Deadline: {new Date(selectedSeasonObj.submission_end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Standings Submission */}
              <div className={`${panelClasses} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-500" />
                    Regular Season Predictions
                  </h3>
                  {!canEdit && (
                    <button
                      onClick={() => setActiveTab("standings")}
                      className="text-xs text-teal-600 dark:text-teal-500 hover:text-teal-700 dark:hover:text-teal-400 font-medium"
                    >
                      View results →
                    </button>
                  )}
                </div>
                <EditablePredictionBoard
                  seasonSlug={selectedSeason}
                  canEdit={!!canEdit}
                  username={username}
                />
              </div>

              {/* Question Submissions */}
              <div className={`${panelClasses} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-teal-600 dark:text-teal-500" />
                    Question Submissions
                  </h3>
                  {!canEdit && (
                    <button
                      onClick={() => setActiveTab("questions")}
                      className="text-xs text-teal-600 dark:text-teal-500 hover:text-teal-700 dark:hover:text-teal-400 font-medium"
                    >
                      View results →
                    </button>
                  )}
                </div>
                <QuestionForm
                  seasonSlug={selectedSeason}
                  canEdit={!!canEdit}
                  submissionEndDate={selectedSeasonObj?.submission_end_date || null}
                />
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              {/* Account Information */}
              <div className={`${panelClasses} p-4`}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Email Address
                      </div>
                      <div className="text-sm text-slate-900 dark:text-white font-semibold mt-0.5">
                        {/* Email would come from user data */}
                        Your registered email
                      </div>
                    </div>
                    <a
                      href="/accounts/email/"
                      className="text-xs text-teal-700 dark:text-teal-500 hover:text-teal-800 dark:hover:text-teal-400 font-medium inline-flex items-center gap-1"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Change
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Password
                      </div>
                      <div className="text-sm text-slate-900 dark:text-white font-semibold mt-0.5">
                        ••••••••
                      </div>
                    </div>
                    <a
                      href="/accounts/password/change/"
                      className="text-xs text-teal-700 dark:text-teal-500 hover:text-teal-800 dark:hover:text-teal-400 font-medium inline-flex items-center gap-1"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Change
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Connected Accounts
                      </div>
                      <div className="text-sm text-slate-900 dark:text-white mt-0.5">
                        Manage third-party connections
                      </div>
                    </div>
                    <a
                      href="/accounts/social/connections/"
                      className="text-xs text-teal-700 dark:text-teal-500 hover:text-teal-800 dark:hover:text-teal-400 font-medium inline-flex items-center gap-1"
                    >
                      Manage
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Profile Picture */}
              <div className={`${panelClasses} p-4`}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                  Profile Avatar
                </h3>
                <div className="flex items-center gap-4">
                  <img
                    className="h-16 w-16 rounded-full ring-2 ring-slate-200 dark:ring-slate-700"
                    alt="Avatar preview"
                    src={avatarUrl(
                      me?.user?.display_name || me?.user?.username,
                    )}
                  />
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      Your avatar uses a privacy-friendly placeholder generated
                      from your display name.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Custom avatar uploads coming soon!
                    </p>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className={`${panelClasses} p-4`}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                  Security
                </h3>
                <a
                  href="/accounts/sessions/"
                  className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        Active Sessions
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        View and manage your login sessions
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </a>
              </div>

              {/* Sign Out */}
              <div className={`${panelClasses} p-4`}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-md hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div
              className={`${panelClasses} p-8 text-center text-sm text-slate-600 dark:text-slate-400`}
            >
              <div className="animate-pulse">Loading your profile data…</div>
            </div>
          )}
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 p-6 text-center text-sm text-rose-700 dark:text-rose-400">
              We couldn't load your profile details. Please try again later.
            </div>
          )}
        </div>
      </div>
  );
}
