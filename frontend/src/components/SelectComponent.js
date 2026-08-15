// src/components/SelectComponent.js

import React, { useMemo } from 'react';
import Select from 'react-select';

/**
 * Reusable wrapper around react-select with sensible defaults.
 * Supports passing either the full option object or a primitive value.
 */
const SelectComponent = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  hasError = false,
  isDisabled = false,
  isClearable = true,
  isSearchable = true,
  className = '',
  mode = 'dark',
}) => {
  const isLight = mode === 'light';
  const normalizedValue = useMemo(() => {
    if (!value) return null;
    if (typeof value === 'object' && 'value' in value) {
      return value;
    }
    return options.find((option) => option.value === value) || null;
  }, [options, value]);

  const handleChange = (selected) => {
    if (typeof onChange === 'function') {
      onChange(selected);
    }
  };

  return (
    <Select
      options={options}
      value={normalizedValue}
      onChange={handleChange}
      className={`${isLight ? 'court-combobox' : ''} mt-1 text-sm ${className}`.trim()}
      classNamePrefix={isLight ? 'court-combobox' : 'react-select'}
      placeholder={placeholder}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      aria-invalid={hasError || undefined}
      noOptionsMessage={() => 'No options found'}
      styles={{
        control: (provided, state) => ({
          ...provided,
          minHeight: isLight ? '48px' : '44px',
          backgroundColor: state.isDisabled
            ? isLight
              ? 'var(--court-sheet-wash, #f5f8fa)'
              : '#1e293b'
            : isLight
              ? 'var(--court-paper, #ffffff)'
              : '#0f172a',
          borderRadius: isLight ? '4px' : '14px',
          borderWidth: isLight ? '2px' : '1px',
          borderColor: hasError
            ? 'var(--court-danger, #b42318)'
            : state.isFocused
              ? isLight
                ? 'var(--court-rule, #15181a)'
                : '#2563eb'
              : isLight
                ? 'var(--court-rule, #15181a)'
                : '#334155',
          boxShadow: hasError
            ? '0 0 0 3px var(--court-red-soft, #fcecea)'
            : state.isFocused
              ? isLight
                ? '0 0 0 3px var(--court-gold, #e7b92f)'
                : '0 0 0 1px #2563eb'
              : 'none',
          paddingLeft: isLight ? '0.125rem' : '0.25rem',
          paddingRight: isLight ? '0.25rem' : '0.5rem',
          '&:hover': {
            borderColor: hasError
              ? 'var(--court-danger, #b42318)'
              : isLight
                ? 'var(--court-blue, #07549a)'
                : '#2563eb',
          },
          color: isLight ? 'var(--court-ink, #101214)' : '#e2e8f0',
          fontFamily: isLight ? 'var(--court-text, "Source Sans 3", system-ui, sans-serif)' : undefined,
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        }),
        placeholder: (provided) => ({
          ...provided,
          color: isLight ? 'var(--court-steel, #53606d)' : '#94a3b8',
          fontWeight: isLight ? 600 : 500,
          letterSpacing: '0.01em',
        }),
        singleValue: (provided, state) => ({
          ...provided,
          color: state.isDisabled
            ? isLight
              ? '#475569'
              : '#94a3b8'
            : isLight
              ? 'var(--court-ink, #101214)'
              : '#e2e8f0',
          fontWeight: isLight ? 700 : undefined,
        }),
        input: (provided) => ({
          ...provided,
          color: isLight ? 'var(--court-ink, #101214)' : '#f8fafc',
          fontSize: isLight ? '1rem' : '0.95rem',
        }),
        valueContainer: (provided) => ({
          ...provided,
          padding: isLight ? '0.45rem 0.625rem' : '0.4rem 0.5rem',
          gap: '0.35rem',
        }),
        dropdownIndicator: (provided, state) => ({
          ...provided,
          color: state.isFocused
            ? isLight
              ? 'var(--court-blue, #07549a)'
              : '#2563eb'
            : isLight
              ? 'var(--court-ink, #101214)'
              : '#64748b',
          padding: isLight ? '0.55rem' : '0.4rem',
        }),
        clearIndicator: (provided) => ({
          ...provided,
          color: isLight ? 'var(--court-steel, #53606d)' : '#cbd5f5',
          padding: '0.4rem',
        }),
        indicatorSeparator: (provided) => ({
          ...provided,
          backgroundColor: isLight ? 'var(--court-rule-soft, #cfd4d8)' : 'rgba(71, 85, 105, 0.6)',
        }),
        menu: (provided) => ({
          ...provided,
          backgroundColor: isLight ? 'var(--court-paper, #ffffff)' : 'rgba(15, 23, 42, 0.95)',
          border: isLight
            ? '2px solid var(--court-rule, #15181a)'
            : '1px solid rgba(148, 163, 184, 0.35)',
          boxShadow: isLight
            ? '4px 4px 0 var(--court-rule, #15181a)'
            : '0 10px 25px rgba(15, 23, 42, 0.45)',
          borderRadius: isLight ? '3px' : '14px',
          overflow: 'hidden',
          marginTop: isLight ? '0.35rem' : '0.5rem',
        }),
        menuList: (provided) => ({
          ...provided,
          padding: isLight ? '0' : '0.5rem 0',
          maxHeight: '240px',
        }),
        option: (provided, state) => ({
          ...provided,
          minHeight: isLight ? '44px' : undefined,
          padding: isLight ? '0.7rem 0.85rem' : '0.6rem 0.85rem',
          backgroundColor: state.isSelected
            ? isLight
              ? 'var(--court-blue, #07549a)'
              : '#2563eb'
            : state.isFocused
              ? isLight
                ? 'var(--court-blue-soft, #e8f2fb)'
                : 'rgba(59, 130, 246, 0.18)'
              : 'transparent',
          color: state.isSelected
            ? '#ffffff'
            : isLight
              ? 'var(--court-ink, #101214)'
              : '#e2e8f0',
          fontWeight: state.isSelected ? 800 : 600,
          borderBottom: isLight ? '1px solid var(--court-rule-soft, #cfd4d8)' : undefined,
        }),
        menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
      }}
      menuPortalTarget={document.body}
    />
  );
};

export default SelectComponent;
