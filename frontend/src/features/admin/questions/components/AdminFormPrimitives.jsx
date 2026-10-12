import React from 'react';
import { ADMIN_STYLES } from '../adminPanelStyles';

export const ScreenMessage = ({
  title,
  message,
  variant = "default",
  themeStyles = ADMIN_STYLES,
}) => {
  const errorClass = "text-[var(--court-danger)]";
  return (
    <div
      className={`flex min-h-screen items-center justify-center ${themeStyles.background}`}
    >
      <div
        className={`${themeStyles.glassCard} mx-6 max-w-md p-10 text-center`}
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

export const GlassFormCard = ({
  title,
  subtitle,
  children,
  isSubmitting,
  onSubmit,
  themeStyles = ADMIN_STYLES,
  primaryButtonClass,
}) => (
  // Lives inside the composer sheet, so no frame of its own; the type picker
  // above already names the form.
  <form onSubmit={onSubmit} aria-label={title}>
    <p className={`mb-4 text-sm ${themeStyles.subtle}`}>{subtitle}</p>
    <div className="space-y-4">{children}</div>
    <button
      type="submit"
      disabled={isSubmitting}
      className={`${primaryButtonClass} mt-6 w-full`}
    >
      {isSubmitting ? "Saving…" : "Create question"}
    </button>
  </form>
);

export const TextInput = ({
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

export const NumberInput = ({
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

export const DateInput = ({
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

export const Textarea = ({
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
