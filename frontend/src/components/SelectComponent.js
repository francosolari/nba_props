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
          minHeight: '42px',
          backgroundColor: state.isDisabled
            ? isLight
              ? '#f8fafc'
              : '#1e293b'
            : isLight
              ? '#ffffff'
              : '#0f172a',
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
          '&:hover': {
            borderColor: hasError ? '#f87171' : '#2563eb',
          },
          color: isLight ? '#0f172a' : '#e2e8f0',
        }),
        placeholder: (provided) => ({
          ...provided,
          color: isLight ? '#64748b' : '#94a3b8',
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
        }),
        menuList: (provided) => ({
          ...provided,
          padding: '8px 0',
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isFocused
            ? isLight
              ? 'rgba(59, 130, 246, 0.12)'
              : 'rgba(59, 130, 246, 0.18)'
            : 'transparent',
          color: isLight ? '#0f172a' : '#e2e8f0',
        }),
        menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
      }}
      menuPortalTarget={document.body}
    />
  );
};

export default SelectComponent;
