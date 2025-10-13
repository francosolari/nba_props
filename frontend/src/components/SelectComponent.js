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
}) => {
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
          backgroundColor: state.isDisabled ? '#1f2937' : provided.backgroundColor,
          borderColor: hasError
            ? '#f87171'
            : state.isFocused
              ? '#2563eb'
              : provided.borderColor,
          boxShadow: hasError
            ? '0 0 0 1px #f87171'
            : state.isFocused
              ? '0 0 0 1px #2563eb'
              : provided.boxShadow,
          '&:hover': {
            borderColor: hasError ? '#f87171' : '#2563eb',
          },
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
        }),
        placeholder: (provided) => ({
          ...provided,
          color: '#9ca3af',
        }),
        singleValue: (provided) => ({
          ...provided,
          color: '#e2e8f0',
        }),
        input: (provided) => ({
          ...provided,
          color: '#f8fafc',
        }),
        menu: (provided) => ({
          ...provided,
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }),
        menuList: (provided) => ({
          ...provided,
          padding: '8px 0',
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isFocused ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
          color: '#e2e8f0',
        }),
        menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
      }}
      menuPortalTarget={document.body}
    />
  );
};

export default SelectComponent;
