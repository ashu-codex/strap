'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
  > {
  /** Controlled numeric value (null or undefined represents an empty field). */
  value: number | '' | null | undefined;
  /** Called when the numeric value changes. Emits null when the user clears the input. */
  onValueChange: (value: number | null) => void;
  /** Allow decimal numbers (default: true). Set false for integers only. */
  allowDecimal?: boolean;
  /** Minimum valid number (clamped on blur). */
  min?: number;
  /** Maximum valid number (clamped on blur). */
  max?: number;
  /**
   * Optional fallback applied ONLY on blur when the field is left empty and genuinely requires a value.
   * Leave undefined to allow empty optional fields.
   */
  defaultOnBlur?: number;
}

function formatNumericValue(value: number | '' | null | undefined): string {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'number' && !Number.isFinite(value)) return '';
  return String(value);
}

/**
 * Globally safe numeric input for STRAP.
 * - Keeps an editable string while focused so users can clear all digits without auto-inserting "0".
 * - Prevents leading-zero concatenation bugs (e.g. clearing "75" and typing "80" yields "80", never "080").
 * - Uses mobile-friendly inputMode ("decimal" or "numeric") and validates bounds cleanly on blur.
 */
export default function NumericInput({
  value,
  onValueChange,
  allowDecimal = true,
  min,
  max,
  defaultOnBlur,
  onFocus,
  onBlur,
  className = '',
  inputMode,
  ...rest
}: NumericInputProps) {
  const [text, setText] = useState<string>(() => formatNumericValue(value));
  const isFocusedRef = useRef(false);
  const lastEmittedRef = useRef<number | null>(
    typeof value === 'number' && Number.isFinite(value) ? value : null
  );

  // Sync external programmatic changes (e.g. loading saved profile, template swap, preset click)
  useEffect(() => {
    const normalizedExternal =
      typeof value === 'number' && Number.isFinite(value) ? value : null;

    if (isFocusedRef.current && normalizedExternal === lastEmittedRef.current) {
      return;
    }

    lastEmittedRef.current = normalizedExternal;
    setText(formatNumericValue(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Normalize comma decimal separators from international mobile keyboards
    if (allowDecimal) {
      raw = raw.replace(/,/g, '.');
    }

    // Allow clearing completely without injecting 0
    if (raw === '') {
      setText('');
      lastEmittedRef.current = null;
      onValueChange(null);
      return;
    }

    // Validate character pattern
    const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
    if (!pattern.test(raw)) {
      return;
    }

    // Prevent leading-zero concatenation like "080" -> "80", while preserving "0" and "0.5"
    if (/^0\d+/.test(raw)) {
      raw = raw.replace(/^0+/, '') || '0';
    }

    setText(raw);

    // Intermediate typing states like "." or "75." keep the displayed string without forcing 0
    if (raw === '.') {
      lastEmittedRef.current = null;
      onValueChange(null);
      return;
    }

    const parsed = allowDecimal ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }

    lastEmittedRef.current = parsed;
    onValueChange(parsed);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    const trimmed = text.trim();

    if (trimmed === '' || trimmed === '.') {
      if (defaultOnBlur !== undefined) {
        lastEmittedRef.current = defaultOnBlur;
        setText(String(defaultOnBlur));
        onValueChange(defaultOnBlur);
      } else {
        lastEmittedRef.current = null;
        setText('');
        onValueChange(null);
      }
      onBlur?.(e);
      return;
    }

    let parsed = allowDecimal ? parseFloat(trimmed) : parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      const fallback = defaultOnBlur !== undefined ? defaultOnBlur : null;
      lastEmittedRef.current = fallback;
      setText(fallback !== null ? String(fallback) : '');
      onValueChange(fallback);
      onBlur?.(e);
      return;
    }

    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;
    if (!allowDecimal) parsed = Math.round(parsed);

    lastEmittedRef.current = parsed;
    setText(String(parsed));
    onValueChange(parsed);
    onBlur?.(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={inputMode ?? (allowDecimal ? 'decimal' : 'numeric')}
      autoComplete={rest.autoComplete ?? 'off'}
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
    />
  );
}
