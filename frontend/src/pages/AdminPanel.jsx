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
import SelectComponent from "../components/SelectComponent";
import QuestionBatchWizard from "../components/admin/QuestionBatchWizard";

const THEME_CONFIG = {
  dark: {
    mode: "dark",
    background:
      "bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100",
    glassCard:
      "backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 shadow-xl shadow-slate-950/30 rounded-3xl",
    panelCard: "bg-slate-900/60 border border-slate-700/40",
    heading: "text-slate-100",
    textSecondary: "text-slate-200",
    subheading: "text-slate-400",
    muted: "text-slate-500",
    subtle: "text-slate-400",
    chip: "bg-slate-200/10 text-slate-200",
    inputBg: "bg-slate-900/70",
    inputText: "text-slate-100",
    focusRing: "focus:ring-blue-500/60",
    divider: "divide-slate-700/40",
    overlay: "bg-slate-950/70",
    sheet: "bg-slate-950/95",
    sheetCard:
      "bg-slate-900/60 border border-slate-700/40 shadow-lg shadow-slate-950/40",
    summaryCard:
      "bg-slate-900/50 border border-slate-700/40 shadow-lg shadow-slate-950/30",
    softSurface: "bg-slate-800/70",
    secondaryButton: "bg-slate-800/70 text-slate-300 hover:bg-slate-700/80",
    dangerButton: "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30",
    primaryButton:
      "bg-blue-500 text-white shadow-lg shadow-blue-500/40 hover:bg-blue-400",
    accentButton: "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-400/20",
    note: "text-slate-300",
    cardShadow: "0 30px 120px -60px rgba(99, 102, 241, 0.35)",
  },
  light: {
    mode: "light",
    background:
      "bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900",
    glassCard: "bg-white border border-slate-200 rounded-2xl shadow-sm",
    panelCard: "bg-white border border-slate-200",
    heading: "text-slate-900",
    textSecondary: "text-slate-700",
    subheading: "text-slate-500",
    muted: "text-slate-400",
    subtle: "text-slate-500",
    chip: "bg-slate-100 text-slate-600",
    inputBg: "bg-white",
    inputText: "text-slate-900",
    focusRing: "focus:ring-sky-500/40",
    divider: "divide-slate-200",
    overlay: "bg-slate-900/10",
    sheet: "bg-white",
    sheetCard: "bg-white border border-slate-200 shadow-sm",
    summaryCard: "bg-white border border-slate-200 shadow-sm",
    softSurface: "bg-slate-100",
    secondaryButton:
      "bg-slate-100 text-slate-600 hover:bg-slate-200 transition",
    dangerButton: "bg-rose-500 text-white hover:bg-rose-600",
    primaryButton: "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
    accentButton: "bg-white text-sky-600 border border-sky-200 hover:bg-sky-50",
    note: "text-slate-500",
    cardShadow: "0 16px 30px rgba(15, 23, 42, 0.08)",
  },
};

const defaultPointValue = 0.5;

const defaultSeasonForm = {
  year: "",
  start_date: "",
  end_date: "",
  submission_start_date: "",
  submission_end_date: "",
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch (error) {
    console.warn("Failed to format date", error);
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    console.warn("Failed to format datetime", error);
    return value;
  }
};

const AdminPanel = ({ seasonSlug }) => {
  const { data: userContext, isLoading: userLoading } = useUserContext();
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons();

  const getPreferredTheme = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return "dark";
    }
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }, []);

  const [theme, setTheme] = useState(getPreferredTheme);
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
  const themeStyles = useMemo(
    () => THEME_CONFIG[theme] || THEME_CONFIG.dark,
    [theme],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const listener = (event) => setTheme(event.matches ? "light" : "dark");
    media.addEventListener
      ? media.addEventListener("change", listener)
      : media.addListener(listener);
    return () => {
      media.removeEventListener
        ? media.removeEventListener("change", listener)
        : media.removeListener(listener);
    };
  }, [setTheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const labelClass = `flex flex-col gap-2 text-sm ${themeStyles.textSecondary}`;
  const inputClass = `rounded-2xl border ${themeStyles.inputBg} px-4 py-3 text-sm ${themeStyles.inputText} focus:outline-none ${themeStyles.focusRing} ${theme === "dark" ? "border-slate-700/40" : "border-slate-300"}`;
  const textareaClass = `${inputClass} resize-none`;
  const selectClass = inputClass;
  const checkboxClass =
    theme === "dark"
      ? "h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/60"
      : "h-4 w-4 rounded border-slate-300 bg-white text-blue-500 focus:ring-blue-500/40";
  const primaryButtonClass = `rounded-full px-5 py-2.5 text-sm font-semibold transition ${themeStyles.primaryButton} disabled:cursor-not-allowed disabled:opacity-60`;
  const secondaryButtonClass = `rounded-full px-4 py-2 text-sm transition ${themeStyles.secondaryButton} disabled:cursor-not-allowed disabled:opacity-60`;
  const accentButtonClass = `rounded-full px-4 py-2 text-sm font-medium transition ${themeStyles.accentButton}`;
  const dangerButtonClass = `rounded-full px-3 py-2 text-sm font-medium transition ${themeStyles.dangerButton} disabled:cursor-not-allowed disabled:opacity-60`;
  const themeCardClass = `${themeStyles.glassCard} w-full p-6`;
  const batchCardClass = `${themeStyles.glassCard} p-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between`;
  const headingClass = `text-lg font-semibold tracking-wide ${themeStyles.heading}`;
  const subheadingClass = `text-sm ${themeStyles.subheading}`;
  const mutedTextClass = `text-xs ${themeStyles.muted}`;
  const chipClass = `${themeStyles.chip} rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em]`;
  const successBannerClass =
    theme === "dark"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  const errorBannerClass =
    theme === "dark"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : "border-rose-500/30 bg-rose-100 text-rose-700";
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
    [
      createSuperlative,
      createProp,
      createHeadToHead,
      createPlayerStat,
      createIST,
      createNBAFinals,
    ],
  );

  const [superForm, setSuperForm] = useState({
    text: "",
    awardId: "",
    pointValue: defaultPointValue,
  });
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
  const [nbaFinalsForm, setNbaFinalsForm] = useState({
    text: "",
    pointValue: defaultPointValue,
    groupName: "",
  });

  const awardOptions = useMemo(
    () => awards.map((award) => ({ value: award.id, label: award.name })),
    [awards],
  );
  const teamOptions = useMemo(
    () =>
      teams.map((team) => ({
        value: team.id,
        label: `${team.name}${team.conference ? ` • ${team.conference}` : ""}`,
      })),
    [teams],
  );
  const playerOptions = useMemo(
    () => players.map((player) => ({ value: player.id, label: player.name })),
    [players],
  );
  const seasonOptions = useMemo(
    () => seasons.map((s) => ({ value: s.slug, label: s.year })),
    [seasons],
  );
  const seasonMeta = useMemo(
    () => seasons.find((s) => s.slug === activeSeason),
    [seasons, activeSeason],
  );
  const navLinks = useMemo(
    () => [
      { href: "#season", label: "Season Hub" },
      { href: "#builders", label: "Question Builders" },
      { href: "#questions", label: "Question List" },
    ],
    [],
  );

  const setSuccess = useCallback(
    (message) => setFeedback({ type: "success", message, id: Date.now() }),
    [],
  );
  const setError = useCallback(
    (message) => setFeedback({ type: "error", message, id: Date.now() }),
    [],
  );

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
        const message =
          error?.response?.data?.message || error?.message || "Request failed";
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
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create season";
      setError(message);
    }
  };

  const handleReorder = () => {
    if (!ensureSeasonSelected()) return;
    reorderQuestions.mutate({
      seasonSlug: activeSeason,
      questionIds: questions.map((q) => q.id),
    });
    setSuccess("Reorder request submitted.");
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
    return (
      <ScreenMessage
        title="Loading admin tools"
        message="Fetching configuration..."
        themeStyles={themeStyles}
      />
    );
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

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${themeStyles.background}`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-14 space-y-12">
        <header className="space-y-6">
          <div className="space-y-3 text-center md:text-left">
            <span
              className={`inline-flex items-center justify-center md:justify-start gap-2 text-xs font-semibold tracking-[0.3em] uppercase ${themeStyles.subtle}`}
            >
              Control Center
            </span>
            <h1
              className={`text-3xl sm:text-4xl md:text-5xl font-bold ${themeStyles.heading}`}
            >
              Predictions Admin Panel
            </h1>
            <p
              className={`text-sm sm:text-base max-w-3xl ${themeStyles.subtle}`}
            >
              Craft, organise, and launch the season&apos;s prediction slate
              with a flexible interface tuned for batch workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-3 text-sm">
            <nav className="flex flex-wrap items-center justify-center gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={
                    link.href === "#season"
                      ? "px-3 py-2 rounded-full border border-sky-200/80 bg-white/90 text-sky-600 font-semibold shadow-sm hover:bg-sky-50 transition-colors"
                      : link.href === "#builders"
                        ? "px-3 py-2 rounded-full border border-slate-200 bg-white/90 text-slate-600 font-semibold shadow-sm hover:bg-slate-50 transition-colors"
                        : "px-3 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 font-semibold shadow-sm hover:bg-emerald-100 transition-colors"
                  }
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <button
              type="button"
              onClick={toggleTheme}
              className={`${secondaryButtonClass} items-center gap-2`}
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>

        {feedback && (
          <div
            className={`rounded-2xl border px-6 py-4 text-sm shadow-sm transition ${feedback.type === "success" ? successBannerClass : errorBannerClass}`}
          >
            {feedback.message}
          </div>
        )}

        <section id="season" className="space-y-6">
          <div className={`${themeCardClass} shadow-sm`}>
            <p
              className={`text-xs uppercase tracking-[0.3em] ${themeStyles.subtle}`}
            >
              Current season
            </p>
            <div className="mt-3">
              <SelectComponent
                options={seasonOptions}
                value={
                  seasonOptions.find(
                    (option) => option.value === activeSeason,
                  ) || null
                }
                onChange={(option) =>
                  setActiveSeason(option ? option.value : "")
                }
                placeholder="Select season"
                mode={themeStyles.mode}
              />
            </div>
            {seasonMeta && (
              <div
                className={`mt-4 space-y-1 text-sm ${themeStyles.textSecondary}`}
              >
                <p>{seasonMeta.year}</p>
                <p className={`text-sm ${themeStyles.muted}`}>
                  {formatDate(seasonMeta.start_date)} →{" "}
                  {formatDate(seasonMeta.end_date)}
                </p>
                <p className={`text-sm ${themeStyles.muted}`}>
                  Submissions{" "}
                  {formatDateTime(seasonMeta.submission_start_date)} →{" "}
                  {formatDateTime(seasonMeta.submission_end_date)}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowSeasonForm((open) => !open)}
              className={`${secondaryButtonClass} mt-6 w-full justify-center font-medium`}
            >
              {showSeasonForm ? "Close season creator" : "Create new season"}
            </button>
          </div>

          {showSeasonForm && (
            <div className={`${themeStyles.glassCard} p-6`}>
              <h2
                className={`text-lg font-semibold tracking-wide ${themeStyles.heading}`}
              >
                Create a new season
              </h2>
              <p className={`mt-1 text-sm ${themeStyles.subtle}`}>
                Define the dates and submission window. The slug is generated
                automatically.
              </p>
              <form
                onSubmit={handleSeasonCreate}
                className="mt-6 grid gap-6 lg:grid-cols-2"
              >
                <TextInput
                  label="Display year"
                  value={seasonForm.year}
                  onChange={(value) => handleSeasonField("year", value)}
                  placeholder="2025-26"
                  required
                  labelClass={labelClass}
                  inputClass={inputClass}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateInput
                    label="Season starts"
                    value={seasonForm.start_date}
                    onChange={(e) =>
                      handleSeasonField("start_date", e.target.value)
                    }
                    required
                    labelClass={labelClass}
                    inputClass={inputClass}
                  />
                  <DateInput
                    label="Season ends"
                    value={seasonForm.end_date}
                    onChange={(e) =>
                      handleSeasonField("end_date", e.target.value)
                    }
                    required
                    labelClass={labelClass}
                    inputClass={inputClass}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateInput
                    label="Submissions open"
                    value={seasonForm.submission_start_date}
                    onChange={(e) =>
                      handleSeasonField(
                        "submission_start_date",
                        e.target.value,
                      )
                    }
                    required
                    type="datetime-local"
                    step="60"
                    labelClass={labelClass}
                    inputClass={inputClass}
                  />
                  <DateInput
                    label="Submissions close"
                    value={seasonForm.submission_end_date}
                    onChange={(e) =>
                      handleSeasonField("submission_end_date", e.target.value)
                    }
                    required
                    type="datetime-local"
                    step="60"
                    labelClass={labelClass}
                    inputClass={inputClass}
                  />
                </div>
                <div className="flex items-center justify-end gap-3 lg:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSeasonForm(defaultSeasonForm);
                      setShowSeasonForm(false);
                    }}
                    className={secondaryButtonClass}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSeason.isPending}
                    className={primaryButtonClass}
                  >
                    {createSeason.isPending ? "Creating…" : "Save season"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        <section id="builders" className="space-y-8">
          <div className={batchCardClass}>
            <div>
              <h2 className={headingClass}>Launch batch creator</h2>
              <p className={subheadingClass}>
                Draft multiple questions with a guided flow. Perfect when
                seeding a new season.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLaunchBatchWizard}
              className={`${primaryButtonClass} md:w-auto`}
            >
              Batch create questions
            </button>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <GlassFormCard
              title="Superlative"
              subtitle="Award-style predictions"
              isSubmitting={createSuperlative.isPending}
              onSubmit={(event) => {
                event.preventDefault();
                if (!ensureSeasonSelected()) return;
                if (!superForm.awardId) {
                  setError("Select an award before creating this question.");
                  return;
                }
                handleMutation(
                  createSuperlative,
                  {
                    season_slug: activeSeason,
                    text: superForm.text.trim(),
                    point_value: Number(
                      superForm.pointValue || defaultPointValue,
                    ),
                    award_id: Number(superForm.awardId),
                  },
                  "Superlative question created.",
                );
                setSuperForm({
                  text: "",
                  awardId: "",
                  pointValue: defaultPointValue,
                });
              }}
              themeStyles={themeStyles}
              primaryButtonClass={primaryButtonClass}
            >
              <Textarea
                label="Question"
                value={superForm.text}
                onChange={(value) =>
                  setSuperForm((prev) => ({ ...prev, text: value }))
                }
                placeholder="Who wins Sixth Man of the Year?"
                required
                labelClass={labelClass}
                textareaClass={textareaClass}
              />
              <NumberInput
                label="Point value"
                value={superForm.pointValue}
                onChange={(value) =>
                  setSuperForm((prev) => ({ ...prev, pointValue: value }))
                }
                step="0.5"
                min="0"
                labelClass={labelClass}
                inputClass={inputClass}
              />
              <SelectComponent
                options={awardOptions}
                value={
                  awardOptions.find(
                    (option) => option.value === superForm.awardId,
                  ) || null
                }
                onChange={(option) =>
                  setSuperForm((prev) => ({
                    ...prev,
                    awardId: option ? option.value : "",
                  }))
                }
                placeholder="Select award"
                isClearable
                mode={themeStyles.mode}
              />
            </GlassFormCard>

            <GlassFormCard
              title="Prop"
              subtitle="Binary & over/under"
              isSubmitting={createProp.isPending}
              onSubmit={(event) => {
                event.preventDefault();
                if (!ensureSeasonSelected()) return;
                handleMutation(
                  createProp,
                  {
                    season_slug: activeSeason,
                    text: propForm.text.trim(),
                    point_value: Number(
                      propForm.pointValue || defaultPointValue,
                    ),
                    outcome_type: propForm.outcomeType,
                    related_player_id: propForm.relatedPlayerId
                      ? Number(propForm.relatedPlayerId)
                      : undefined,
                    line:
                      propForm.outcomeType === "over_under" &&
                        propForm.line !== ""
                        ? Number(propForm.line)
                        : undefined,
                  },
                  "Prop question created.",
                );
                setPropForm({
                  text: "",
                  pointValue: defaultPointValue,
                  outcomeType: "over_under",
                  line: "",
                  relatedPlayerId: null,
                });
              }}
              themeStyles={themeStyles}
              primaryButtonClass={primaryButtonClass}
            >
              <Textarea
                label="Question"
                value={propForm.text}
                onChange={(value) =>
                  setPropForm((prev) => ({ ...prev, text: value }))
                }
                placeholder="Does Luka average 32.5 PPG?"
                required
                labelClass={labelClass}
                textareaClass={textareaClass}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput
                  label="Point value"
                  value={propForm.pointValue}
                  onChange={(value) =>
                    setPropForm((prev) => ({ ...prev, pointValue: value }))
                  }
                  step="0.5"
                  min="0"
                  labelClass={labelClass}
                  inputClass={inputClass}
                />
                <label className={labelClass}>
                  Outcome type
                  <select
                    value={propForm.outcomeType}
                    onChange={(e) =>
                      setPropForm((prev) => ({
                        ...prev,
                        outcomeType: e.target.value,
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="over_under">Over / Under</option>
                    <option value="yes_no">Yes / No</option>
                  </select>
                </label>
              </div>
              {propForm.outcomeType === "over_under" && (
                <NumberInput
                  label="Line"
                  value={propForm.line}
                  onChange={(value) =>
                    setPropForm((prev) => ({ ...prev, line: value }))
                  }
                  step="0.1"
                  required
                  labelClass={labelClass}
                  inputClass={inputClass}
                />
              )}
              <SelectComponent
                options={playerOptions}
                value={
                  playerOptions.find(
                    (option) => option.value === propForm.relatedPlayerId,
                  ) || null
                }
                onChange={(option) =>
                  setPropForm((prev) => ({
                    ...prev,
                    relatedPlayerId: option ? option.value : null,
                  }))
                }
                placeholder="Search related player"
                isClearable
                mode={themeStyles.mode}
              />
            </GlassFormCard>

            <GlassFormCard
              title="Player Stat"
              subtitle="Projection vs. stat benchmark"
              isSubmitting={createPlayerStat.isPending}
              onSubmit={(event) => {
                event.preventDefault();
                if (!ensureSeasonSelected()) return;
                if (!playerStatForm.playerStatId) {
                  setError("Provide the player stat ID for this question.");
                  return;
                }
                handleMutation(
                  createPlayerStat,
                  {
                    season_slug: activeSeason,
                    text: playerStatForm.text.trim(),
                    point_value: Number(
                      playerStatForm.pointValue || defaultPointValue,
                    ),
                    player_stat_id: Number(playerStatForm.playerStatId),
                    stat_type: playerStatForm.statType.trim(),
                    fixed_value:
                      playerStatForm.fixedValue !== ""
                        ? Number(playerStatForm.fixedValue)
                        : undefined,
                  },
                  "Player stat question created.",
                );
                setPlayerStatForm({
                  text: "",
                  pointValue: defaultPointValue,
                  playerStatId: "",
                  statType: "",
                  fixedValue: "",
                });
              }}
              themeStyles={themeStyles}
              primaryButtonClass={primaryButtonClass}
            >
              <Textarea
                label="Question"
                value={playerStatForm.text}
                onChange={(value) =>
                  setPlayerStatForm((prev) => ({ ...prev, text: value }))
                }
                placeholder="Who leads the league in assists?"
                required
                labelClass={labelClass}
                textareaClass={textareaClass}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput
                  label="Point value"
                  value={playerStatForm.pointValue}
                  onChange={(value) =>
                    setPlayerStatForm((prev) => ({
                      ...prev,
                      pointValue: value,
                    }))
                  }
                  step="0.5"
                  min="0"
                  labelClass={labelClass}
                  inputClass={inputClass}
                />
                <TextInput
                  label="Stat type"
                  value={playerStatForm.statType}
                  onChange={(value) =>
                    setPlayerStatForm((prev) => ({
                      ...prev,
                      statType: value,
                    }))
                  }
                  placeholder="assists"
                  required
                  labelClass={labelClass}
                  inputClass={inputClass}
                />
              </div>
              <NumberInput
                label="Player stat ID"
                value={playerStatForm.playerStatId}
                onChange={(value) =>
                  setPlayerStatForm((prev) => ({
                    ...prev,
                    playerStatId: value,
                  }))
                }
                required
                labelClass={labelClass}
                inputClass={inputClass}
              />
              <NumberInput
                label="Fixed value (optional)"
                value={playerStatForm.fixedValue}
                onChange={(value) =>
                  setPlayerStatForm((prev) => ({
                    ...prev,
                    fixedValue: value,
                  }))
                }
                step="0.1"
                labelClass={labelClass}
                inputClass={inputClass}
              />
            </GlassFormCard>

            <GlassFormCard
              title="Head-to-Head"
              subtitle="Pick between two teams"
              isSubmitting={createHeadToHead.isPending}
              onSubmit={(event) => {
                event.preventDefault();
                if (!ensureSeasonSelected()) return;
                if (
                  !headToHeadForm.team1Id ||
                  !headToHeadForm.team2Id ||
                  headToHeadForm.team1Id === headToHeadForm.team2Id
                ) {
                  setError("Select two different teams for the matchup.");
                  return;
                }
                handleMutation(
                  createHeadToHead,
                  {
                    season_slug: activeSeason,
                    text: headToHeadForm.text.trim(),
                    point_value: Number(
                      headToHeadForm.pointValue || defaultPointValue,
                    ),
                    team1_id: Number(headToHeadForm.team1Id),
                    team2_id: Number(headToHeadForm.team2Id),
                  },
                  "Head-to-head question created.",
                );
                setHeadToHeadForm({
                  text: "",
                  pointValue: defaultPointValue,
                  team1Id: null,
                  team2Id: null,
                });
              }}
              themeStyles={themeStyles}
              primaryButtonClass={primaryButtonClass}
            >
              <Textarea
                label="Question"
                value={headToHeadForm.text}
                onChange={(value) =>
                  setHeadToHeadForm((prev) => ({ ...prev, text: value }))
                }
                placeholder="Who wins opening night?"
                required
                labelClass={labelClass}
                textareaClass={textareaClass}
              />
              <NumberInput
                label="Point value"
                value={headToHeadForm.pointValue}
                onChange={(value) =>
                  setHeadToHeadForm((prev) => ({
                    ...prev,
                    pointValue: value,
                  }))
                }
                step="0.5"
                min="0"
                labelClass={labelClass}
                inputClass={inputClass}
              />
              <SelectComponent
                options={teamOptions}
                value={
                  teamOptions.find(
                    (option) => option.value === headToHeadForm.team1Id,
                  ) || null
                }
                onChange={(option) =>
                  setHeadToHeadForm((prev) => ({
                    ...prev,
                    team1Id: option ? option.value : null,
                  }))
                }
                placeholder="Select team"
                isClearable
                mode={themeStyles.mode}
              />
              <SelectComponent
                options={teamOptions}
                value={
                  teamOptions.find(
                    (option) => option.value === headToHeadForm.team2Id,
                  ) || null
                }
                onChange={(option) =>
                  setHeadToHeadForm((prev) => ({
                    ...prev,
                    team2Id: option ? option.value : null,
                  }))
                }
                placeholder="Select opponent"
                isClearable
                mode={themeStyles.mode}
              />
            </GlassFormCard>

            <GlassFormCard
              title="In-Season Tournament"
              subtitle="Group predictions & tiebreakers"
              isSubmitting={createIST.isPending}
              onSubmit={(event) => {
                event.preventDefault();
                if (!ensureSeasonSelected()) return;
                handleMutation(
                  createIST,
                  {
                    season_slug: activeSeason,
                    text: istForm.text.trim(),
                    point_value: Number(
                      istForm.pointValue || defaultPointValue,
                    ),
                    prediction_type: istForm.predictionType,
                    ist_group: istForm.istGroup || undefined,
                    is_tiebreaker: Boolean(
                      istForm.predictionType === "tiebreaker" ||
                      istForm.isTiebreaker,
                    ),
                  },
                  "IST question created.",
                );
                setIstForm({
                  text: "",
                  pointValue: defaultPointValue,
                  predictionType: "group_winner",
                  istGroup: "",
                  isTiebreaker: false,
                });
              }}
              themeStyles={themeStyles}
              primaryButtonClass={primaryButtonClass}
            >
              <Textarea
                label="Question"
                value={istForm.text}
                onChange={(value) =>
                  setIstForm((prev) => ({ ...prev, text: value }))
                }
                placeholder="Who wins East Group A?"
                required
                labelClass={labelClass}
                textareaClass={textareaClass}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput
                  label="Point value"
                  value={istForm.pointValue}
                  onChange={(value) =>
                    setIstForm((prev) => ({ ...prev, pointValue: value }))
                  }
                  step="0.5"
                  min="0"
                  labelClass={labelClass}
                  inputClass={inputClass}
                />
                <label className={labelClass}>
                  Prediction type
                  <select
                    value={istForm.predictionType}
                    onChange={(e) =>
                      setIstForm((prev) => ({
                        ...prev,
                        predictionType: e.target.value,
                        isTiebreaker: e.target.value === "tiebreaker",
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="group_winner">Group Winner</option>
                    <option value="wildcard">Wildcard</option>
                    <option value="conference_winner">
                      Conference Winner
                    </option>
                    <option value="tiebreaker">Tiebreaker</option>
                  </select>
                </label>
              </div>
              <TextInput
                label="IST group (optional)"
                value={istForm.istGroup}
                onChange={(value) =>
                  setIstForm((prev) => ({ ...prev, istGroup: value }))
                }
                placeholder="East Group A"
                labelClass={labelClass}
                inputClass={inputClass}
              />
              <label
                className={`mt-2 flex items-center gap-3 text-sm ${themeStyles.textSecondary}`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(istForm.isTiebreaker)}
                  onChange={(e) =>
                    setIstForm((prev) => ({
                      ...prev,
                      isTiebreaker: e.target.checked,
                    }))
                  }
                  className={checkboxClass}
                />
                Tiebreaker question
              </label>
            </GlassFormCard>

            <GlassFormCard
              title="NBA Finals"
              subtitle="Championship predictions"
              isSubmitting={createNBAFinals.isPending}
              onSubmit={(event) => {
                event.preventDefault();
                if (!ensureSeasonSelected()) return;
                handleMutation(
                  createNBAFinals,
                  {
                    season_slug: activeSeason,
                    text: nbaFinalsForm.text.trim(),
                    point_value: Number(
                      nbaFinalsForm.pointValue || defaultPointValue,
                    ),
                    group_name: nbaFinalsForm.groupName || undefined,
                  },
                  "NBA Finals question created.",
                );
                setNbaFinalsForm({
                  text: "",
                  pointValue: defaultPointValue,
                  groupName: "",
                });
              }}
              themeStyles={themeStyles}
              primaryButtonClass={primaryButtonClass}
            >
              <Textarea
                label="Question"
                value={nbaFinalsForm.text}
                onChange={(value) =>
                  setNbaFinalsForm((prev) => ({ ...prev, text: value }))
                }
                placeholder="Who wins the NBA Finals?"
                required
                labelClass={labelClass}
                textareaClass={textareaClass}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput
                  label="Point value"
                  value={nbaFinalsForm.pointValue}
                  onChange={(value) =>
                    setNbaFinalsForm((prev) => ({
                      ...prev,
                      pointValue: value,
                    }))
                  }
                  step="0.5"
                  min="0"
                  labelClass={labelClass}
                  inputClass={inputClass}
                />
                <TextInput
                  label="Grouping (optional)"
                  value={nbaFinalsForm.groupName}
                  onChange={(value) =>
                    setNbaFinalsForm((prev) => ({
                      ...prev,
                      groupName: value,
                    }))
                  }
                  placeholder="Finals"
                  labelClass={labelClass}
                  inputClass={inputClass}
                />
              </div>
            </GlassFormCard>
          </div>
        </section>

        <section
          id="questions"
          className={`${themeStyles.glassCard} overflow-hidden`}
        >
          <div
            className={`flex flex-col gap-4 border-b px-8 py-6 md:flex-row md:items-center md:justify-between ${theme === "dark" ? "border-slate-600/40" : "border-slate-200"}`}
          >
            <div>
              <h2 className={headingClass}>Existing questions</h2>
              <p className={subheadingClass}>
                Review, edit, or prune questions for this season.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReorder}
              className={`${accentButtonClass} px-4`}
            >
              Sync order
            </button>
          </div>
          {questionsLoading ? (
            <div className={`px-8 py-12 text-center ${themeStyles.subtle}`}>
              Loading questions…
            </div>
          ) : questions.length === 0 ? (
            <div className={`px-8 py-12 text-center ${themeStyles.subtle}`}>
              No questions added yet for this season.
            </div>
          ) : (
            <div className={`divide-y ${themeStyles.divider}`}>
              {questions.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  onUpdate={async (updates) => {
                    await handleMutation(
                      updateQuestion,
                      {
                        questionId: question.id,
                        updates,
                        seasonSlug: activeSeason,
                      },
                      "Question updated.",
                    );
                  }}
                  onDelete={async () => {
                    if (!ensureSeasonSelected()) return;
                    const confirmed = window.confirm("Delete this question?");
                    if (!confirmed) return;
                    await handleMutation(
                      deleteQuestion,
                      {
                        questionId: question.id,
                        seasonSlug: activeSeason,
                      },
                      "Question deleted.",
                    );
                  }}
                  themeStyles={themeStyles}
                  inputClass={inputClass}
                  secondaryButtonClass={secondaryButtonClass}
                  dangerButtonClass={dangerButtonClass}
                  chipClass={chipClass}
                  mutedTextClass={mutedTextClass}
                  awardOptions={awardOptions}
                  playerOptions={playerOptions}
                  teamOptions={teamOptions}
                />
              ))}
            </div>
          )}
        </section>
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
        theme={themeStyles.mode}
      />
    </div>
  );
};

const ScreenMessage = ({
  title,
  message,
  variant = "default",
  themeStyles = THEME_CONFIG.dark,
}) => {
  const errorClass =
    themeStyles.mode === "dark" ? "text-rose-300" : "text-rose-600";
  return (
    <div
      className={`flex min-h-screen items-center justify-center ${themeStyles.background}`}
    >
      <div
        className={`${themeStyles.glassCard} mx-6 max-w-md p-10 text-center`}
        style={{ boxShadow: themeStyles.cardShadow }}
      >
        <h1 className={`text-2xl font-semibold ${themeStyles.heading}`}>
          {title}
        </h1>
        <p className={`mt-4 ${themeStyles.subtle}`}>{message}</p>
        {variant === "error" && (
          <div className={`mt-6 text-sm ${errorClass}`}>
            Contact an administrator to request access.
          </div>
        )}
      </div>
    </div>
  );
};

const GlassFormCard = ({
  title,
  subtitle,
  children,
  isSubmitting,
  onSubmit,
  themeStyles = THEME_CONFIG.dark,
  primaryButtonClass,
}) => (
  <form
    onSubmit={onSubmit}
    className={`${themeStyles.glassCard} p-6`}
    style={{ boxShadow: themeStyles.cardShadow }}
  >
    <div className="mb-4">
      <h3
        className={`text-lg font-semibold tracking-wide ${themeStyles.heading}`}
      >
        {title}
      </h3>
      <p className={`mt-1 text-sm ${themeStyles.subtle}`}>{subtitle}</p>
    </div>
    <div className="space-y-4">{children}</div>
    <div className="mt-6 flex justify-end">
      <button
        type="submit"
        disabled={isSubmitting}
        className={primaryButtonClass}
      >
        {isSubmitting ? "Saving…" : "Create question"}
      </button>
    </div>
  </form>
);

const TextInput = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  labelClass,
  inputClass,
}) => (
  <label className={labelClass}>
    {label}
    <input
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      required={required}
      className={inputClass}
    />
  </label>
);

const NumberInput = ({
  label,
  value,
  onChange,
  step = "1",
  min,
  required,
  labelClass,
  inputClass,
}) => (
  <label className={labelClass}>
    {label}
    <input
      type="number"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      step={step}
      min={min}
      required={required}
      className={inputClass}
    />
  </label>
);

const DateInput = ({
  label,
  value,
  onChange,
  required,
  type = "date",
  step,
  labelClass,
  inputClass,
}) => (
  <label className={labelClass}>
    {label}
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      step={step}
      className={inputClass}
    />
  </label>
);

const Textarea = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  labelClass,
  textareaClass,
}) => (
  <label className={labelClass}>
    {label}
    <textarea
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      rows={3}
      required={required}
      className={textareaClass}
    />
  </label>
);

const QuestionRow = ({
  question,
  onUpdate,
  onDelete,
  themeStyles = THEME_CONFIG.dark,
  inputClass,
  secondaryButtonClass,
  dangerButtonClass,
  chipClass,
  mutedTextClass,
  awardOptions,
  playerOptions,
  teamOptions,
  activeSeason,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const getInitialDraft = useCallback(() => {
    const initial = { ...question };
    if (initial.award_id !== undefined) {
      initial.award = initial.award_id;
    }
    if (initial.related_player_id !== undefined) {
      initial.related_player = initial.related_player_id;
    }
    if (initial.team1_id !== undefined) {
      initial.team1 = initial.team1_id;
    }
    if (initial.team2_id !== undefined) {
      initial.team2 = initial.team2_id;
    }
    if (initial.player_stat_id !== undefined) {
      initial.player_stat = initial.player_stat_id;
    }
    return initial;
  }, [question]);

  const [draft, setDraft] = useState(getInitialDraft());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(getInitialDraft());
    }
  }, [question, isEditing, getInitialDraft]);

  const handleSave = async () => {
    setBusy(true);

    const basePayload = {
      text: draft.text.trim(),
      point_value: Number(draft.point_value),
    };

    let specificPayload = {};

    switch (question.question_type) {
      case "superlative":
        specificPayload = {
          award_id: draft.award ? Number(draft.award) : Number(draft.award_id),
        };
        break;
      case "prop":
        specificPayload = {
          outcome_type: draft.outcome_type,
          related_player_id: draft.related_player
            ? Number(draft.related_player)
            : draft.related_player_id
              ? Number(draft.related_player_id)
              : null,
          line:
            draft.outcome_type === "over_under" && draft.line !== "" && draft.line != null
              ? Number(draft.line)
              : null,
        };
        break;
      case "player_stat":
        specificPayload = {
          player_stat_id: draft.player_stat
            ? Number(draft.player_stat)
            : Number(draft.player_stat_id),
          stat_type: (draft.stat_type || "").trim(),
          fixed_value:
            draft.fixed_value !== "" && draft.fixed_value != null
              ? Number(draft.fixed_value)
              : null,
        };
        break;
      case "head_to_head":
        specificPayload = {
          team1_id: draft.team1 ? Number(draft.team1) : Number(draft.team1_id),
          team2_id: draft.team2 ? Number(draft.team2) : Number(draft.team2_id),
        };
        break;
      case "ist":
        specificPayload = {
          prediction_type: draft.prediction_type,
          ist_group: draft.ist_group || null,
          is_tiebreaker: Boolean(
            draft.prediction_type === "tiebreaker" || draft.is_tiebreaker,
          ),
        };
        break;
      case "nba_finals":
        specificPayload = {
          group_name: draft.group_name || null,
        };
        break;
      default:
        break;
    }

    const payload = { ...basePayload, ...specificPayload };

    await onUpdate(payload);
    setBusy(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(getInitialDraft());
  };

  const bodyTextClass = `text-sm leading-relaxed ${themeStyles.textSecondary}`;
  const metaTextClass = `text-xs ${themeStyles.muted}`;

  const renderEditingFields = () => {
    switch (question.question_type) {
      case "superlative":
        return (
          <SelectComponent
            options={awardOptions}
            value={
              awardOptions.find((option) => option.value === draft.award) ||
              null
            }
            onChange={(option) =>
              setDraft((prev) => ({
                ...prev,
                award: option ? option.value : null,
              }))
            }
            placeholder="Select award"
            isClearable
            mode={themeStyles.mode}
          />
        );
      case "prop":
        return (
          <div className="space-y-4">
            <label className={`text-xs ${themeStyles.subtle}`}>
              Outcome type
              <select
                value={draft.outcome_type}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    outcome_type: e.target.value,
                  }))
                }
                className={`${inputClass} mt-2 w-full`}
              >
                <option value="over_under">Over / Under</option>
                <option value="yes_no">Yes / No</option>
              </select>
            </label>
            {draft.outcome_type === "over_under" && (
              <label className={`text-xs ${themeStyles.subtle}`}>
                Line
                <input
                  type="number"
                  value={draft.line || ""}
                  step="0.1"
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, line: e.target.value }))
                  }
                  className={`${inputClass} mt-2 w-full`}
                />
              </label>
            )}
            <SelectComponent
              options={playerOptions}
              value={
                playerOptions.find(
                  (option) => option.value === draft.related_player,
                ) || null
              }
              onChange={(option) =>
                setDraft((prev) => ({
                  ...prev,
                  related_player: option ? option.value : null,
                }))
              }
              placeholder="Search related player"
              isClearable
              mode={themeStyles.mode}
            />
          </div>
        );
      case "head_to_head":
        return (
          <div className="space-y-4">
            <SelectComponent
              options={teamOptions}
              value={
                teamOptions.find((option) => option.value === draft.team1) ||
                null
              }
              onChange={(option) =>
                setDraft((prev) => ({
                  ...prev,
                  team1: option ? option.value : null,
                }))
              }
              placeholder="Select team 1"
              isClearable
              mode={themeStyles.mode}
            />
            <SelectComponent
              options={teamOptions}
              value={
                teamOptions.find((option) => option.value === draft.team2) ||
                null
              }
              onChange={(option) =>
                setDraft((prev) => ({
                  ...prev,
                  team2: option ? option.value : null,
                }))
              }
              placeholder="Select team 2"
              isClearable
              mode={themeStyles.mode}
            />
          </div>
        );
      case "player_stat":
        return (
          <div className="space-y-4">
            <label className={`text-xs ${themeStyles.subtle}`}>
              Player Stat ID
              <input
                type="number"
                value={draft.player_stat || ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, player_stat: e.target.value }))
                }
                className={`${inputClass} mt-2 w-full`}
              />
            </label>
            <label className={`text-xs ${themeStyles.subtle}`}>
              Stat Type
              <input
                type="text"
                value={draft.stat_type || ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, stat_type: e.target.value }))
                }
                className={`${inputClass} mt-2 w-full`}
              />
            </label>
            <label className={`text-xs ${themeStyles.subtle}`}>
              Fixed Value
              <input
                type="number"
                step="0.1"
                value={draft.fixed_value || ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, fixed_value: e.target.value }))
                }
                className={`${inputClass} mt-2 w-full`}
              />
            </label>
          </div>
        );
      case "ist":
        return (
          <div className="space-y-4">
            <label className={`text-xs ${themeStyles.subtle}`}>
              Prediction Type
              <select
                value={draft.prediction_type}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    prediction_type: e.target.value,
                  }))
                }
                className={`${inputClass} mt-2 w-full`}
              >
                <option value="group_winner">Group Winner</option>
                <option value="wildcard">Wildcard</option>
                <option value="conference_winner">Conference Winner</option>
                <option value="tiebreaker">Tiebreaker</option>
              </select>
            </label>
            <label className={`text-xs ${themeStyles.subtle}`}>
              IST Group
              <input
                type="text"
                value={draft.ist_group || ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, ist_group: e.target.value }))
                }
                className={`${inputClass} mt-2 w-full`}
              />
            </label>
            <label
              className={`flex items-center gap-2 text-xs ${themeStyles.subtle}`}
            >
              <input
                type="checkbox"
                checked={draft.is_tiebreaker || false}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    is_tiebreaker: e.target.checked,
                  }))
                }
                className={
                  themeStyles.mode === "dark"
                    ? "h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/60"
                    : "h-4 w-4 rounded border-slate-300 bg-white text-blue-500 focus:ring-blue-500/40"
                }
              />
              Is Tiebreaker
            </label>
          </div>
        );
      case "nba_finals":
        return (
          <label className={`text-xs ${themeStyles.subtle}`}>
            Group Name
            <input
              type="text"
              value={draft.group_name || ""}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, group_name: e.target.value }))
              }
              className={`${inputClass} mt-2 w-full`}
            />
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 px-8 py-6 md:flex-row md:items-start md:justify-between">
      <div className="flex-1 space-y-3">
        <div
          className={`flex items-center gap-3 text-xs uppercase tracking-[0.3em] ${themeStyles.subtle}`}
        >
          <span
            className={
              chipClass ||
              `rounded-full bg-slate-200/10 px-3 py-1 text-slate-200`
            }
          >
            {question.question_type}
          </span>
          <span className={mutedTextClass || metaTextClass}>
            ID #{question.id}
          </span>
        </div>
        {isEditing ? (
          <textarea
            value={draft.text}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, text: e.target.value }))
            }
            className={`${inputClass} w-full`}
            rows={3}
          />
        ) : (
          <p className={bodyTextClass}>{question.text}</p>
        )}
        <div className={`flex flex-wrap gap-3 text-xs ${themeStyles.muted}`}>
          <span>Points: {question.point_value}</span>
          <span>
            Updated: {new Date(question.last_updated).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {isEditing && (
          <div className="space-y-4">
            <label className={`text-xs ${themeStyles.subtle}`}>
              Point value
              <input
                type="number"
                value={draft.point_value}
                min="0"
                step="0.5"
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, point_value: e.target.value }))
                }
                className={`${inputClass} mt-2 w-full`}
              />
            </label>
            {renderEditingFields()}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={busy}
            className={`${secondaryButtonClass} flex-1`}
          >
            {isEditing ? (busy ? "Saving…" : "Save") : "Edit"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className={dangerButtonClass}
          >
            Delete
          </button>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className={`text-xs ${themeStyles.subtle} transition hover:opacity-80`}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
