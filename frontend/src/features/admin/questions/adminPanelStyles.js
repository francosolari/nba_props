// Courtside Album chrome — a single flat style set. No light/dark branching
// here: every value below is a CSS custom property that already swaps itself
// when the global theme toggle sets data-theme="dark" on <html>.
export const ADMIN_STYLES = {
  mode: "light",
  background: "bg-[var(--court-paper)] text-[var(--court-ink)]",
  glassCard: "bg-[var(--court-paper)] border-2 border-[var(--court-rule)]",
  panelCard: "bg-[var(--court-paper)] border-2 border-[var(--court-rule)]",
  heading: "text-[var(--court-ink)]",
  textSecondary: "text-[var(--court-steel)]",
  subheading: "text-[var(--court-steel)]",
  muted: "text-[var(--court-muted)]",
  subtle: "text-[var(--court-steel)]",
  chip: "bg-[var(--court-sheet-wash)] text-[var(--court-steel)]",
  inputBg: "bg-[var(--court-paper)]",
  inputText: "text-[var(--court-ink)]",
  focusRing: "focus:ring-0",
  divider: "divide-[var(--court-rule-soft)]",
  overlay: "bg-[rgb(10_18_30_/_72%)]",
  sheet: "bg-[var(--court-paper)]",
  sheetCard: "bg-[var(--court-paper)] border-2 border-[var(--court-rule)]",
  summaryCard: "bg-[var(--court-paper)] border-2 border-[var(--court-rule)]",
  softSurface: "bg-[var(--court-sheet-wash)]",
  secondaryButton:
    "bg-[var(--court-paper)] text-[var(--court-ink)] border-2 border-[var(--court-rule)] hover:bg-[var(--court-blue-soft)]",
  dangerButton:
    "bg-[var(--court-red-soft)] text-[var(--court-danger)] border-2 border-[var(--court-danger)] hover:bg-[var(--court-red-soft)]",
  primaryButton:
    "bg-[var(--court-blue)] text-white border-2 border-[var(--court-rule)] hover:bg-[var(--court-blue-dark)]",
  accentButton:
    "bg-[var(--court-paper)] text-[var(--court-blue)] border-2 border-[var(--court-blue)] hover:bg-[var(--court-blue-soft)]",
  note: "text-[var(--court-steel)]",
};

export const defaultPointValue = 0.5;

export const defaultSeasonForm = {
  year: "",
  start_date: "",
  end_date: "",
  submission_start_date: "",
  submission_end_date: "",
};

export const formatDate = (value) => {
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

export const formatDateTime = (value) => {
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

// Shared className bundle derived from ADMIN_STYLES, built once here so every
// form/section component gets identical control chrome without re-deriving it.
export const buildAdminClasses = (themeStyles = ADMIN_STYLES) => {
  const labelClass = `flex flex-col gap-2 text-sm ${themeStyles.textSecondary}`;
  const inputClass = `court-admin-input w-full ${themeStyles.inputBg} ${themeStyles.inputText}`;
  const textareaClass = `${inputClass} h-auto py-3 resize-none`;
  const selectClass = inputClass;
  const checkboxClass =
    "h-4 w-4 rounded-[2px] border-2 border-[var(--court-rule)] bg-[var(--court-paper)] text-[var(--court-blue)] focus:ring-0";
  const courtButtonBase =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded px-5 py-2.5 font-[var(--court-display)] text-sm font-bold uppercase tracking-wide transition-colors duration-150";
  const primaryButtonClass = `${courtButtonBase} ${themeStyles.primaryButton} disabled:cursor-not-allowed disabled:opacity-60`;
  const secondaryButtonClass = `${courtButtonBase} ${themeStyles.secondaryButton} disabled:cursor-not-allowed disabled:opacity-60`;
  const accentButtonClass = `${courtButtonBase} ${themeStyles.accentButton}`;
  const dangerButtonClass = `${courtButtonBase} px-3 py-2 text-xs ${themeStyles.dangerButton} disabled:cursor-not-allowed disabled:opacity-60`;
  const themeCardClass = `${themeStyles.glassCard} w-full p-6`;
  const batchCardClass = `${themeStyles.glassCard} p-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between`;
  const headingClass = `text-lg font-semibold tracking-wide ${themeStyles.heading}`;
  const subheadingClass = `text-sm ${themeStyles.subheading}`;
  const mutedTextClass = `text-xs ${themeStyles.muted}`;
  const chipClass = `court-admin-badge court-admin-badge--neutral`;
  const successBannerClass = "border-[var(--court-success)] bg-[var(--court-success-soft)] text-[var(--court-success)]";
  const errorBannerClass = "border-[var(--court-danger)] bg-[var(--court-red-soft)] text-[var(--court-danger)]";

  return {
    labelClass,
    inputClass,
    textareaClass,
    selectClass,
    checkboxClass,
    primaryButtonClass,
    secondaryButtonClass,
    accentButtonClass,
    dangerButtonClass,
    themeCardClass,
    batchCardClass,
    headingClass,
    subheadingClass,
    mutedTextClass,
    chipClass,
    successBannerClass,
    errorBannerClass,
  };
};
