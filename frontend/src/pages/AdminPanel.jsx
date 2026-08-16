// File: frontend/src/pages/AdminPanel.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAdminQuestions,
  useAwards,
  useTeams,
  usePlayers,
  useCreateSuperlativeQuestion,
  useCreatePropQuestion,
  useCreateHeadToHeadQuestion,
  useCreatePlayerStatQuestion,
  useCreateISTQuestion,
  useCreateNBAFinalsQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
  useCreateSeason,
  useSeasons,
  useUserContext,
} from "../hooks";
import QuestionBatchWizard from "../components/admin/QuestionBatchWizard";
import { ADMIN_STYLES, defaultPointValue, defaultSeasonForm, buildAdminClasses } from "../features/admin/questions/adminPanelStyles";
import { ScreenMessage } from "../features/admin/questions/components/AdminFormPrimitives";
import SeasonPanel from "../features/admin/questions/components/SeasonPanel";
import QuestionBuilders from "../features/admin/questions/components/QuestionBuilders";
import QuestionList from "../features/admin/questions/components/QuestionList";

const AdminPanel = ({ seasonSlug }) => {
  const { data: userContext, isLoading: userLoading } = useUserContext();
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons();

  const [activeSeason, setActiveSeason] = useState(seasonSlug || "");
  const [feedback, setFeedback] = useState(null);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonForm, setSeasonForm] = useState(defaultSeasonForm);
  const [showBatchWizard, setShowBatchWizard] = useState(false);

  useEffect(() => {
    if (!activeSeason && seasons.length) {
      setActiveSeason(seasonSlug || seasons[0]?.slug || "");
    }
  }, [activeSeason, seasons, seasonSlug]);

  const {
    data: questions = [],
    isLoading: questionsLoading,
    refetch,
  } = useAdminQuestions(activeSeason);
  const themeStyles = ADMIN_STYLES;
  const classes = useMemo(() => buildAdminClasses(themeStyles), [themeStyles]);

  const { data: awards = [] } = useAwards();
  const { data: teams = [] } = useTeams();
  const { data: players = [] } = usePlayers();

  const createSuperlative = useCreateSuperlativeQuestion();
  const createProp = useCreatePropQuestion();
  const createHeadToHead = useCreateHeadToHeadQuestion();
  const createPlayerStat = useCreatePlayerStatQuestion();
  const createIST = useCreateISTQuestion();
  const createNBAFinals = useCreateNBAFinalsQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const reorderQuestions = useReorderQuestions();
  const createSeason = useCreateSeason();
  const batchMutations = useMemo(
    () => ({
      superlative: createSuperlative,
      prop: createProp,
      head_to_head: createHeadToHead,
      player_stat: createPlayerStat,
      ist: createIST,
      nba_finals: createNBAFinals,
    }),
    [createSuperlative, createProp, createHeadToHead, createPlayerStat, createIST, createNBAFinals],
  );
  const builderMutations = useMemo(
    () => ({
      createSuperlative,
      createProp,
      createHeadToHead,
      createPlayerStat,
      createIST,
      createNBAFinals,
    }),
    [createSuperlative, createProp, createHeadToHead, createPlayerStat, createIST, createNBAFinals],
  );

  const [superForm, setSuperForm] = useState({ text: "", awardId: "", pointValue: defaultPointValue });
  const [propForm, setPropForm] = useState({
    text: "",
    pointValue: defaultPointValue,
    outcomeType: "over_under",
    line: "",
    relatedPlayerId: null,
  });
  const [playerStatForm, setPlayerStatForm] = useState({
    text: "",
    pointValue: defaultPointValue,
    playerStatId: "",
    statType: "",
    fixedValue: "",
  });
  const [headToHeadForm, setHeadToHeadForm] = useState({
    text: "",
    pointValue: defaultPointValue,
    team1Id: null,
    team2Id: null,
  });
  const [istForm, setIstForm] = useState({
    text: "",
    pointValue: defaultPointValue,
    predictionType: "group_winner",
    istGroup: "",
    isTiebreaker: false,
  });
  const [nbaFinalsForm, setNbaFinalsForm] = useState({ text: "", pointValue: defaultPointValue, groupName: "" });

  const awardOptions = useMemo(() => awards.map((award) => ({ value: award.id, label: award.name })), [awards]);
  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.id, label: `${team.name}${team.conference ? ` • ${team.conference}` : ""}` })),
    [teams],
  );
  const playerOptions = useMemo(() => players.map((player) => ({ value: player.id, label: player.name })), [players]);
  const seasonOptions = useMemo(() => seasons.map((s) => ({ value: s.slug, label: s.year })), [seasons]);
  const seasonMeta = useMemo(() => seasons.find((s) => s.slug === activeSeason), [seasons, activeSeason]);
  const navLinks = useMemo(
    () => [
      { href: "#season", label: "Season Hub" },
      { href: "#builders", label: "Question Builders" },
      { href: "#questions", label: "Question List" },
    ],
    [],
  );

  const setSuccess = useCallback((message) => setFeedback({ type: "success", message, id: Date.now() }), []);
  const setError = useCallback((message) => setFeedback({ type: "error", message, id: Date.now() }), []);

  const ensureSeasonSelected = useCallback(() => {
    if (!activeSeason) {
      setError("Select or create a season to continue.");
      return false;
    }
    return true;
  }, [activeSeason, setError]);

  const handleLaunchBatchWizard = () => {
    if (!ensureSeasonSelected()) return;
    setShowBatchWizard(true);
  };

  const handleMutation = useCallback(
    async (mutation, payload, successMessage) => {
      if (!ensureSeasonSelected()) return;
      try {
        await mutation.mutateAsync(payload);
        setSuccess(successMessage);
        await refetch();
      } catch (error) {
        const message = error?.response?.data?.message || error?.message || "Request failed";
        setError(message);
      }
    },
    [ensureSeasonSelected, refetch, setError, setSuccess],
  );

  const handleSeasonField = (field, value) => {
    setSeasonForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSeasonCreate = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        year: seasonForm.year.trim(),
        start_date: seasonForm.start_date,
        end_date: seasonForm.end_date,
        submission_start_date: seasonForm.submission_start_date
          ? new Date(seasonForm.submission_start_date).toISOString()
          : null,
        submission_end_date: seasonForm.submission_end_date
          ? new Date(seasonForm.submission_end_date).toISOString()
          : null,
      };
      const response = await createSeason.mutateAsync(payload);
      setSuccess("Season created successfully.");
      setSeasonForm(defaultSeasonForm);
      setShowSeasonForm(false);
      setActiveSeason(response.slug);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to create season";
      setError(message);
    }
  };

  const handleCancelSeasonForm = () => {
    setSeasonForm(defaultSeasonForm);
    setShowSeasonForm(false);
  };

  const handleReorder = () => {
    if (!ensureSeasonSelected()) return;
    reorderQuestions.mutate({ seasonSlug: activeSeason, questionIds: questions.map((q) => q.id) });
    setSuccess("Reorder request submitted.");
  };

  const handleUpdateQuestion = async (question, updates) => {
    await handleMutation(
      updateQuestion,
      { questionId: question.id, updates, seasonSlug: activeSeason },
      "Question updated.",
    );
  };

  const handleDeleteQuestion = async (question) => {
    if (!ensureSeasonSelected()) return;
    if (!window.confirm("Delete this question?")) return;
    await handleMutation(
      deleteQuestion,
      { questionId: question.id, seasonSlug: activeSeason },
      "Question deleted.",
    );
  };

  const handleBatchCompleted = useCallback(
    async (count) => {
      setShowBatchWizard(false);
      setSuccess(`${count} question${count === 1 ? "" : "s"} created.`);
      await refetch();
    },
    [refetch, setSuccess],
  );

  if (userLoading || seasonsLoading) {
    return <ScreenMessage title="Loading admin tools" message="Fetching configuration..." themeStyles={themeStyles} />;
  }

  if (!userContext?.is_admin) {
    return (
      <ScreenMessage
        title="Access restricted"
        message="You do not have permission to view the admin panel."
        variant="error"
        themeStyles={themeStyles}
      />
    );
  }

  const optionSet = { awardOptions, playerOptions, teamOptions };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeStyles.background}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-14 space-y-12">
        <header className="space-y-6">
          <div className="space-y-3 text-center md:text-left">
            <span className={`inline-flex items-center justify-center md:justify-start gap-2 text-xs font-semibold tracking-[0.3em] uppercase ${themeStyles.subtle}`}>
              Control Center
            </span>
            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold ${themeStyles.heading}`}>
              Predictions Admin Panel
            </h1>
            <p className={`text-sm sm:text-base max-w-3xl ${themeStyles.subtle}`}>
              Craft, organise, and launch the season&apos;s prediction slate with a flexible interface tuned for batch workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-3 text-sm">
            <nav className="flex flex-wrap items-center justify-center gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded px-3 py-2 border-2 border-[var(--court-rule)] bg-[var(--court-paper)] text-[var(--court-ink)] font-semibold hover:bg-[var(--court-blue-soft)] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        {feedback && (
          <div
            className={`border-2 px-6 py-4 text-sm transition ${feedback.type === "success" ? classes.successBannerClass : classes.errorBannerClass}`}
          >
            {feedback.message}
          </div>
        )}

        <SeasonPanel
          seasonOptions={seasonOptions}
          activeSeason={activeSeason}
          setActiveSeason={setActiveSeason}
          seasonMeta={seasonMeta}
          showSeasonForm={showSeasonForm}
          setShowSeasonForm={setShowSeasonForm}
          seasonForm={seasonForm}
          onSeasonField={handleSeasonField}
          onSeasonCreate={handleSeasonCreate}
          onCancelSeasonForm={handleCancelSeasonForm}
          createSeason={createSeason}
          classes={classes}
          themeStyles={themeStyles}
        />

        <QuestionBuilders
          onLaunchBatchWizard={handleLaunchBatchWizard}
          forms={{ superForm, propForm, playerStatForm, headToHeadForm, istForm, nbaFinalsForm }}
          setters={{
            setSuperForm,
            setPropForm,
            setPlayerStatForm,
            setHeadToHeadForm,
            setIstForm,
            setNbaFinalsForm,
          }}
          options={optionSet}
          mutations={builderMutations}
          defaultPointValue={defaultPointValue}
          activeSeason={activeSeason}
          ensureSeasonSelected={ensureSeasonSelected}
          setError={setError}
          handleMutation={handleMutation}
          classes={classes}
          themeStyles={themeStyles}
        />

        <QuestionList
          questions={questions}
          questionsLoading={questionsLoading}
          onReorder={handleReorder}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          classes={classes}
          themeStyles={themeStyles}
          options={optionSet}
        />
      </div>
      <QuestionBatchWizard
        isOpen={showBatchWizard}
        onClose={() => setShowBatchWizard(false)}
        seasonSlug={activeSeason}
        defaultPointValue={defaultPointValue}
        awards={awards}
        teams={teams}
        players={players}
        mutations={batchMutations}
        onCompleted={handleBatchCompleted}
      />
    </div>
  );
};

export default AdminPanel;
