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
      className={`mt-1 text-sm ${className}`}
      classNamePrefix="react-select"
      placeholder={placeholder}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      noOptionsMessage={() => 'No options found'}
      styles={{
        control: (provided, state) => ({
          ...provided,
          minHeight: '44px',
          backgroundColor: state.isDisabled
            ? isLight
              ? '#f8fafc'
              : '#1e293b'
            : isLight
              ? '#ffffff'
              : '#0f172a',
          borderRadius: '14px',
          borderWidth: '1px',
          borderColor: hasError
            ? '#f87171'
            : state.isFocused
              ? '#2563eb'
              : isLight
                ? '#cbd5f5'
                : '#334155',
          boxShadow: hasError
            ? '0 0 0 1px #f87171'
            : state.isFocused
              ? '0 0 0 1px #2563eb'
              : 'none',
          paddingLeft: '0.25rem',
          paddingRight: '0.5rem',
          '&:hover': {
            borderColor: hasError ? '#f87171' : '#2563eb',
          },
          color: isLight ? '#0f172a' : '#e2e8f0',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        }),
        placeholder: (provided) => ({
          ...provided,
          color: isLight ? '#64748b' : '#94a3b8',
          fontWeight: 500,
          letterSpacing: '0.01em',
        }),
        singleValue: (provided, state) => ({
          ...provided,
          color: state.isDisabled
            ? isLight
              ? '#475569'
              : '#94a3b8'
            : isLight
              ? '#0f172a'
              : '#e2e8f0',
        }),
        input: (provided) => ({
          ...provided,
          color: isLight ? '#0f172a' : '#f8fafc',
          fontSize: '0.95rem',
        }),
        valueContainer: (provided) => ({
          ...provided,
          padding: '0.4rem 0.5rem',
          gap: '0.35rem',
        }),
        dropdownIndicator: (provided, state) => ({
          ...provided,
          color: state.isFocused
            ? '#2563eb'
            : isLight
              ? '#94a3b8'
              : '#64748b',
          padding: '0.4rem',
        }),
        clearIndicator: (provided) => ({
          ...provided,
          color: isLight ? '#94a3b8' : '#cbd5f5',
          padding: '0.4rem',
        }),
        indicatorSeparator: (provided) => ({
          ...provided,
          backgroundColor: isLight ? 'rgba(148, 163, 184, 0.45)' : 'rgba(71, 85, 105, 0.6)',
        }),
        menu: (provided) => ({
          ...provided,
          backgroundColor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.95)',
          border: isLight
            ? '1px solid rgba(203, 213, 225, 0.8)'
            : '1px solid rgba(148, 163, 184, 0.35)',
          boxShadow: isLight
            ? '0 10px 25px rgba(15, 23, 42, 0.08)'
            : '0 10px 25px rgba(15, 23, 42, 0.45)',
          borderRadius: '14px',
          overflow: 'hidden',
          marginTop: '0.5rem',
        }),
        menuList: (provided) => ({
          ...provided,
          padding: '0.5rem 0',
          maxHeight: '240px',
        }),
        option: (provided, state) => ({
          ...provided,
          padding: '0.6rem 0.85rem',
          backgroundColor: state.isFocused
            ? isLight
              ? 'rgba(59, 130, 246, 0.12)'
              : 'rgba(59, 130, 246, 0.18)'
            : 'transparent',
          color: isLight ? '#0f172a' : '#e2e8f0',
          fontWeight: state.isSelected ? 600 : 500,
        }),
        menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
      }}
      menuPortalTarget={document.body}
    />
  );
};

export default SelectComponent;
