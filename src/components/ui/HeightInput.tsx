'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  HeightUnit,
  cmToFtIn,
  ftInToCm,
  validateFtIn,
  validateHeightCm,
} from '@/lib/height';

export interface HeightInputProps {
  heightCm: number;
  unit: HeightUnit;
  onChange: (nextHeightCm: number, nextUnit: HeightUnit, isValid: boolean) => void;
  label?: string;
  className?: string;
}

function formatCmValue(cm: number): string {
  if (!Number.isFinite(cm) || cm <= 0) return '';
  return String(Math.round(cm * 10) / 10);
}

export default function HeightInput({
  heightCm,
  unit,
  onChange,
  label = 'Height',
  className = '',
}: HeightInputProps) {
  const initialFtIn = cmToFtIn(heightCm);
  const [cmStr, setCmStr] = useState<string>(() => formatCmValue(heightCm));
  const [feetStr, setFeetStr] = useState<string>(() =>
    heightCm > 0 ? String(initialFtIn.feet) : ''
  );
  const [inchesStr, setInchesStr] = useState<string>(() =>
    heightCm > 0 ? String(initialFtIn.inches) : ''
  );
  const [error, setError] = useState<string | null>(null);

  // Tracks whether user edited ft/in while in ft_in mode so toggling back to cm preserves exact cm when unedited
  const ftInDirtyRef = useRef<boolean>(false);
  const lastEmittedRef = useRef<{ cm: number; unit: HeightUnit }>({
    cm: heightCm,
    unit,
  });

  // Sync if parent updates heightCm or unit externally (e.g. after loading saved profile/metrics)
  useEffect(() => {
    const prev = lastEmittedRef.current;
    if (heightCm === prev.cm && unit === prev.unit) return;

    lastEmittedRef.current = { cm: heightCm, unit };
    ftInDirtyRef.current = false;

    setCmStr(formatCmValue(heightCm));
    if (heightCm > 0) {
      const converted = cmToFtIn(heightCm);
      setFeetStr(String(converted.feet));
      setInchesStr(String(converted.inches));
      setError(
        unit === 'cm'
          ? validateHeightCm(heightCm)
          : validateFtIn(converted.feet, converted.inches)
      );
    } else {
      setFeetStr('');
      setInchesStr('');
    }
  }, [heightCm, unit]);

  const handleUnitSwitch = (nextUnit: HeightUnit) => {
    if (nextUnit === unit) return;

    if (nextUnit === 'ft_in') {
      // Switching CM -> FT + IN
      const parsedCm = cmStr.trim() === '' ? NaN : Number(cmStr);
      if (Number.isFinite(parsedCm) && parsedCm > 0 && !validateHeightCm(parsedCm)) {
        const converted = cmToFtIn(parsedCm);
        setFeetStr(String(converted.feet));
        setInchesStr(String(converted.inches));
        ftInDirtyRef.current = false;
        setError(null);
        lastEmittedRef.current = { cm: parsedCm, unit: 'ft_in' };
        onChange(parsedCm, 'ft_in', true);
      } else {
        // Keep current numeric heightCm if available, or show validation
        const fallbackCm = heightCm > 0 ? heightCm : 175;
        const converted = cmToFtIn(fallbackCm);
        setFeetStr(heightCm > 0 ? String(converted.feet) : '');
        setInchesStr(heightCm > 0 ? String(converted.inches) : '');
        ftInDirtyRef.current = false;
        const err = heightCm > 0 ? validateFtIn(converted.feet, converted.inches) : 'Height must be greater than 0.';
        setError(err);
        lastEmittedRef.current = { cm: heightCm, unit: 'ft_in' };
        onChange(heightCm, 'ft_in', err === null);
      }
      return;
    }

    // Switching FT + IN -> CM
    const parsedFeet = feetStr.trim() === '' ? NaN : Number(feetStr);
    const parsedInches = inchesStr.trim() === '' ? NaN : Number(inchesStr);
    const ftInErr = validateFtIn(parsedFeet, parsedInches);

    if (!ftInDirtyRef.current && heightCm > 0 && !validateHeightCm(heightCm)) {
      // Preserve exact cm entered prior to switching to avoid any rounding drift
      const exactStr = formatCmValue(heightCm);
      setCmStr(exactStr);
      setError(null);
      lastEmittedRef.current = { cm: heightCm, unit: 'cm' };
      onChange(heightCm, 'cm', true);
      return;
    }

    if (!ftInErr) {
      const convertedCm = ftInToCm(parsedFeet, parsedInches);
      setCmStr(formatCmValue(convertedCm));
      setError(null);
      lastEmittedRef.current = { cm: convertedCm, unit: 'cm' };
      onChange(convertedCm, 'cm', true);
    } else {
      const fallbackErr = validateHeightCm(heightCm);
      setCmStr(formatCmValue(heightCm));
      setError(fallbackErr || ftInErr);
      lastEmittedRef.current = { cm: heightCm, unit: 'cm' };
      onChange(heightCm, 'cm', false);
    }
  };

  const handleCmChange = (rawInput: string) => {
    let raw = rawInput.replace(/,/g, '.');
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
    if (/^0\d+/.test(raw)) raw = raw.replace(/^0+/, '') || '0';

    setCmStr(raw);
    if (raw.trim() === '' || raw.trim() === '.') {
      const err = 'Height must be greater than 0.';
      setError(err);
      lastEmittedRef.current = { cm: 0, unit: 'cm' };
      onChange(0, 'cm', false);
      return;
    }

    const val = Number(raw);
    const err = validateHeightCm(val);
    setError(err);

    if (!err) {
      const roundedCm = Math.round(val * 10) / 10;
      const converted = cmToFtIn(roundedCm);
      setFeetStr(String(converted.feet));
      setInchesStr(String(converted.inches));
      ftInDirtyRef.current = false;
      lastEmittedRef.current = { cm: roundedCm, unit: 'cm' };
      onChange(roundedCm, 'cm', true);
    } else {
      lastEmittedRef.current = { cm: val, unit: 'cm' };
      onChange(Number.isFinite(val) ? val : 0, 'cm', false);
    }
  };

  const handleFtInChange = (rawFeet: string, rawInches: string) => {
    let nextFeetStr = rawFeet;
    let nextInchesStr = rawInches;
    if (nextFeetStr !== '' && !/^\d*$/.test(nextFeetStr)) return;
    if (nextInchesStr !== '' && !/^\d*$/.test(nextInchesStr)) return;
    if (/^0\d+/.test(nextFeetStr)) nextFeetStr = nextFeetStr.replace(/^0+/, '') || '0';
    if (/^0\d+/.test(nextInchesStr)) nextInchesStr = nextInchesStr.replace(/^0+/, '') || '0';

    setFeetStr(nextFeetStr);
    setInchesStr(nextInchesStr);
    ftInDirtyRef.current = true;

    if (nextFeetStr.trim() === '' || nextInchesStr.trim() === '') {
      const err = 'Feet and inches must be valid numbers.';
      setError(err);
      lastEmittedRef.current = { cm: 0, unit: 'ft_in' };
      onChange(0, 'ft_in', false);
      return;
    }

    const f = Number(nextFeetStr);
    const i = Number(nextInchesStr);
    const err = validateFtIn(f, i);
    setError(err);

    if (!err) {
      const convertedCm = ftInToCm(f, i);
      setCmStr(formatCmValue(convertedCm));
      lastEmittedRef.current = { cm: convertedCm, unit: 'ft_in' };
      onChange(convertedCm, 'ft_in', true);
    } else {
      const rawCm = Number.isFinite(f) && Number.isFinite(i) ? ftInToCm(f, i) : 0;
      lastEmittedRef.current = { cm: rawCm, unit: 'ft_in' };
      onChange(rawCm, 'ft_in', false);
    }
  };

  const parsedFeet = feetStr.trim() === '' ? NaN : Number(feetStr);
  const parsedInches = inchesStr.trim() === '' ? NaN : Number(inchesStr);
  const parsedCm = cmStr.trim() === '' ? NaN : Number(cmStr);
  const previewFtIn = !validateHeightCm(parsedCm) ? cmToFtIn(parsedCm) : null;
  const previewCmFromFtIn =
    !validateFtIn(parsedFeet, parsedInches)
      ? !ftInDirtyRef.current && heightCm > 0
        ? Math.round(heightCm * 10) / 10
        : ftInToCm(parsedFeet, parsedInches)
      : null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="block text-[11px] font-semibold text-zinc-300">
          {label} ({unit === 'cm' ? 'cm' : 'ft + in'})
        </label>

        {/* Segmented Control: CM | FT + IN */}
        <div
          role="group"
          aria-label="Height unit"
          className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 shrink-0"
        >
          <button
            type="button"
            aria-pressed={unit === 'cm'}
            onClick={() => handleUnitSwitch('cm')}
            className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold transition-all ${
              unit === 'cm'
                ? 'bg-brand text-[#111318] shadow-glow'
                : 'text-[#52525B] dark:text-[#D1D5DB] hover:text-[#111318] dark:hover:text-white'
            }`}
          >
            CM
          </button>
          <button
            type="button"
            aria-pressed={unit === 'ft_in'}
            onClick={() => handleUnitSwitch('ft_in')}
            className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold transition-all whitespace-nowrap ${
              unit === 'ft_in'
                ? 'bg-brand text-[#111318] shadow-glow'
                : 'text-[#52525B] dark:text-[#D1D5DB] hover:text-[#111318] dark:hover:text-white'
            }`}
          >
            FT + IN
          </button>
        </div>
      </div>

      {unit === 'cm' ? (
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label="Height in centimeters"
            placeholder="178"
            value={cmStr}
            onChange={(e) => handleCmChange(e.target.value)}
            className={`w-full rounded-xl border bg-zinc-950 p-2.5 pr-9 text-xs text-white focus:outline-none ${
              error
                ? 'border-red-500/70 focus:border-red-500'
                : 'border-zinc-800 focus:border-brand'
            }`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-zinc-400">
            cm
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Height in feet"
              placeholder="5"
              value={feetStr}
              onChange={(e) => handleFtInChange(e.target.value, inchesStr)}
              className={`w-full rounded-xl border bg-zinc-950 p-2.5 pr-8 text-xs text-white focus:outline-none ${
                error
                  ? 'border-red-500/70 focus:border-red-500'
                  : 'border-zinc-800 focus:border-brand'
              }`}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-zinc-400">
              ft
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Height in inches"
              placeholder="10"
              value={inchesStr}
              onChange={(e) => handleFtInChange(feetStr, e.target.value)}
              className={`w-full rounded-xl border bg-zinc-950 p-2.5 pr-8 text-xs text-white focus:outline-none ${
                error
                  ? 'border-red-500/70 focus:border-red-500'
                  : 'border-zinc-800 focus:border-brand'
              }`}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-zinc-400">
              in
            </span>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-[11px] text-red-400 font-medium mt-1 leading-snug">
          {error}
        </p>
      ) : unit === 'cm' && previewFtIn ? (
        <p className="text-[11px] text-zinc-400 mt-1">
          ≈ {previewFtIn.feet} ft {previewFtIn.inches} in
        </p>
      ) : unit === 'ft_in' && previewCmFromFtIn !== null ? (
        <p className="text-[11px] text-zinc-400 mt-1">
          {parsedFeet} ft {parsedInches} in ≈ {previewCmFromFtIn} cm
        </p>
      ) : null}
    </div>
  );
}
