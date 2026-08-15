import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Courtside Album listbox for compact season and filter choices.
 * Accepts option children so it can replace a native select without changing callers.
 */
export default function CourtSelect({
  label = 'Select an option',
  showLabel = true,
  className = '',
  children,
  value,
  onChange,
  disabled = false,
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const options = useMemo(
    () => React.Children.toArray(children)
      .filter((child) => React.isValidElement(child))
      .map((child) => ({
        value: child.props.value,
        label: child.props.children,
        disabled: Boolean(child.props.disabled),
      })),
    [children],
  );
  const selectedIndex = Math.max(0, options.findIndex((option) => String(option.value) === String(value)));
  const selectedOption = options[selectedIndex];
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  const selectOption = (option) => {
    if (!option || option.disabled) return;
    onChange?.({ target: { value: option.value } });
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setActiveIndex(selectedIndex);
      setIsOpen(true);
    }
  };

  const handleOptionKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (current + direction + options.length) % options.length);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(options[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      className={`court-select ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="court-select__trigger"
        aria-label={!showLabel ? label : undefined}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={showLabel ? 'court-select__label' : 'sr-only'}>{label}</span>
        <span className="court-select__value">{selectedOption?.label || label}</span>
        <ChevronDown className="court-select__icon" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="court-select__menu" role="listbox" aria-label={label}>
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                key={String(option.value)}
                ref={(node) => { optionRefs.current[index] = node; }}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`court-select__option ${isSelected ? 'is-selected' : ''}`}
                disabled={option.disabled}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => selectOption(option)}
                onKeyDown={handleOptionKeyDown}
              >
                <span>{option.label}</span>
                {isSelected && <Check aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
