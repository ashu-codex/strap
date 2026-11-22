'use client';

import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
  Plus,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import NumericInput from '@/components/ui/NumericInput';
import type { WeightProgressSummary } from '@/lib/weight-progress';
import {
  WeightUnit,
  displayWeightValue,
  formatWeight,
  formatWeightDelta,
  kgToLb,
  lbToKg,
} from '@/lib/units';

interface GoalProgressCardProps {
  progress: WeightProgressSummary;
  weightUnit: WeightUnit;
  primaryGoalLabel: string;
  targetDate?: string | null;
  onLogWeight: (weightKg: number, date?: string) => Promise<void>;
  onRecalculateTargets?: () => void;
}

export default function GoalProgressCard({
  progress,
  weightUnit,
  primaryGoalLabel,
  targetDate,
  onLogWeight,
  onRecalculateTargets,
}: GoalProgressCardProps) {
  const [logWeightInput, setLogWeightInput] = useState<number | null>(null);
  const [logDate, setLogDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const handleLogSubmit = async () => {
    setLogError(null);
    if (logWeightInput === null || !Number.isFinite(logWeightInput) || logWeightInput <= 0) {
      setLogError(`Enter a valid body weight in ${weightUnit}.`);
      return;
    }
    const kg = weightUnit === 'lb' ? lbToKg(logWeightInput) : logWeightInput;
    if (kg < 20 || kg > 500) {
      setLogError('Weight must be between 20 kg (44 lb) and 500 kg (1,102 lb).');
      return;
    }
    setLogging(true);
    try {
      await onLogWeight(Math.round(kg * 10) / 10, logDate);
      setLogWeightInput(null);
    } catch (e: any) {
      setLogError(e?.message || 'Could not log weight check-in.');
    } finally {
      setLogging(false);
    }
  };

  const chartData = progress.chartSeries.map((pt) => ({
    date: pt.date,
    fullDate: pt.fullDate,
    weight: weightUnit === 'lb' ? kgToLb(pt.weightKg) : pt.weightKg,
    rollingAvg:
      pt.rollingAvgKg !== null
        ? weightUnit === 'lb'
          ? kgToLb(pt.rollingAvgKg)
          : pt.rollingAvgKg
        : null,
  }));

  const targetDisplay = displayWeightValue(progress.targetWeightKg, weightUnit);

  return (
    <div className="space-y-4 min-w-0">
      {/* Headline Weight Goal Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Current Weight
          </span>
          <div className="text-lg sm:text-xl font-black text-white font-mono mt-1">
            {formatWeight(progress.currentWeightKg, weightUnit)}
          </div>
          <span className="text-[10px] text-zinc-500">
            {progress.measurementsCount > 0
              ? `${progress.measurementsCount} check-${progress.measurementsCount === 1 ? 'in' : 'ins'} logged`
              : 'No weight history yet'}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Target Weight
          </span>
          <div className="text-lg sm:text-xl font-black text-white font-mono mt-1">
            {formatWeight(progress.targetWeightKg, weightUnit)}
          </div>
          <span className="text-[10px] text-zinc-500">
            {targetDate ? `Target date: ${targetDate}` : `Goal: ${primaryGoalLabel}`}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Remaining Difference
          </span>
          <div className="text-lg sm:text-xl font-black text-brand font-mono mt-1">
            {progress.remainingKg !== null
              ? formatWeightDelta(progress.remainingKg, weightUnit)
              : '—'}
          </div>
          <span className="text-[10px] text-zinc-500">
            {progress.remainingKg === null
              ? 'Set current & target weight'
              : progress.remainingKg > 0
              ? 'To gain toward target'
              : progress.remainingKg < 0
              ? 'To lose toward target'
              : 'At target weight'}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Weekly Avg Change
          </span>
          <div className="text-lg sm:text-xl font-black text-white font-mono mt-1 flex items-center gap-1.5">
            {progress.weeklyAvgChangeKg !== null ? (
              <>
                {progress.trendStatus === 'gaining' && (
                  <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                {progress.trendStatus === 'losing' && (
                  <TrendingDown className="h-4 w-4 text-sky-400 shrink-0" />
                )}
                {progress.trendStatus === 'stable' && (
                  <Minus className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
                <span>{formatWeightDelta(progress.weeklyAvgChangeKg, weightUnit)}/wk</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-zinc-400 font-sans">Pending</span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500">
            {progress.weeklyAvgChangeKg !== null
              ? `Across ${progress.weeklyAverages.length} weeks of check-ins`
              : 'Requires check-ins across 2+ weeks'}
          </span>
        </div>
      </div>

      {/* Real Goal Progress Bar (ONLY when >= 2 measurements & valid start != target) */}
      {progress.progressPct !== null && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">
              Progress Toward Target ({formatWeight(progress.startingWeightKg, weightUnit)} →{' '}
              {formatWeight(progress.targetWeightKg, weightUnit)})
            </span>
            <span className="font-mono font-bold text-brand">{progress.progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${progress.progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Optional Recalculation Prompt (ONLY after multi-week trend shift >= 1.5 kg) */}
      {progress.shouldOfferRecalculation && progress.recalculationReason && (
        <div className="rounded-xl border border-brand/35 bg-brand/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-zinc-200 leading-relaxed">{progress.recalculationReason}</p>
          {onRecalculateTargets && (
            <button
              type="button"
              onClick={onRecalculateTargets}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-colors shrink-0 strap-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Review Updated Calories</span>
            </button>
          )}
        </div>
      )}

      {/* Historical Body-Weight Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-brand" />
            <span>Historical Body-Weight Trend ({weightUnit})</span>
          </span>
          {progress.weeklyAverages.length >= 2 && (
            <span className="text-[11px] text-zinc-400">
              Weekly averages shown from real check-ins (no single-day assumptions)
            </span>
          )}
        </div>

        {chartData.length > 0 ? (
          <div className="h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} ${weightUnit}`,
                    name === 'weight' ? 'Logged Weight' : '7-Day Avg',
                  ]}
                />
                {targetDisplay !== null && (
                  <ReferenceLine
                    y={targetDisplay}
                    stroke="#B7F34A"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target ${targetDisplay} ${weightUnit}`,
                      fill: '#B7F34A',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#B7F34A"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#B7F34A' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="rollingAvg"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center space-y-1.5">
            <p className="text-xs font-semibold text-zinc-300">No body-weight check-ins logged yet.</p>
            <p className="text-[11px] text-zinc-400">
              Log your first weight entry below. Previous readings are always preserved as your history.
            </p>
          </div>
        )}
      </div>

      {/* Quick Append-Only Weight Check-In Logger */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
        <span className="text-xs font-bold text-white block">
          Log New Body-Weight Check-In (Preserves Previous History)
        </span>
        {logError && <p className="text-xs text-red-400">{logError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
              Weight ({weightUnit})
            </label>
            <NumericInput
              min={weightUnit === 'lb' ? 44 : 20}
              max={weightUnit === 'lb' ? 1102 : 500}
              allowDecimal
              placeholder={weightUnit === 'lb' ? 'e.g. 164.2' : 'e.g. 74.5'}
              value={logWeightInput}
              onValueChange={setLogWeightInput}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-brand" />
              <span>Check-In Date</span>
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="button"
              disabled={logging}
              onClick={handleLogSubmit}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-colors disabled:opacity-50 strap-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{logging ? 'Saving...' : 'Log Weight'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
