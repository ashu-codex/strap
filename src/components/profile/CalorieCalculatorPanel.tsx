'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  Sliders,
  Info,
  Save,
  Sparkles,
  Lock,
  Droplet,
} from 'lucide-react';
import NumericInput from '@/components/ui/NumericInput';
import type {
  PersonalizedNutritionPlan,
  CalorieOption,
  CustomNutritionTargets,
} from '@/lib/nutrition-calc';

interface CalorieCalculatorPanelProps {
  plan: PersonalizedNutritionPlan | null;
  saving?: boolean;
  compact?: boolean;
  onSelectOption: (optionId: string, clearCustom?: boolean) => Promise<void> | void;
  onSaveCustomTargets: (custom: CustomNutritionTargets | null) => Promise<void> | void;
  onJumpToBiometrics?: () => void;
}

export default function CalorieCalculatorPanel({
  plan,
  saving = false,
  compact = false,
  onSelectOption,
  onSaveCustomTargets,
  onJumpToBiometrics,
}: CalorieCalculatorPanelProps) {
  const [editingCustom, setEditingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState<{
    target_calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fats_g: number | null;
    fiber_g: number | null;
    water_ml: number | null;
  }>({
    target_calories: null,
    protein_g: null,
    carbs_g: null,
    fats_g: null,
    fiber_g: null,
    water_ml: null,
  });
  const [customError, setCustomError] = useState<string | null>(null);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);

  useEffect(() => {
    if (!plan) return;
    const base = plan.targetSource === 'custom' && plan.activeTargets
      ? plan.activeTargets
      : plan.recommendedTargets;
    if (base) {
      setCustomDraft({
        target_calories: base.target_calories,
        protein_g: base.protein_g,
        carbs_g: base.carbs_g,
        fats_g: base.fats_g,
        fiber_g: base.fiber_g,
        water_ml: base.water_ml,
      });
    }
  }, [plan]);

  if (!plan) {
    return null;
  }

  const isCustomActive = plan.targetSource === 'custom';
  const recommended = plan.recommendedTargets;
  const active = plan.activeTargets;

  const handleOptionClick = async (opt: CalorieOption) => {
    if (!opt.allowed || saving) return;
    setPendingOptionId(opt.id);
    try {
      // Never silently overwrite manual custom targets: save selected option preference,
      // and let user explicitly switch off custom targets if custom is active.
      await onSelectOption(opt.id, false);
    } finally {
      setPendingOptionId(null);
    }
  };

  const handleApplyCalculatedOverCustom = async () => {
    if (!plan.selectedOptionId || saving) return;
    await onSelectOption(plan.selectedOptionId, true);
    setEditingCustom(false);
  };

  const handleSaveCustom = async () => {
    setCustomError(null);
    const cals = Number(customDraft.target_calories);
    const p = Number(customDraft.protein_g);
    const c = Number(customDraft.carbs_g);
    const f = Number(customDraft.fats_g);

    if (!Number.isFinite(cals) || cals < 800 || cals > 10000) {
      setCustomError('Daily calories must be between 800 and 10,000 kcal.');
      return;
    }
    if (!Number.isFinite(p) || p < 20 || p > 600) {
      setCustomError('Protein must be between 20g and 600g.');
      return;
    }
    if (!Number.isFinite(c) || c < 0 || c > 1500) {
      setCustomError('Carbohydrates must be between 0g and 1,500g.');
      return;
    }
    if (!Number.isFinite(f) || f < 15 || f > 400) {
      setCustomError('Fat must be between 15g and 400g.');
      return;
    }

    await onSaveCustomTargets({
      enabled: true,
      target_calories: Math.round(cals),
      protein_g: Math.round(p),
      carbs_g: Math.round(c),
      fats_g: Math.round(f),
      fiber_g: customDraft.fiber_g ? Math.round(Number(customDraft.fiber_g)) : undefined,
      water_ml: customDraft.water_ml ? Math.round(Number(customDraft.water_ml)) : undefined,
    });
    setEditingCustom(false);
  };

  const handleResetToCalculated = async () => {
    setCustomError(null);
    await onSaveCustomTargets(null);
    setEditingCustom(false);
  };

  const draftMacroCals =
    (Number(customDraft.protein_g) || 0) * 4 +
    (Number(customDraft.carbs_g) || 0) * 4 +
    (Number(customDraft.fats_g) || 0) * 9;

  // Missing biometrics state — never invent fake BMR/TDEE
  if (!plan.isComplete) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white">{plan.sectionTitle}</h3>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{plan.sectionSubtitle}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {plan.missingFields.map((field) => (
                <span
                  key={field}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-900 border border-amber-500/30 text-amber-300"
                >
                  Missing: {field}
                </span>
              ))}
            </div>
          </div>
        </div>
        {onJumpToBiometrics && (
          <button
            type="button"
            onClick={onJumpToBiometrics}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-colors strap-primary"
          >
            Complete Personal &amp; Biometric Details
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      {/* Metabolic Baseline Bar (BMR / TDEE / Active Target) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Estimated BMR
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">
              {plan.bmr?.toLocaleString()}
            </span>
            <span className="text-[11px] text-zinc-400">kcal/day</span>
          </div>
          <span className="text-[10px] text-zinc-500">Mifflin-St Jeor resting estimate</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Maintenance (TDEE)
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">
              {plan.tdee?.toLocaleString()}
            </span>
            <span className="text-[11px] text-zinc-400">kcal/day</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            Activity factor ×{plan.activityMultiplier}
          </span>
        </div>

        <div className="rounded-xl border border-brand/40 bg-brand/10 p-3.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand block">
              Active Daily Target
            </span>
            <span
              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                isCustomActive
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-brand text-black'
              }`}
            >
              {isCustomActive ? 'Custom' : 'Calculated'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">
              {active?.target_calories.toLocaleString()}
            </span>
            <span className="text-[11px] text-zinc-300">kcal/day</span>
          </div>
          <span className="text-[10px] text-zinc-300 block truncate">
            {isCustomActive
              ? 'Manual user override active'
              : `${plan.goalLabel}${plan.selectedOption ? ` • ${plan.selectedOption.label}` : ''}`}
          </span>
        </div>
      </div>

      {/* Safety Alerts if any */}
      {plan.safetyAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-1.5">
          {plan.safetyAlerts.map((alert, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {plan.genderAssumptionNote && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-[11px] text-zinc-400 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
          <span>{plan.genderAssumptionNote}</span>
        </div>
      )}

      {/* Custom Target Active Banner (Never silently overwrite manual targets) */}
      {isCustomActive && recommended && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-amber-100 space-y-0.5 min-w-0">
            <p className="font-bold text-amber-300">
              Your Manual Custom Target ({active?.target_calories.toLocaleString()} kcal) Is Active
            </p>
            <p className="text-[11px] text-zinc-300">
              STRAP preserves your manual targets and will not silently overwrite them. Current calculated recommendation for{' '}
              <strong>{plan.selectedOption?.label || plan.goalLabel}</strong> is{' '}
              <strong className="font-mono text-white">
                {recommended.target_calories.toLocaleString()} kcal
              </strong>
              .
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleApplyCalculatedOverCustom}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-colors shrink-0 disabled:opacity-50 strap-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Switch to Calculated</span>
          </button>
        </div>
      )}

      {/* Goal-Specific Calorie Options (Calculator.net inspired in STRAP Dark/Lime design) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-brand shrink-0" />
              <span>{plan.sectionTitle}</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">{plan.sectionSubtitle}</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 self-start sm:self-auto shrink-0">
            Goal: {plan.goalLabel}
          </span>
        </div>

        {/* Option Rows / Cards */}
        <div className="space-y-2.5">
          {plan.options.map((opt) => {
            const isSelected = plan.selectedOptionId === opt.id;
            const isDisabled = !opt.allowed;
            const isUpdatingThis = pendingOptionId === opt.id;

            return (
              <div
                key={opt.id}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
                onClick={() => !isDisabled && handleOptionClick(opt)}
                onKeyDown={(e) => {
                  if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleOptionClick(opt);
                  }
                }}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isDisabled
                    ? 'border-zinc-800/80 bg-zinc-950/40 opacity-65 cursor-not-allowed'
                    : isSelected
                    ? 'border-brand bg-brand/10 shadow-glow cursor-pointer'
                    : 'border-zinc-800 bg-zinc-950/75 hover:border-zinc-600 cursor-pointer'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-stretch justify-between gap-3 p-3.5 sm:p-4">
                  {/* Left: Option Title, Pace, Badges, Guidance */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-white">{opt.label}</span>
                      {opt.recommended && opt.allowed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand text-black">
                          <Sparkles className="h-2.5 w-2.5" />
                          Recommended
                        </span>
                      )}
                      {isSelected && !isDisabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {isUpdatingThis ? 'Saving...' : 'Selected'}
                        </span>
                      )}
                      {opt.status === 'caution' && opt.allowed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          Caution
                        </span>
                      )}
                      {isDisabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-300">
                          <Lock className="h-3 w-3" />
                          Not Safe for Profile
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-300">
                      <span className="font-semibold text-zinc-200">{opt.subtitle}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {opt.dailyDelta === 0
                          ? '±0 kcal/day'
                          : opt.dailyDelta > 0
                          ? `+${opt.dailyDelta} kcal/day`
                          : `${opt.dailyDelta} kcal/day`}
                      </span>
                      {opt.estimatedWeeksToTarget !== null && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[11px] text-brand font-semibold">
                            Est. ~{opt.estimatedWeeksToTarget}{' '}
                            {opt.estimatedWeeksToTarget === 1 ? 'week' : 'weeks'} to target weight
                          </span>
                        </>
                      )}
                    </div>

                    {opt.warning && (
                      <p className="text-[11px] text-amber-300 leading-relaxed flex items-start gap-1.5 pt-0.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{opt.warning}</span>
                      </p>
                    )}

                    {opt.guidance && (
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{opt.guidance}</p>
                    )}
                  </div>

                  {/* Right: Calculator.net-inspired Calorie Callout Pill */}
                  <div
                    className={`sm:w-44 shrink-0 rounded-xl border px-3.5 py-2.5 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right ${
                      isDisabled
                        ? 'border-zinc-800 bg-zinc-900/50'
                        : isSelected
                        ? 'border-brand/50 bg-brand/15'
                        : 'border-zinc-800 bg-zinc-900/80'
                    }`}
                  >
                    <div>
                      <span className="text-xl sm:text-2xl font-black font-mono text-white block leading-none">
                        {opt.dailyCalories.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Calories / day
                      </span>
                    </div>
                    <div className="sm:mt-1.5 text-right">
                      <span
                        className={`inline-block text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          isDisabled
                            ? 'bg-red-500/15 text-red-300'
                            : isSelected
                            ? 'bg-brand text-black'
                            : 'bg-zinc-800 text-zinc-200'
                        }`}
                      >
                        {opt.percentOfMaintenance}% of TDEE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Goal Guidance / Muscle vs Body-Weight Distinction Notice */}
        {plan.goalGuidanceNote && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 text-[11px] text-zinc-300 flex items-start gap-2 leading-relaxed">
            <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <span>{plan.goalGuidanceNote}</span>
          </div>
        )}
      </div>

      {/* Macro Breakdown: Calculated Recommendation vs User Customization */}
      {active && recommended && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand" />
                <span>Daily Nutrition &amp; Macro Targets</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isCustomActive
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                      : 'bg-brand/15 border border-brand/30 text-brand'
                  }`}
                >
                  {isCustomActive ? 'User-Customized' : 'System-Calculated'}
                </span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Protein: 4 kcal/g • Carbs: 4 kcal/g • Fat: 9 kcal/g • Macro sum:{' '}
                <strong className="text-zinc-200 font-mono">
                  {active.macro_calories_sum.toLocaleString()} kcal
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!editingCustom ? (
                <button
                  type="button"
                  onClick={() => setEditingCustom(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-200 hover:border-brand transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5 text-brand" />
                  <span>{isCustomActive ? 'Edit Custom Targets' : 'Customize Manually'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCustom(false);
                    setCustomError(null);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
              )}

              {isCustomActive && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleResetToCalculated}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white hover:border-brand transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset to Calculated</span>
                </button>
              )}
            </div>
          </div>

          {!editingCustom ? (
            <>
              {/* Active Targets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="rounded-xl border border-brand/30 bg-brand/5 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 block">Calories</span>
                  <span className="text-lg font-black text-white font-mono">
                    {active.target_calories.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">kcal/day</span>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-rose-400 block">Protein</span>
                  <span className="text-lg font-black text-white font-mono">{active.protein_g}g</span>
                  <span className="text-[10px] text-zinc-400 block">
                    {active.protein_per_kg > 0 ? `${active.protein_per_kg} g/kg` : `${active.protein_g * 4} kcal`}
                  </span>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-sky-400 block">Carbs</span>
                  <span className="text-lg font-black text-white font-mono">{active.carbs_g}g</span>
                  <span className="text-[10px] text-zinc-400 block">{active.carbs_g * 4} kcal</span>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-amber-400 block">Fat</span>
                  <span className="text-lg font-black text-white font-mono">{active.fats_g}g</span>
                  <span className="text-[10px] text-zinc-400 block">{active.fats_g * 9} kcal</span>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 block">Fiber</span>
                  <span className="text-lg font-black text-white font-mono">{active.fiber_g}g</span>
                  <span className="text-[10px] text-zinc-400 block">daily goal</span>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 flex items-center justify-center gap-1">
                    <Droplet className="h-3 w-3" />
                    Hydration
                  </span>
                  <span className="text-lg font-black text-white font-mono">
                    {active.water_liters}L
                  </span>
                  <span className="text-[10px] text-zinc-400 block">optional est.</span>
                </div>
              </div>

              {/* Side-by-side Reference of System Recommendation whenever Custom Override is active */}
              {isCustomActive && (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong className="text-zinc-200">System-Calculated Reference:</strong>{' '}
                    {recommended.target_calories.toLocaleString()} kcal • Protein {recommended.protein_g}g • Carbs{' '}
                    {recommended.carbs_g}g • Fat {recommended.fats_g}g • Fiber {recommended.fiber_g}g
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {customError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {customError}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-300 mb-1">
                    Calories (kcal)
                  </label>
                  <NumericInput
                    min={800}
                    max={10000}
                    allowDecimal={false}
                    value={customDraft.target_calories}
                    onValueChange={(v) => setCustomDraft((prev) => ({ ...prev, target_calories: v }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs font-bold text-white focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-rose-400 mb-1">
                    Protein (g)
                  </label>
                  <NumericInput
                    min={20}
                    max={600}
                    allowDecimal={false}
                    value={customDraft.protein_g}
                    onValueChange={(v) => setCustomDraft((prev) => ({ ...prev, protein_g: v }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs font-bold text-white focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sky-400 mb-1">
                    Carbs (g)
                  </label>
                  <NumericInput
                    min={0}
                    max={1500}
                    allowDecimal={false}
                    value={customDraft.carbs_g}
                    onValueChange={(v) => setCustomDraft((prev) => ({ ...prev, carbs_g: v }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs font-bold text-white focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-400 mb-1">
                    Fat (g)
                  </label>
                  <NumericInput
                    min={15}
                    max={400}
                    allowDecimal={false}
                    value={customDraft.fats_g}
                    onValueChange={(v) => setCustomDraft((prev) => ({ ...prev, fats_g: v }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs font-bold text-white focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1">
                    Fiber (g)
                  </label>
                  <NumericInput
                    min={5}
                    max={150}
                    allowDecimal={false}
                    value={customDraft.fiber_g}
                    onValueChange={(v) => setCustomDraft((prev) => ({ ...prev, fiber_g: v }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs font-bold text-white focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-cyan-400 mb-1">
                    Water (ml)
                  </label>
                  <NumericInput
                    min={1000}
                    max={10000}
                    allowDecimal={false}
                    value={customDraft.water_ml}
                    onValueChange={(v) => setCustomDraft((prev) => ({ ...prev, water_ml: v }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs font-bold text-white focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-zinc-400">
                  Macro calories check: <strong className="text-white font-mono">{draftMacroCals.toLocaleString()} kcal</strong>
                  {customDraft.target_calories
                    ? ` (vs ${Number(customDraft.target_calories).toLocaleString()} kcal target)`
                    : ''}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCustomDraft({
                        target_calories: recommended.target_calories,
                        protein_g: recommended.protein_g,
                        carbs_g: recommended.carbs_g,
                        fats_g: recommended.fats_g,
                        fiber_g: recommended.fiber_g,
                        water_ml: recommended.water_ml,
                      })
                    }
                    className="px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    Fill Recommended
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveCustom}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-colors disabled:opacity-50 strap-primary"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Custom Targets'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Planning Estimate Disclaimer */}
      {!compact && (
        <p className="text-[11px] text-zinc-500 leading-relaxed">{plan.disclaimer}</p>
      )}
    </div>
  );
}
