import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | Date): string {
  const d = typeof dateString === "string" ? new Date(dateString) : dateString;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Calculates Mifflin-St Jeor Basal Metabolic Rate (BMR)
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string
): number {
  if (gender === "female") {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
  // Default to male / standard formula
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE)
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };
  const multiplier = multipliers[activityLevel] || 1.4;
  return Math.round(bmr * multiplier);
}

/**
 * Brzycki 1RM Formula: 1RM = weight / (1.0278 - (0.0278 * reps))
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  if (reps > 30) reps = 30;
  return Math.round(weightKg / (1.0278 - 0.0278 * reps));
}
