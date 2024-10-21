// src/components/SelectComponent.js

import React from 'react';
import Select from 'react-select';

const SelectComponent = ({ options, value, onChange, placeholder, hasError }) => {
  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      className={`mt-1 text-sm ${hasError ? 'border-red-500' : ''}`}
      classNamePrefix="react-select"
      placeholder={placeholder || "Select an option"}
      isClearable
      noOptionsMessage={() => "No options found"}
      styles={{
        singleValue: (provided) => ({
          ...provided,
          padding: '2px 4px',
          borderRadius: '4px',
          transition: 'background-color 0.3s ease',
        }),
        control: (provided, state) => ({
          ...provided,
          backgroundColor: state.hasValue ? '#f0fff4' : provided.backgroundColor,
          borderColor: hasError
            ? '#f56565'
            : state.hasValue
              ? '#38a169'
              : state.isFocused
                ? '#3182ce'
                : provided.borderColor,
          boxShadow: hasError
            ? '0 0 0 1px #f56565'
            : state.hasValue
              ? '0 0 0 1px #38a169'
              : state.isFocused
                ? '0 0 0 1px #3182ce'
                : provided.boxShadow,
          '&:hover': {
            borderColor: hasError
              ? '#f56565'
              : state.hasValue
                ? '#38a169'
                : '#3182ce',
          },
        }),
        valueContainer: (provided) => ({
          ...provided,
          padding: '0px 8px',
        }),
      }}
    />
  );
};

export default SelectComponent;