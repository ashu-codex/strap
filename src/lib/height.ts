export type HeightUnit = 'cm' | 'ft_in';

export const MIN_HEIGHT_CM = 90;
export const MAX_HEIGHT_CM = 250;

/** Convert centimeters to nearest whole feet + inches (0-11). */
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  if (!Number.isFinite(cm) || cm <= 0) {
    return { feet: 0, inches: 0 };
  }
  const totalInches = Math.round(cm / 2.54);
  return {
    feet: Math.floor(totalInches / 12),
    inches: totalInches % 12,
  };
}

/** Convert feet + inches into standardized centimeters rounded to 1 decimal place. */
export function ftInToCm(feet: number, inches: number): number {
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return 0;
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54 * 10) / 10;
}

/** Validate height in centimeters. Returns null when valid, or a clear error string. */
export function validateHeightCm(cm: number): string | null {
  if (!Number.isFinite(cm) || cm <= 0) {
    return 'Height must be greater than 0.';
  }
  if (cm < MIN_HEIGHT_CM || cm > MAX_HEIGHT_CM) {
    return 'Height must be between 90 cm (3 ft 0 in) and 250 cm (8 ft 2 in).';
  }
  return null;
}

/** Validate feet + inches input. Returns null when valid, or a clear error string. */
export function validateFtIn(feet: number, inches: number): string | null {
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) {
    return 'Feet and inches must be valid numbers.';
  }
  if (feet < 0 || inches < 0 || (feet === 0 && inches === 0)) {
    return 'Height cannot be zero or negative.';
  }
  if (!Number.isInteger(inches) || inches < 0 || inches > 11) {
    return 'Inches must be a whole number between 0 and 11.';
  }
  if (!Number.isInteger(feet) || feet < 3 || feet > 8) {
    return 'Height must be between 3 ft 0 in (90 cm) and 8 ft 2 in (250 cm).';
  }
  const cm = ftInToCm(feet, inches);
  if (cm < MIN_HEIGHT_CM || cm > MAX_HEIGHT_CM) {
    return 'Height must be between 3 ft 0 in (90 cm) and 8 ft 2 in (250 cm).';
  }
  return null;
}
