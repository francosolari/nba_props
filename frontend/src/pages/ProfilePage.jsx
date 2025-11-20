import React, { useState, useMemo, useCallback } from "react";
import useLeaderboard from "../hooks/useLeaderboard";
import useProfileData from "../hooks/useProfileData";
import useProfileAnswers from "../hooks/useProfileAnswers";
import useProfileStats from "../hooks/useProfileStats";

import LogoutModal from "../components/profile/LogoutModal";
import ProfileHero from "../components/profile/ProfileHero";
import ProfileStats from "../components/profile/ProfileStats";
import ProfileTabs from "../components/profile/ProfileTabs";
import DashboardTab from "../components/profile/DashboardTab";
import StandingsTab from "../components/profile/StandingsTab";
import QuestionsTab from "../components/profile/QuestionsTab";
import SubmissionsTab from "../components/profile/SubmissionsTab";
import SettingsTab from "../components/profile/SettingsTab";

const pageShellClasses =
  "min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans selection:bg-teal-500/30";

export default function ProfilePage({
  seasonSlug: seasonFromProp = "current",
}) {
  const {
    userId,
    username,
    displayName,
    selectedSeason,
    setSelectedSeason,
    seasons,
    selectedSeasonObj,
    canEdit
  } = useProfileData(seasonFromProp);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data } = useLeaderboard(selectedSeason);
  const { answers, categories } = useProfileAnswers(activeTab, selectedSeason, username, null); // meUsername handled inside hook logic if needed, but here we pass username or null. Wait, the hook expects (activeTab, selectedSeason, username, meUsername).
  // Let's check how I implemented useProfileAnswers.
  // It uses: username || meUsername || ""
  // In ProfilePage original: username || me?.user?.username || ""
  // So I need 'me'.

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

  // Re-calling hooks with correct params now that 'me' is defined
  // Actually hooks can't be conditional or depend on variable defined after.
  // But 'me' depends on 'data' which comes from useLeaderboard.
  // So I can pass me?.user?.username to the hooks.

  // However, I can't call hooks conditionally.
  // I'll pass the values to the hooks.

  const { answers: fetchedAnswers, categories: fetchedCategories } = useProfileAnswers(activeTab, selectedSeason, username, me?.user?.username);
  const { interestingStats, statsLoading } = useProfileStats(selectedSeason, username, me?.user?.username);

  const cats = me?.user?.categories || {};

  // We need to merge fetched categories with 'me' categories or use one of them.
  // Original code:
  // const standings = categories?.regular_season_standings ? ... : cats["Regular Season Standings"] ...

  const standings = fetchedCategories?.regular_season_standings
    ? {
      points: fetchedCategories.regular_season_standings.points || 0,
      max_points: fetchedCategories.regular_season_standings.max_points || 0,
      predictions: cats["Regular Season Standings"]?.predictions || [],
    }
    : cats["Regular Season Standings"] || {
      points: 0,
      max_points: 0,
      predictions: [],
    };

  const awards = fetchedCategories?.player_awards
    ? {
      points: fetchedCategories.player_awards.points || 0,
      max_points: fetchedCategories.player_awards.max_points || 0,
      predictions: cats["Player Awards"]?.predictions || [],
    }
    : cats["Player Awards"] || {
      points: 0,
      max_points: 0,
      predictions: [],
    };

  const props = fetchedCategories?.props_and_yes_no
    ? {
      points: fetchedCategories.props_and_yes_no.points || 0,
      max_points: fetchedCategories.props_and_yes_no.max_points || 0,
      predictions: cats["Props & Yes/No"]?.predictions || [],
    }
    : cats["Props & Yes/No"] || {
      points: 0,
      max_points: 0,
      predictions: [],
    };

  const compareHref = `/leaderboard/${encodeURIComponent(selectedSeason)}/detailed/?user=${encodeURIComponent(me?.user?.id || "")}&section=standings`;

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

      <ProfileHero
        me={me}
        seasons={seasons}
        selectedSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
      />

      {/* Main Content */}
      <div className="container mx-auto px-2 sm:px-4 max-w-6xl -mt-6 sm:-mt-10 md:-mt-12 relative z-20">
        <ProfileStats
          me={me}
          data={data}
          standings={standings}
          awards={awards}
          props={props}
        />

        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          canEdit={canEdit}
        />

        {/* Content Area */}
        <div className="min-h-[400px]">
          {activeTab === "dashboard" && (
            <DashboardTab
              standings={standings}
              awards={awards}
              props={props}
              answers={fetchedAnswers}
              interestingStats={interestingStats}
              statsLoading={statsLoading}
              setActiveTab={setActiveTab}
              compareHref={compareHref}
            />
          )}

          {activeTab === "standings" && (
            <StandingsTab standings={standings} />
          )}

          {activeTab === "questions" && (
            <QuestionsTab answers={fetchedAnswers} />
          )}

          {activeTab === "submissions" && (
            <SubmissionsTab
              canEdit={canEdit}
              selectedSeason={selectedSeason}
              username={username}
              selectedSeasonObj={selectedSeasonObj}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab handleLogout={handleLogout} />
          )}
        </div>
      </div>
    </div>
  );
}
