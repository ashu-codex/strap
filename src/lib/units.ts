export type WeightUnit = 'kg' | 'lb';

const LB_PER_KG = 2.2046226218;

/** Convert kilograms to pounds rounded cleanly to 1 decimal place. */
export function kgToLb(kg: number): number {
  if (!Number.isFinite(kg)) return 0;
  return Math.round(kg * LB_PER_KG * 10) / 10;
}

/** Convert pounds to kilograms rounded cleanly to 2 decimal places to prevent drift. */
export function lbToKg(lb: number): number {
  if (!Number.isFinite(lb)) return 0;
  return Math.round((lb / LB_PER_KG) * 100) / 100;
}

/** Display weight in the user's preferred unit without mutating canonical kg storage. */
export function displayWeightValue(kg: number | null | undefined, unit: WeightUnit): number | null {
  if (kg === null || kg === undefined || !Number.isFinite(Number(kg)) || Number(kg) <= 0) {
    return null;
  }
  const n = Number(kg);
  return unit === 'lb' ? kgToLb(n) : Math.round(n * 10) / 10;
}

/** Format a weight value with unit label. */
export function formatWeight(kg: number | null | undefined, unit: WeightUnit = 'kg'): string {
  const val = displayWeightValue(kg, unit);
  if (val === null) return '—';
  return `${val} ${unit}`;
}

/** Format a signed weight delta (e.g. +5.5 kg or -4.2 lb). */
export function formatWeightDelta(deltaKg: number | null | undefined, unit: WeightUnit = 'kg'): string {
  if (deltaKg === null || deltaKg === undefined || !Number.isFinite(Number(deltaKg))) {
    return '—';
  }
  const n = Number(deltaKg);
  const converted = unit === 'lb' ? Math.round(n * LB_PER_KG * 10) / 10 : Math.round(n * 10) / 10;
  const sign = converted > 0 ? '+' : '';
  return `${sign}${converted} ${unit}`;
}

/** Compute exact integer age from a YYYY-MM-DD date of birth string. Returns null if invalid. */
export function calculateAgeFromDob(dob: string | null | undefined, now: Date = new Date()): number | null {
  if (!dob || typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
    return null;
  }
  const [y, m, d] = dob.trim().split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime()) || birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) {
    return null;
  }
  let age = now.getFullYear() - y;
  const monthDiff = now.getMonth() - (m - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) {
    age -= 1;
  }
  if (age < 10 || age > 100) return null;
  return age;
}
